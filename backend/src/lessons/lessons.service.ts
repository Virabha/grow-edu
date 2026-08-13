import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  lessons,
  quizQuestions,
  courseSections,
  enrollments,
  sectionAccess,
  videoEncodingJobs,
} from "../database/schema";
import { CreateLessonDto, UpdateLessonDto } from "./dto/lesson.dto";
import { ReorderLessonsDto } from "./dto/reorder-lessons.dto";
import { UpdateQuizQuestionsDto } from "./dto/update-quiz.dto";
import { CdnService } from "../cdn/cdn.service";
import { EnrollmentsService } from "../enrollments/enrollments.service";

@Injectable()
export class LessonsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private cdnService: CdnService,
    private enrollmentsService: EnrollmentsService
  ) {}

  async create(dto: CreateLessonDto, userId: string, userRole: string) {
    const section = await this.db.query.courseSections.findFirst({
      where: eq(courseSections.sectionId, dto.sectionId),
      with: { course: true },
    });

    if (!section) {
      throw new NotFoundException("Section not found");
    }

    if (
      userRole !== "PLATFORM_ADMIN" &&
      section.course.instructorId !== userId
    ) {
      throw new ForbiddenException(
        "Only course owner or admin can add lessons"
      );
    }

    let status: "DRAFT" | "PENDING_APPROVAL" | "PROCESSING" | "READY" = "DRAFT";
    if (dto.type === "VIDEO") {
      if (userRole === "PLATFORM_ADMIN") {
        status = "READY";
      } else {
        status = "PENDING_APPROVAL";
      }
    }

    const [newLesson] = await this.db
      .insert(lessons)
      .values({
        sectionId: dto.sectionId,
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type,
        order: dto.order,
        status,
        duration: dto.duration ?? null,
        isFreePreview: dto.isFreePreview ?? false,
        resources: dto.resources
          ? dto.resources.map((resource) => ({
              label: resource.label,
              url: resource.url,
            }))
          : null,
        quizSettings: dto.quizSettings ?? null,
      })
      .returning();

    return newLesson;
  }

  async approve(lessonId: string, userRole: string) {
    if (userRole !== "PLATFORM_ADMIN") {
      throw new ForbiddenException("Only admins can approve lessons");
    }
    const [updatedLesson] = await this.db
      .update(lessons)
      .set({ status: "READY", updatedAt: new Date() })
      .where(eq(lessons.lessonId, lessonId))
      .returning();

    if (!updatedLesson) {
      throw new NotFoundException("Lesson not found");
    }
    return updatedLesson;
  }

  async update(
    lessonId: string,
    dto: UpdateLessonDto,
    userId: string,
    userRole: string
  ) {
    const lesson = await this.db.query.lessons.findFirst({
      where: eq(lessons.lessonId, lessonId),
      with: {
        section: {
          with: { course: true },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    if (
      userRole !== "PLATFORM_ADMIN" &&
      lesson.section.course.instructorId !== userId
    ) {
      throw new ForbiddenException(
        "Only course owner or admin can update lessons"
      );
    }

    const { bumpQuizVersion, ...data } = dto;

    const updatePayload: Partial<typeof lessons.$inferInsert> = {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined
        ? { description: data.description }
        : {}),
      ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl } : {}),
      ...(data.textContent !== undefined
        ? { textContent: data.textContent }
        : {}),
      ...(data.resources
        ? {
            resources: data.resources.map((resource) => ({
              label: resource.label,
              url: resource.url,
            })),
          }
        : {}),
      ...(data.quizSettings !== undefined
        ? { quizSettings: data.quizSettings }
        : {}),
      ...(data.duration !== undefined ? { duration: data.duration } : {}),
      ...(data.isFreePreview !== undefined
        ? { isFreePreview: data.isFreePreview }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.order !== undefined ? { order: data.order } : {}),
      updatedAt: new Date(),
    };

    if (data.quizSettings) {
      updatePayload.quizVersion =
        (lesson.quizVersion || 1) + (bumpQuizVersion ? 1 : 0);
    }

    const [updatedLesson] = await this.db
      .update(lessons)
      .set(updatePayload)
      .where(eq(lessons.lessonId, lessonId))
      .returning();

    return updatedLesson;
  }

  async delete(lessonId: string, userId: string, userRole: string) {
    const lesson = await this.db.query.lessons.findFirst({
      where: eq(lessons.lessonId, lessonId),
      with: { section: { with: { course: true } } },
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    if (
      userRole !== "PLATFORM_ADMIN" &&
      lesson.section.course.instructorId !== userId
    ) {
      throw new ForbiddenException(
        "Only course owner or admin can delete lessons"
      );
    }

    await this.db.delete(lessons).where(eq(lessons.lessonId, lessonId));
    return { success: true };
  }

  async getById(lessonId: string, userId: string, userRole: string) {
    const lesson = await this.db.query.lessons.findFirst({
      where: eq(lessons.lessonId, lessonId),
      with: {
        section: { with: { course: true } },
        questions: true,
      },
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    const isAdmin = userRole === "PLATFORM_ADMIN";
    const isInstructor = userRole === "INSTRUCTOR";

    // Instructors and admins bypass the enrollment gate.
    if (!isAdmin && !isInstructor) {
      // Free-preview lessons are accessible to all authenticated users.
      if (!lesson.isFreePreview) {
        const [enrollment] = await this.db
          .select()
          .from(enrollments)
          .where(
            and(
              eq(enrollments.courseId, lesson.section.courseId),
              eq(enrollments.userId, userId),
            ),
          )
          .limit(1);

        if (!enrollment) {
          const [sectionGrant] = await this.db
            .select()
            .from(sectionAccess)
            .where(
              and(
                eq(sectionAccess.courseId, lesson.section.courseId),
                eq(sectionAccess.userId, userId),
                eq(sectionAccess.sectionId, lesson.sectionId),
              ),
            )
            .limit(1);

          if (!sectionGrant) {
            throw new ForbiddenException(
              "You must be enrolled in this course to access lessons",
            );
          }
        }
      }
    }

    return lesson;
  }

  async reorder(dto: ReorderLessonsDto, userId: string, userRole: string) {
    if (userRole !== "PLATFORM_ADMIN") {
      const section = await this.db.query.courseSections.findFirst({
        where: eq(courseSections.sectionId, dto.sectionId),
        with: { course: true },
      });

      if (!section) {
        throw new NotFoundException("Section not found");
      }

      if (section.course.instructorId !== userId) {
        throw new ForbiddenException(
          "Only the course owner or a platform admin can reorder lessons",
        );
      }
    }

    const { lessons: items } = dto;
    await this.db.transaction(async (tx) => {
      await Promise.all(
        items.map((item) =>
          tx
            .update(lessons)
            .set({ order: item.order })
            .where(eq(lessons.lessonId, item.lessonId)),
        ),
      );
    });
    return { success: true };
  }

  async updateQuizQuestions(
    lessonId: string,
    dto: UpdateQuizQuestionsDto,
    userId: string,
    userRole: string
  ) {
    const lesson = await this.db.query.lessons.findFirst({
      where: eq(lessons.lessonId, lessonId),
      with: { section: { with: { course: true } } },
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    if (
      userRole !== "PLATFORM_ADMIN" &&
      lesson.section.course.instructorId !== userId
    ) {
      throw new ForbiddenException(
        "Only course owner or admin can update quiz"
      );
    }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(quizQuestions)
        .where(eq(quizQuestions.lessonId, lessonId));

      if (dto.questions.length > 0) {
        await tx.insert(quizQuestions).values(
          dto.questions.map((q, idx) => ({
            lessonId,
            question: q.text,
            answers: q.options.map((opt, i) => ({
              text: opt,
              isCorrect: i === q.correctOptionIndex,
            })),
            explanation: q.explanation,
            order: idx,
          }))
        );
      }

      await tx
        .update(lessons)
        .set({ updatedAt: new Date() })
        .where(eq(lessons.lessonId, lessonId));
    });

    return { success: true };
  }

  async getPlaybackUrl(lessonId: string, userId: string, userRole: string) {
    const lesson = await this.db.query.lessons.findFirst({
      where: eq(lessons.lessonId, lessonId),
      with: {
        section: {
          with: { course: true },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    const isAdmin = userRole === "PLATFORM_ADMIN";
    const isInstructor = userRole === "INSTRUCTOR";

    // Allow admins and instructors to bypass enrollment and status checks
    if (!isAdmin && !isInstructor) {
      if (lesson.status !== "READY") {
        throw new ForbiddenException("Lesson is not ready for playback");
      }

      const [enrollment] = await this.db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.courseId, lesson.section.courseId),
            eq(enrollments.userId, userId)
          )
        )
        .limit(1);

      if (!enrollment) {
        const [sectionGrant] = await this.db
          .select()
          .from(sectionAccess)
          .where(
            and(
              eq(sectionAccess.courseId, lesson.section.courseId),
              eq(sectionAccess.userId, userId),
              eq(sectionAccess.sectionId, lesson.sectionId)
            )
          )
          .limit(1);

        if (!sectionGrant) {
          throw new ForbiddenException(
            "You must be enrolled in this course to access lessons"
          );
        }
      }
    }

    // Get the Bunny Stream video ID from the encoding job's outputPath
    const [encodingJob] = await this.db
      .select()
      .from(videoEncodingJobs)
      .where(eq(videoEncodingJobs.lessonId, lessonId))
      .limit(1);

    if (!encodingJob?.outputPath) {
      throw new NotFoundException("Video encoding not found for this lesson");
    }

    // outputPath stores the Bunny Stream video GUID
    const videoId = encodingJob.outputPath;
    const signedUrl = this.cdnService.getSignedEmbedUrl(videoId, 600);

    return {
      signedUrl,
      status: lesson.status,
      courseId: lesson.section.courseId,
      lessonId: lessonId,
    };
  }

  async getPreviewUrl(lessonId: string) {
    const lesson = await this.db.query.lessons.findFirst({
      where: eq(lessons.lessonId, lessonId),
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    if (!lesson.isFreePreview) {
      throw new ForbiddenException("This lesson is not available for preview");
    }

    if (lesson.status !== "READY") {
      throw new ForbiddenException("Lesson is not ready for playback");
    }

    const [encodingJob] = await this.db
      .select()
      .from(videoEncodingJobs)
      .where(eq(videoEncodingJobs.lessonId, lessonId))
      .limit(1);

    if (!encodingJob?.outputPath) {
      throw new NotFoundException("Video encoding not found for this lesson");
    }

    const videoId = encodingJob.outputPath;
    // Short expiry for preview (5 minutes)
    const signedUrl = this.cdnService.getSignedEmbedUrl(videoId, 300);

    return {
      signedUrl,
      lessonId,
    };
  }
}
