import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { AppConfigService } from "../config";
import { EmailService } from "../email/email.service";
import * as crypto from "crypto";

@Injectable()
export class VideoEncodingService {
  private readonly logger = new Logger(VideoEncodingService.name);
  private readonly bunnyStreamBaseUrl = "https://video.bunnycdn.com";

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private configService: AppConfigService,
    private emailService: EmailService,
  ) {}

  private get libraryId(): string {
    const id = this.configService.bunnyStreamLibraryId;
    if (!id) throw new Error("BUNNY_STREAM_LIBRARY_ID is not configured");
    return id;
  }

  private get apiKey(): string {
    const key = this.configService.bunnyStreamApiKey;
    if (!key) throw new Error("BUNNY_STREAM_API_KEY is not configured");
    return key;
  }

  async createVideo(
    lessonId: string,
    batchId: string,
    title: string,
  ): Promise<{
    videoId: string;
    tusUploadUrl: string;
    tusAuth: {
      AuthorizationSignature: string;
      AuthorizationExpire: number;
      VideoId: string;
      LibraryId: string;
    };
  }> {
    const lesson = await this.db.query.lessons.findFirst({
      where: eq(schema.lessons.lessonId, lessonId),
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    // 1. Create video in Bunny Stream library
    const createResponse = await fetch(
      `${this.bunnyStreamBaseUrl}/library/${this.libraryId}/videos`,
      {
        method: "POST",
        headers: {
          AccessKey: this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      },
    );

    if (!createResponse.ok) {
      const body = await createResponse.text();
      throw new Error(
        `Failed to create Bunny Stream video (${createResponse.status}): ${body}`,
      );
    }

    const videoData = (await createResponse.json()) as { guid: string };
    const videoId = videoData.guid;

    // 2. Generate TUS auth signature
    const expirationTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const signaturePayload =
      this.libraryId + this.apiKey + expirationTime + videoId;
    const signature = crypto
      .createHash("sha256")
      .update(signaturePayload)
      .digest("hex");

    // 3. Save to database
    await this.db.insert(schema.videoEncodingJobs).values({
      jobId: videoId,
      lessonId,
      batchId,
      status: "PROCESSING",
      inputPath: `tus://${videoId}`,
      outputPath: videoId,
    });

    await this.db
      .update(schema.lessons)
      .set({ status: "PROCESSING", updatedAt: new Date() })
      .where(eq(schema.lessons.lessonId, lessonId));

    this.logger.log(
      `Created Bunny Stream video ${videoId} for lesson ${lessonId}`,
    );

    return {
      videoId,
      tusUploadUrl: `https://video.bunnycdn.com/tusupload`,
      tusAuth: {
        AuthorizationSignature: signature,
        AuthorizationExpire: expirationTime,
        VideoId: videoId,
        LibraryId: this.libraryId,
      },
    };
  }

  async getJobStatus(videoId: string): Promise<{
    status: string;
    progress?: number;
    errorMessage?: string;
  }> {
    const response = await fetch(
      `${this.bunnyStreamBaseUrl}/library/${this.libraryId}/videos/${videoId}`,
      {
        headers: {
          AccessKey: this.apiKey,
        },
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundException(`Video ${videoId} not found`);
      }
      throw new Error(`Failed to get video status: ${response.status}`);
    }

    const data = (await response.json()) as {
      status: number;
      encodeProgress: number;
    };

    // Bunny Stream status codes:
    // 0 = Created, 1 = Uploaded, 2 = Processing, 3 = Transcoding
    // 4 = Finished, 5 = Error, 6 = Upload Failed
    let status: string;
    switch (data.status) {
      case 4:
        status = "COMPLETED";
        break;
      case 5:
      case 6:
        status = "FAILED";
        break;
      default:
        status = "PROCESSING";
    }

    return {
      status,
      progress: data.encodeProgress,
      errorMessage:
        data.status === 5
          ? "Video encoding failed"
          : data.status === 6
            ? "Video upload failed"
            : undefined,
    };
  }

  // ── Data-access helpers (used by the controller via delegation) ──────────

  async getLessonWithBatch(lessonId: string) {
    const lesson = await this.db.query.lessons.findFirst({
      where: eq(schema.lessons.lessonId, lessonId),
      with: {
        subject: {
          with: { batch: true },
        },
      },
    });
    return lesson ?? null;
  }

  async isBatchInstructor(batchId: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ batchId: schema.batchInstructors.batchId })
      .from(schema.batchInstructors)
      .where(
        and(
          eq(schema.batchInstructors.batchId, batchId),
          eq(schema.batchInstructors.instructorId, userId),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  private async notifyOwner(
    batchId: string,
    lesson: { lessonId: string; title: string },
    outcome: "COMPLETED" | "FAILED",
  ): Promise<void> {
    const [batch] = await this.db
      .select()
      .from(schema.batches)
      .where(eq(schema.batches.batchId, batchId))
      .limit(1);
    if (!batch) return;

    const [lead] = await this.db
      .select({ instructorId: schema.batchInstructors.instructorId })
      .from(schema.batchInstructors)
      .where(eq(schema.batchInstructors.batchId, batchId))
      .orderBy(schema.batchInstructors.role)
      .limit(1);

    const [recipient] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.userId, lead?.instructorId ?? batch.createdBy))
      .limit(1);
    if (!recipient) return;

    try {
      if (outcome === "COMPLETED") {
        await this.emailService.sendVideoEncodingCompleteEmail({
          firstName: recipient.firstName,
          email: recipient.email,
          lessonTitle: lesson.title,
          courseTitle: batch.title,
          courseSlug: batch.slug,
          lessonId: lesson.lessonId,
        });
      } else {
        await this.emailService.sendVideoEncodingFailedEmail({
          firstName: recipient.firstName,
          email: recipient.email,
          lessonTitle: lesson.title,
          courseTitle: batch.title,
          courseSlug: batch.slug,
          lessonId: lesson.lessonId,
          errorMessage: "Encoding failed",
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send encoding ${outcome} email: ${error}`);
    }
  }

  async getEncodingJobByJobId(jobId: string) {
    const [job] = await this.db
      .select()
      .from(schema.videoEncodingJobs)
      .where(eq(schema.videoEncodingJobs.jobId, jobId))
      .limit(1);
    return job ?? null;
  }

  async getAllVideoLessonsDebugInfo() {
    const allLessons = await this.db.query.lessons.findMany({
      where: eq(schema.lessons.type, "VIDEO"),
      with: {
        subject: {
          with: { batch: true },
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
        batchTitle: lesson.subject.batch.title,
        lessonStatus: lesson.status,
        encodingStatus: status,
        videoId: encodingJob?.outputPath ?? null,
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

  async getLessonEncodingInfo(lessonId: string) {
    const [encodingJob] = await this.db
      .select()
      .from(schema.videoEncodingJobs)
      .where(eq(schema.videoEncodingJobs.lessonId, lessonId))
      .limit(1);

    let bunnyStatus: Awaited<ReturnType<typeof this.getJobStatus>> | null =
      null;
    if (encodingJob) {
      try {
        bunnyStatus = await this.getJobStatus(encodingJob.jobId);
      } catch {
        // Ignore — video may not exist in Bunny yet
      }
    }

    const diagnosis = !encodingJob
      ? "No encoding job found - video may not have been uploaded"
      : encodingJob.status === "PROCESSING"
        ? "Encoding is still in progress - wait for it to complete"
        : encodingJob.status === "FAILED"
          ? `Encoding failed: ${encodingJob.errorMessage}`
          : encodingJob.status === "COMPLETED"
            ? "Encoding completed - video should be playable via Bunny Stream"
            : "Unknown state";

    return {
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
      diagnosis,
    };
  }

  // ── Job lifecycle ─────────────────────────────────────────────────────────

  async handleJobCompletion(
    jobId: string,
    status: "COMPLETED" | "FAILED",
    errorMessage?: string,
  ): Promise<void> {
    const [job] = await this.db
      .select()
      .from(schema.videoEncodingJobs)
      .where(eq(schema.videoEncodingJobs.jobId, jobId))
      .limit(1);

    if (!job) {
      this.logger.warn(`Job ${jobId} not found in database`);
      return;
    }

    const updateData: Partial<typeof schema.videoEncodingJobs.$inferInsert> = {
      status,
      updatedAt: new Date(),
      completedAt: new Date(),
    };

    if (status === "COMPLETED") {
      // outputPath already stores the Bunny Stream video GUID (set at creation)
      // Fetch duration from Bunny API
      try {
        const response = await fetch(
          `${this.bunnyStreamBaseUrl}/library/${this.libraryId}/videos/${jobId}`,
          { headers: { AccessKey: this.apiKey } },
        );
        if (response.ok) {
          const data = (await response.json()) as { length: number };
          if (data.length) {
            updateData.duration = Math.floor(data.length);
          }
        }
      } catch {
        // Duration fetch is best-effort
      }

      const [lesson] = await this.db
        .select()
        .from(schema.lessons)
        .where(eq(schema.lessons.lessonId, job.lessonId))
        .limit(1);

      if (lesson) {
        await this.db
          .update(schema.lessons)
          .set({
            status: "READY",
            duration: updateData.duration || null,
            updatedAt: new Date(),
          })
          .where(eq(schema.lessons.lessonId, job.lessonId));

        await this.notifyOwner(job.batchId, lesson, "COMPLETED");
      }
    } else if (status === "FAILED") {
      updateData.errorMessage = errorMessage || "Encoding failed";

      const [lesson] = await this.db
        .select()
        .from(schema.lessons)
        .where(eq(schema.lessons.lessonId, job.lessonId))
        .limit(1);

      if (lesson) {
        await this.db
          .update(schema.lessons)
          .set({ status: "DRAFT", updatedAt: new Date() })
          .where(eq(schema.lessons.lessonId, job.lessonId));

        await this.notifyOwner(job.batchId, lesson, "FAILED");
      }
    }

    await this.db
      .update(schema.videoEncodingJobs)
      .set(updateData)
      .where(eq(schema.videoEncodingJobs.jobId, jobId));

    this.logger.log(`Job ${jobId} completed with status: ${status}`);
  }
}
