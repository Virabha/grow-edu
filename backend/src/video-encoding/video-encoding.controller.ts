import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Body,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { VideoEncodingService } from "./video-encoding.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Inject } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { AppConfigService } from "../config";

@ApiTags("video-encoding")
@Controller("video-encoding")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VideoEncodingController {
  constructor(
    private readonly videoEncodingService: VideoEncodingService,
    private readonly configService: AppConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  @ApiOperation({ summary: "Create Bunny Stream video and get TUS upload auth" })
  @ApiResponse({ status: 201, description: "Video created, TUS auth returned" })
  @Post("create-upload")
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  async createUpload(
    @Body() body: { courseId: string; lessonId: string; title?: string },
    @CurrentUser() user: { userId: string; role: string },
  ) {
    const { courseId, lessonId, title } = body;

    const lesson = await this.db.query.lessons.findFirst({
      where: eq(schema.lessons.lessonId, lessonId),
      with: {
        section: {
          with: { course: true },
        },
      },
    });

    if (!lesson) {
      throw new Error("Lesson not found");
    }

    if (
      user.role !== "PLATFORM_ADMIN" &&
      lesson.section.course.instructorId !== user.userId
    ) {
      throw new Error("Only course owner or admin can upload videos");
    }

    if (lesson.section.course.courseId !== courseId) {
      throw new Error("Course ID mismatch");
    }

    const result = await this.videoEncodingService.createVideo(
      lessonId,
      courseId,
      title || lesson.title,
    );

    return result;
  }

  @ApiOperation({ summary: "Get encoding job status" })
  @ApiResponse({ status: 200, description: "Job status" })
  @Get("status/:jobId")
  async getJobStatus(@Param("jobId") jobId: string) {
    const status = await this.videoEncodingService.getJobStatus(jobId);

    const [job] = await this.db
      .select()
      .from(schema.videoEncodingJobs)
      .where(eq(schema.videoEncodingJobs.jobId, jobId))
      .limit(1);

    return {
      jobId,
      status: status.status,
      progress: status.progress,
      errorMessage: status.errorMessage,
      lessonId: job?.lessonId,
      courseId: job?.courseId,
    };
  }

  @ApiOperation({ summary: "Get webhook URL for Bunny Stream configuration" })
  @ApiResponse({ status: 200, description: "Webhook URL" })
  @Get("webhook-url")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  getWebhookUrl() {
    const backendUrl = this.configService.backendUrl;
    const webhookUrl = `${backendUrl}/video-encoding/webhook`;

    return {
      webhookUrl,
      method: "POST",
      headers: this.configService.webhookSecret
        ? {
            "Content-Type": "application/json",
            "x-webhook-secret": this.configService.webhookSecret,
          }
        : {
            "Content-Type": "application/json",
          },
      note: "Configure this URL in Bunny Stream library webhook settings.",
    };
  }

  @ApiOperation({
    summary: "Debug: List all video lessons with encoding status",
  })
  @ApiResponse({ status: 200, description: "All video lessons debug info" })
  @Get("debug/all")
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  async debugAllLessons() {
    const allLessons = await this.db.query.lessons.findMany({
      where: eq(schema.lessons.type, "VIDEO"),
      with: {
        section: {
          with: { course: true },
        },
      },
    });

    const allJobs = await this.db.select().from(schema.videoEncodingJobs);
    const jobsByLessonId = new Map(allJobs.map((j) => [j.lessonId, j]));

    const results = allLessons.map((lesson) => {
      const encodingJob = jobsByLessonId.get(lesson.lessonId);

      let status: string;
      if (!encodingJob) {
        status = "NO_ENCODING_JOB";
      } else if (encodingJob.status === "PROCESSING") {
        status = "ENCODING_IN_PROGRESS";
      } else if (encodingJob.status === "FAILED") {
        status = "ENCODING_FAILED";
      } else if (encodingJob.status === "COMPLETED") {
        status = "READY";
      } else {
        status = "UNKNOWN";
      }

      return {
        lessonId: lesson.lessonId,
        lessonTitle: lesson.title,
        courseTitle: lesson.section.course.title,
        lessonStatus: lesson.status,
        encodingStatus: status,
        videoId: encodingJob?.outputPath || null,
        needsReEncoding:
          status === "NO_ENCODING_JOB" || status === "ENCODING_FAILED",
      };
    });

    const needsReEncoding = results.filter((r) => r.needsReEncoding);
    const ready = results.filter((r) => r.encodingStatus === "READY");
    const inProgress = results.filter(
      (r) => r.encodingStatus === "ENCODING_IN_PROGRESS",
    );

    return {
      summary: {
        total: results.length,
        ready: ready.length,
        needsReEncoding: needsReEncoding.length,
        inProgress: inProgress.length,
      },
      lessonsNeedingReEncoding: needsReEncoding,
      allLessons: results,
    };
  }

  @ApiOperation({ summary: "Debug: Check encoding job status for a lesson" })
  @ApiResponse({ status: 200, description: "Encoding job debug info" })
  @Get("debug/:lessonId")
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  async debugLesson(@Param("lessonId") lessonId: string) {
    const lesson = await this.db.query.lessons.findFirst({
      where: eq(schema.lessons.lessonId, lessonId),
      with: {
        section: {
          with: { course: true },
        },
      },
    });

    if (!lesson) {
      return { error: "Lesson not found" };
    }

    const [encodingJob] = await this.db
      .select()
      .from(schema.videoEncodingJobs)
      .where(eq(schema.videoEncodingJobs.lessonId, lessonId))
      .limit(1);

    let bunnyStatus = null;
    if (encodingJob) {
      try {
        bunnyStatus = await this.videoEncodingService.getJobStatus(
          encodingJob.jobId,
        );
      } catch {
        // Ignore - video may not exist in Bunny
      }
    }

    return {
      lessonId,
      courseId: lesson.section.course.courseId,
      lessonStatus: lesson.status,
      lessonType: lesson.type,
      encodingJob: encodingJob
        ? {
            jobId: encodingJob.jobId,
            status: encodingJob.status,
            inputPath: encodingJob.inputPath,
            outputPath: encodingJob.outputPath,
            errorMessage: encodingJob.errorMessage,
            createdAt: encodingJob.createdAt,
            completedAt: encodingJob.completedAt,
          }
        : null,
      bunnyStreamStatus: bunnyStatus,
      diagnosis: !encodingJob
        ? "No encoding job found - video may not have been uploaded"
        : encodingJob.status === "PROCESSING"
          ? "Encoding is still in progress - wait for it to complete"
          : encodingJob.status === "FAILED"
            ? `Encoding failed: ${encodingJob.errorMessage}`
            : encodingJob.status === "COMPLETED"
              ? "Encoding completed - video should be playable via Bunny Stream"
              : "Unknown state",
    };
  }
}
