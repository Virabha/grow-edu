import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchSubjects,
  batches,
  lessons,
  subjectLessons,
  users,
} from "../../database/schema";
import { NotificationsService } from "../../notifications/notifications.service";
import { SignedInViewer } from "../access/batch-access.service";
import { RejectSubmissionDto } from "../dto/reject-submission.dto";

export interface PendingItem {
  kind: "LESSON";
  itemId: string;
  title: string;
  batchId: string;
  batchTitle: string;
  subjectId: string;
  subjectName: string;
  submittedBy: string | null;
  submittedByName: string | null;
  submittedAt: string | null;
  previousComment: string | null;
}

@Injectable()
export class ApprovalsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly notifications: NotificationsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async queue(): Promise<PendingItem[]> {
    const rows = await this.db
      .select({
        lesson: lessons,
        subject: batchSubjects,
        batch: batches,
        author: {
          userId: users.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(lessons)
      .innerJoin(subjectLessons, eq(subjectLessons.lessonId, lessons.lessonId))
      .innerJoin(
        batchSubjects,
        eq(batchSubjects.subjectId, subjectLessons.subjectId),
      )
      .innerJoin(batches, eq(batches.batchId, batchSubjects.batchId))
      .leftJoin(users, eq(users.userId, lessons.createdBy))
      .where(
        and(
          eq(lessons.status, "PENDING_APPROVAL"),
          eq(lessons.isDeleted, false),
          eq(subjectLessons.isDeleted, false),
        ),
      )
      .orderBy(asc(lessons.submittedAt), asc(lessons.createdAt));

    return rows.map(({ lesson, subject, batch, author }) => {
      const name = [author?.firstName, author?.lastName]
        .filter(Boolean)
        .join(" ");
      return {
        kind: "LESSON" as const,
        itemId: lesson.lessonId,
        title: lesson.title,
        batchId: batch.batchId,
        batchTitle: batch.title,
        subjectId: subject.subjectId,
        subjectName: subject.name,
        submittedBy: lesson.createdBy,
        submittedByName:
          name.length > 0 ? name : (author?.email ?? null),
        submittedAt: lesson.submittedAt
          ? lesson.submittedAt.toISOString()
          : null,
        previousComment: lesson.reviewNotes,
      };
    });
  }

  async approve(lessonId: string, reviewer: SignedInViewer) {
    const lesson = await this.requirePending(lessonId);
    const now = this.clock.now();

    const [approved] = await this.db
      .update(lessons)
      .set({
        status: "READY",
        reviewedAt: now,
        reviewedBy: reviewer.userId,
        reviewNotes: null,
        updatedAt: now,
      })
      .where(eq(lessons.lessonId, lessonId))
      .returning();

    await this.auditLog.record({
      action: "content.approve",
      targetType: "lesson",
      targetId: lessonId,
      before: { status: "PENDING_APPROVAL" },
      after: { status: "READY" },
    });

    await this.tellAuthor(
      lesson.createdBy,
      `Published: ${lesson.title}`,
      "Your lesson was approved and enrolled students can see it now.",
    );

    return approved;
  }

  async reject(
    lessonId: string,
    dto: RejectSubmissionDto,
    reviewer: SignedInViewer,
  ) {
    const lesson = await this.requirePending(lessonId);
    const now = this.clock.now();

    const [rejected] = await this.db
      .update(lessons)
      .set({
        status: "DRAFT",
        reviewedAt: now,
        reviewedBy: reviewer.userId,
        reviewNotes: dto.comment,
        updatedAt: now,
      })
      .where(eq(lessons.lessonId, lessonId))
      .returning();

    await this.auditLog.record({
      action: "content.reject",
      targetType: "lesson",
      targetId: lessonId,
      before: { status: "PENDING_APPROVAL" },
      after: { status: "DRAFT", comment: dto.comment },
    });

    await this.tellAuthor(
      lesson.createdBy,
      `Sent back: ${lesson.title}`,
      dto.comment,
    );

    return rejected;
  }

  async mine(viewer: SignedInViewer) {
    const rows = await this.db
      .select({ lesson: lessons, subject: batchSubjects, batch: batches })
      .from(lessons)
      .innerJoin(subjectLessons, eq(subjectLessons.lessonId, lessons.lessonId))
      .innerJoin(
        batchSubjects,
        eq(batchSubjects.subjectId, subjectLessons.subjectId),
      )
      .innerJoin(batches, eq(batches.batchId, batchSubjects.batchId))
      .where(
        and(
          eq(lessons.createdBy, viewer.userId),
          eq(lessons.isDeleted, false),
          eq(subjectLessons.isDeleted, false),
        ),
      )
      .orderBy(asc(lessons.updatedAt));

    return rows.map(({ lesson, subject, batch }) => ({
      itemId: lesson.lessonId,
      title: lesson.title,
      status: lesson.status,
      batchId: batch.batchId,
      batchTitle: batch.title,
      subjectId: subject.subjectId,
      comment: lesson.reviewNotes,
      reviewedAt: lesson.reviewedAt ? lesson.reviewedAt.toISOString() : null,
    }));
  }

  private async requirePending(lessonId: string) {
    const [lesson] = await this.db
      .select()
      .from(lessons)
      .where(and(eq(lessons.lessonId, lessonId), eq(lessons.isDeleted, false)))
      .limit(1);
    if (!lesson) throw new NotFoundException("That item is not in the queue");
    if (lesson.status !== "PENDING_APPROVAL") {
      throw new BadRequestException(
        `That item is ${lesson.status}, so it is not waiting for approval`,
      );
    }
    return lesson;
  }

  private async tellAuthor(
    authorId: string | null,
    title: string,
    body: string,
  ): Promise<void> {
    if (!authorId) return;
    await this.notifications.create({
      userId: authorId,
      type: "GENERIC",
      title,
      body,
      link: "/instructor/submissions",
    });
  }
}
