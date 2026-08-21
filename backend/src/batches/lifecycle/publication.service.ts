import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import { batchSubjects, lessons, subjectLessons } from "../../database/schema";
import { JOB_QUEUE, JobQueue } from "../../jobs/job-queue";
import { NotificationsService } from "../../notifications/notifications.service";
import { BatchAccessService, SignedInViewer } from "../access/batch-access.service";
import {
  SchedulePublicationDto,
  SetUnlockRuleDto,
} from "../dto/unlock-rule.dto";

export const PUBLISH_SCHEDULED_JOB = "content.publish.scheduled";

const EVERY_FIVE_MINUTES = 5 * 60 * 1000;

@Injectable()
export class PublicationService implements OnModuleInit {
  private readonly logger = new Logger(PublicationService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    private readonly access: BatchAccessService,
    private readonly notifications: NotificationsService,
    private readonly auditLog: AuditLogService,
  ) {}

  onModuleInit(): void {
    this.jobs.register(PUBLISH_SCHEDULED_JOB, async () => {
      await this.publishDue();
    });
    this.jobs
      .repeat(PUBLISH_SCHEDULED_JOB, EVERY_FIVE_MINUTES)
      .catch((err) =>
        this.logger.error("Could not schedule content publication", err),
      );
  }

  async schedule(
    lessonId: string,
    dto: SchedulePublicationDto,
    reviewer: SignedInViewer,
  ) {
    const lesson = await this.requireLesson(lessonId);
    const now = this.clock.now();

    if (!dto.publishAt) {
      return this.publishNow(lessonId, reviewer);
    }

    const publishAt = new Date(dto.publishAt);
    if (publishAt.getTime() <= now.getTime()) {
      return this.publishNow(lessonId, reviewer);
    }

    const [scheduled] = await this.db
      .update(lessons)
      .set({
        status: "SCHEDULED",
        publishAt,
        reviewedAt: now,
        reviewedBy: reviewer.userId,
        reviewNotes: null,
        updatedAt: now,
      })
      .where(eq(lessons.lessonId, lessonId))
      .returning();

    await this.auditLog.record({
      action: "content.schedule",
      targetType: "lesson",
      targetId: lessonId,
      before: { status: lesson.status },
      after: { status: "SCHEDULED", publishAt: publishAt.toISOString() },
    });

    return scheduled;
  }

  async cancelSchedule(lessonId: string, reviewer: SignedInViewer) {
    const lesson = await this.requireLesson(lessonId);
    if (lesson.status !== "SCHEDULED") {
      throw new BadRequestException(
        "That item is not waiting to be published, so there is nothing to call off",
      );
    }

    const now = this.clock.now();
    const [reverted] = await this.db
      .update(lessons)
      .set({
        status: "PENDING_APPROVAL",
        publishAt: null,
        reviewedAt: now,
        reviewedBy: reviewer.userId,
        updatedAt: now,
      })
      .where(eq(lessons.lessonId, lessonId))
      .returning();

    await this.auditLog.record({
      action: "content.schedule.cancel",
      targetType: "lesson",
      targetId: lessonId,
      before: {
        status: "SCHEDULED",
        publishAt: lesson.publishAt ? lesson.publishAt.toISOString() : null,
      },
      after: { status: "PENDING_APPROVAL" },
    });

    return reverted;
  }

  async publishDue(): Promise<string[]> {
    const now = this.clock.now();
    const published = await this.db
      .update(lessons)
      .set({ status: "READY", publishAt: null, updatedAt: now })
      .where(
        and(
          eq(lessons.status, "SCHEDULED"),
          isNotNull(lessons.publishAt),
          lte(lessons.publishAt, now),
          eq(lessons.isDeleted, false),
        ),
      )
      .returning({ lessonId: lessons.lessonId, title: lessons.title });

    for (const lesson of published) {
      await this.auditLog.record({
        action: "content.publish.scheduled",
        targetType: "lesson",
        targetId: lesson.lessonId,
        after: { status: "READY", at: now.toISOString() },
      });
    }

    return published.map((l) => l.lessonId);
  }

  async setUnlockRule(
    batchId: string,
    lessonId: string,
    dto: SetUnlockRuleDto,
    viewer: SignedInViewer,
  ) {
    await this.access.require(batchId, viewer, "MANAGE");

    if (dto.unlockAt && dto.unlockAfterDays !== undefined && dto.unlockAfterDays !== null) {
      throw new BadRequestException(
        "Choose either a fixed date or an offset from enrolment, not both",
      );
    }

    const subjectIds = await this.subjectIdsFor(batchId);
    const [updated] = await this.db
      .update(subjectLessons)
      .set({
        unlockAt: dto.unlockAt ? new Date(dto.unlockAt) : null,
        unlockAfterDays: dto.unlockAfterDays ?? null,
      })
      .where(
        and(
          eq(subjectLessons.lessonId, lessonId),
          eq(subjectLessons.isDeleted, false),
        ),
      )
      .returning();

    if (!updated || !subjectIds.includes(updated.subjectId)) {
      throw new NotFoundException("Lesson not found in this batch");
    }

    await this.auditLog.record({
      action: "content.unlock-rule",
      targetType: "lesson",
      targetId: lessonId,
      after: {
        batchId,
        unlockAt: updated.unlockAt ? updated.unlockAt.toISOString() : null,
        unlockAfterDays: updated.unlockAfterDays,
      },
    });

    return {
      lessonId,
      subjectId: updated.subjectId,
      unlockAt: updated.unlockAt ? updated.unlockAt.toISOString() : null,
      unlockAfterDays: updated.unlockAfterDays,
    };
  }

  private async publishNow(lessonId: string, reviewer: SignedInViewer) {
    const now = this.clock.now();
    const [published] = await this.db
      .update(lessons)
      .set({
        status: "READY",
        publishAt: null,
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
      after: { status: "READY" },
    });

    return published;
  }

  private async requireLesson(lessonId: string) {
    const [lesson] = await this.db
      .select()
      .from(lessons)
      .where(and(eq(lessons.lessonId, lessonId), eq(lessons.isDeleted, false)))
      .limit(1);
    if (!lesson) throw new NotFoundException("Lesson not found");
    return lesson;
  }

  private async subjectIdsFor(batchId: string): Promise<string[]> {
    const rows = await this.db
      .select({ subjectId: batchSubjects.subjectId })
      .from(batchSubjects)
      .where(
        and(
          eq(batchSubjects.batchId, batchId),
          eq(batchSubjects.isDeleted, false),
        ),
      );
    return rows.map((r) => r.subjectId);
  }
}
