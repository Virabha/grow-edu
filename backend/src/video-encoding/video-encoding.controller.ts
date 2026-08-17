import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Body,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
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
import { AppConfigService } from "../config";

@ApiTags("video-encoding")
@Controller('video-encoding')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VideoEncodingController {
  constructor(
    private readonly videoEncodingService: VideoEncodingService,
    private readonly configService: AppConfigService,
  ) {}

  private async loadLessonForUser(
    lessonId: string,
    user: { userId: string; role: string },
  ) {
    const lesson =
      await this.videoEncodingService.getLessonWithCourse(lessonId);

    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonId} not found`);
    }

    if (
      user.role !== UserRole.PLATFORM_ADMIN &&
      lesson.section.course.instructorId !== user.userId
    ) {
      throw new ForbiddenException(
        "You can only access encoding data for your own courses",
      );
    }

    return lesson;
  }

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

    const lesson = await this.loadLessonForUser(lessonId, user);

    if (lesson.section.course.courseId !== courseId) {
      throw new BadRequestException(
        "Course ID does not match the lesson's course",
      );
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
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  async getJobStatus(
    @Param("jobId") jobId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    const job =
      await this.videoEncodingService.getEncodingJobByJobId(jobId);

    if (!job) {
      throw new NotFoundException(`Encoding job ${jobId} not found`);
    }

    await this.loadLessonForUser(job.lessonId, user);

    const status = await this.videoEncodingService.getJobStatus(jobId);

    if (
      (status.status === "COMPLETED" || status.status === "FAILED") &&
      job.status !== status.status
    ) {
      await this.videoEncodingService.handleJobCompletion(
        jobId,
        status.status,
        status.errorMessage,
      );
    }

    return {
      jobId,
      status: status.status,
      progress: status.progress,
      errorMessage: status.errorMessage,
      lessonId: job.lessonId,
      courseId: job.courseId,
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
    return this.videoEncodingService.getAllVideoLessonsDebugInfo();
  }

  @ApiOperation({ summary: "Debug: Check encoding job status for a lesson" })
  @ApiResponse({ status: 200, description: "Encoding job debug info" })
  @Get("debug/:lessonId")
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.PLATFORM_ADMIN)
  async debugLesson(
    @Param("lessonId") lessonId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    const lesson = await this.loadLessonForUser(lessonId, user);
    const encodingInfo =
      await this.videoEncodingService.getLessonEncodingInfo(lessonId);

    return {
      lessonId,
      courseId: lesson.section.course.courseId,
      lessonStatus: lesson.status,
      lessonType: lesson.type,
      ...encodingInfo,
    };
  }
}
