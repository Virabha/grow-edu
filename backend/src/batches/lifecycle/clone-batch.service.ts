import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { randomUUID } from "crypto";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batches,
  batchSubjects,
  subjectLessons,
  batchSessions,
  batchQuizzes,
  batchQuizQuestions,
  batchResources,
  batchInstructors,
} from "../../database/schema";
import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";

@Injectable()
export class CloneBatchService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly auditLog: AuditLogService,
  ) {}

  async clone(sourceBatchId: string, actorId: string, slugOverride?: string) {
    const [source] = await this.db
      .select()
      .from(batches)
      .where(
        and(eq(batches.batchId, sourceBatchId), eq(batches.isDeleted, false)),
      )
      .limit(1);

    if (!source) {
      throw new NotFoundException({
        code: "BATCH_NOT_FOUND",
        message: "Batch not found",
      });
    }

    const cloneBatchId = randomUUID();
    const cloneSlug =
      slugOverride ?? `${source.slug}-clone-${randomUUID().slice(0, 8)}`;

    const clonedBatch = await this.db.transaction(async (tx) => {
      const now = this.clock.now();

      const [clone] = await tx
        .insert(batches)
        .values({
          batchId: cloneBatchId,
          organizationId: source.organizationId,
          title: source.title,
          slug: cloneSlug,
          description: source.description,
          shortDescription: source.shortDescription,
          targetExam: source.targetExam,
          language: source.language,
          thumbnail: source.thumbnail,
          bannerImage: source.bannerImage,
          price: source.price,
          compareAtPrice: source.compareAtPrice,
          currency: source.currency,
          capacity: source.capacity,
          startDate: source.startDate,
          endDate: source.endDate,
          deliveryMode: source.deliveryMode,
          categoryId: source.categoryId,
          status: "DRAFT",
          createdBy: actorId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const sourceSubjects = await tx
        .select()
        .from(batchSubjects)
        .where(
          and(
            eq(batchSubjects.batchId, sourceBatchId),
            eq(batchSubjects.isDeleted, false),
          ),
        );

      const subjectIdMap = new Map<string, string>();

      for (const subject of sourceSubjects) {
        const newSubjectId = randomUUID();
        subjectIdMap.set(subject.subjectId, newSubjectId);
        await tx.insert(batchSubjects).values({
          subjectId: newSubjectId,
          organizationId: subject.organizationId,
          batchId: cloneBatchId,
          name: subject.name,
          color: subject.color,
          displayOrder: subject.displayOrder,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        });
      }

      if (sourceSubjects.length > 0) {
        const oldSubjectIds = sourceSubjects.map((s) => s.subjectId);
        const placements = await tx
          .select()
          .from(subjectLessons)
          .where(
            and(
              inArray(subjectLessons.subjectId, oldSubjectIds),
              eq(subjectLessons.isDeleted, false),
            ),
          );

        for (const placement of placements) {
          const newSubjectId = subjectIdMap.get(placement.subjectId);
          if (!newSubjectId) continue;
          await tx.insert(subjectLessons).values({
            placementId: randomUUID(),
            organizationId: placement.organizationId,
            subjectId: newSubjectId,
            lessonId: placement.lessonId,
            order: placement.order,
            isDeleted: false,
            createdAt: now,
          });
        }
      }

      const sourceSessions = await tx
        .select()
        .from(batchSessions)
        .where(
          and(
            eq(batchSessions.batchId, sourceBatchId),
            eq(batchSessions.isDeleted, false),
          ),
        );

      for (const session of sourceSessions) {
        const newSubjectId = session.subjectId
          ? (subjectIdMap.get(session.subjectId) ?? null)
          : null;
        await tx.insert(batchSessions).values({
          sessionId: randomUUID(),
          organizationId: session.organizationId,
          batchId: cloneBatchId,
          subjectId: newSubjectId,
          teacherId: session.teacherId,
          title: session.title,
          description: session.description,
          type: session.type,
          liveProvider: session.liveProvider,
          joinUrl: session.joinUrl,
          meetingId: session.meetingId,
          meetingPasscode: session.meetingPasscode,
          scheduledStartAt: session.scheduledStartAt,
          scheduledEndAt: session.scheduledEndAt,
          actualStartAt: null,
          actualEndAt: null,
          status: "SCHEDULED",
          recordingVideoId: session.recordingVideoId,
          recordingDurationSeconds: session.recordingDurationSeconds,
          recordingThumbnail: session.recordingThumbnail,
          resources: session.resources,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        });
      }

      const sourceQuizzes = await tx
        .select()
        .from(batchQuizzes)
        .where(
          and(
            eq(batchQuizzes.batchId, sourceBatchId),
            eq(batchQuizzes.isDeleted, false),
          ),
        );

      for (const quiz of sourceQuizzes) {
        const newQuizId = randomUUID();
        const newSubjectId = quiz.subjectId
          ? (subjectIdMap.get(quiz.subjectId) ?? null)
          : null;

        await tx.insert(batchQuizzes).values({
          quizId: newQuizId,
          organizationId: quiz.organizationId,
          batchId: cloneBatchId,
          subjectId: newSubjectId,
          title: quiz.title,
          description: quiz.description,
          durationMinutes: quiz.durationMinutes,
          maxAttempts: quiz.maxAttempts,
          negativeMarkPercent: quiz.negativeMarkPercent,
          passingPercent: quiz.passingPercent,
          showLeaderboard: quiz.showLeaderboard,
          showSolutions: quiz.showSolutions,
          version: 1,
          opensAt: null,
          closesAt: null,
          publishedAt: null,
          isDeleted: false,
          createdBy: actorId,
          createdAt: now,
          updatedAt: now,
        });

        const sourceQuestions = await tx
          .select()
          .from(batchQuizQuestions)
          .where(
            and(
              eq(batchQuizQuestions.quizId, quiz.quizId),
              eq(batchQuizQuestions.isDeleted, false),
            ),
          );

        for (const question of sourceQuestions) {
          await tx.insert(batchQuizQuestions).values({
            questionId: randomUUID(),
            organizationId: question.organizationId,
            quizId: newQuizId,
            order: question.order,
            type: question.type,
            prompt: question.prompt,
            options: question.options,
            correctAnswer: question.correctAnswer,
            marks: question.marks,
            explanation: question.explanation,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      const sourceResources = await tx
        .select()
        .from(batchResources)
        .where(
          and(
            eq(batchResources.batchId, sourceBatchId),
            eq(batchResources.isDeleted, false),
          ),
        );

      for (const resource of sourceResources) {
        const newSubjectId = resource.subjectId
          ? (subjectIdMap.get(resource.subjectId) ?? null)
          : null;
        await tx.insert(batchResources).values({
          resourceId: randomUUID(),
          organizationId: resource.organizationId,
          batchId: cloneBatchId,
          subjectId: newSubjectId,
          title: resource.title,
          description: resource.description,
          type: resource.type,
          fileKey: resource.fileKey,
          fileSize: resource.fileSize,
          pageCount: resource.pageCount,
          dayNumber: resource.dayNumber,
          publishAt: null,
          isDownloadable: resource.isDownloadable,
          uploadedBy: actorId,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        });
      }

      const sourceInstructors = await tx
        .select()
        .from(batchInstructors)
        .where(eq(batchInstructors.batchId, sourceBatchId));

      for (const instructor of sourceInstructors) {
        await tx.insert(batchInstructors).values({
          batchInstructorId: randomUUID(),
          organizationId: instructor.organizationId,
          batchId: cloneBatchId,
          instructorId: instructor.instructorId,
          role: instructor.role,
          assignedBy: actorId,
          createdAt: now,
        });
      }

      await this.auditLog.record({
        action: "BATCH_CLONED",
        targetType: "BATCH",
        targetId: cloneBatchId,
        before: { sourceBatchId },
        after: { cloneBatchId },
        tx,
      });

      return clone;
    });

    return clonedBatch;
  }
}
