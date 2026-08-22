import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assessmentAttempts,
  assessmentTests,
  batchCertificates,
  batchCompletionCriteria,
  batchEnrollments,
  batchSubjects,
  batches,
  lessonProgress,
  lessons,
  subjectLessons,
  users,
} from "../../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../../jobs/job-queue";
import { NotificationsService } from "../../notifications/notifications.service";
import { BatchSchedulingService } from "../scheduling/batch-scheduling.service";

export const CERTIFICATE_ISSUANCE_JOB = "certificate.issuance.sweep";

const EVERY_HOUR = 60 * 60 * 1000;

type CriteriaRow = typeof batchCompletionCriteria.$inferSelect;

@Injectable()
export class CertificateIssuanceService implements OnModuleInit {
  private readonly logger = new Logger(CertificateIssuanceService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    private readonly scheduling: BatchSchedulingService,
    private readonly notifications: NotificationsService,
    private readonly auditLog: AuditLogService,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      CERTIFICATE_ISSUANCE_JOB,
      async () => {
        await this.sweep();
      },
      EVERY_HOUR,
      (err) => this.logger.error("Could not schedule certificate issuance", err),
    );
  }

  async sweep(): Promise<string[]> {
    const criteriaRows = await this.db
      .select()
      .from(batchCompletionCriteria);

    const issued: string[] = [];

    for (const criterion of criteriaRows) {
      const enrollments = await this.db
        .select({ userId: batchEnrollments.userId })
        .from(batchEnrollments)
        .where(
          and(
            eq(batchEnrollments.batchId, criterion.batchId),
            eq(batchEnrollments.status, "ACTIVE"),
          ),
        );

      for (const { userId } of enrollments) {
        try {
          const met = await this.criteriaMetFor(criterion, userId);
          if (!met) continue;
          const certId = await this.issueIdempotent(criterion.batchId, userId);
          if (certId) issued.push(certId);
        } catch (err) {
          this.logger.error(
            `Issuance failed for batch=${criterion.batchId} user=${userId}`,
            err,
          );
        }
      }
    }

    return issued;
  }

  private async criteriaMetFor(
    criterion: CriteriaRow,
    userId: string,
  ): Promise<boolean> {
    const batchId = criterion.batchId;

    if (criterion.minLessonCompletionPercent > 0) {
      const pct = await this.lessonCompletionPercent(batchId, userId);
      if (pct < criterion.minLessonCompletionPercent) return false;
    }

    if (criterion.minAttendancePercent > 0) {
      const { percent } = await this.scheduling.attendanceFor(batchId, userId);
      if (percent === null || percent < criterion.minAttendancePercent) {
        return false;
      }
    }

    if (criterion.minTestAveragePercent > 0) {
      const pct = await this.testAveragePercent(batchId, userId);
      if (pct === null || pct < criterion.minTestAveragePercent) return false;
    }

    return true;
  }

  private async lessonCompletionPercent(
    batchId: string,
    userId: string,
  ): Promise<number> {
    const [[{ total }], [{ done }]] = await Promise.all([
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(subjectLessons)
        .innerJoin(lessons, eq(lessons.lessonId, subjectLessons.lessonId))
        .innerJoin(
          batchSubjects,
          eq(batchSubjects.subjectId, subjectLessons.subjectId),
        )
        .where(
          and(
            eq(batchSubjects.batchId, batchId),
            eq(subjectLessons.isDeleted, false),
            eq(lessons.isDeleted, false),
            eq(lessons.status, "READY"),
          ),
        ),
      this.db
        .select({ done: sql<number>`count(*)::int` })
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.batchId, batchId),
            eq(lessonProgress.userId, userId),
            eq(lessonProgress.completed, true),
          ),
        ),
    ]);

    return total > 0 ? (done / total) * 100 : 100;
  }

  private async testAveragePercent(
    batchId: string,
    userId: string,
  ): Promise<number | null> {
    const [row] = await this.db
      .select({
        scored: sql<string>`coalesce(sum(${assessmentAttempts.finalScore}), 0)`,
        possible: sql<string>`coalesce(sum(${assessmentAttempts.maxScore}), 0)`,
      })
      .from(assessmentAttempts)
      .innerJoin(
        assessmentTests,
        eq(assessmentTests.testId, assessmentAttempts.testId),
      )
      .where(
        and(
          eq(assessmentTests.batchId, batchId),
          eq(assessmentAttempts.userId, userId),
          eq(assessmentAttempts.status, "GRADED"),
        ),
      );

    const possible = Number(row?.possible ?? 0);
    if (possible <= 0) return null;
    return (Number(row?.scored ?? 0) / possible) * 100;
  }

  private async issueIdempotent(
    batchId: string,
    userId: string,
  ): Promise<string | null> {
    const [batch] = await this.db
      .select({ title: batches.title, slug: batches.slug })
      .from(batches)
      .where(eq(batches.batchId, batchId))
      .limit(1);

    if (!batch) return null;

    const now = this.clock.now();
    const year = now.getFullYear();
    const b = batchId.slice(0, 6).toUpperCase();
    const u = userId.slice(0, 6).toUpperCase();
    const certificateNumber = `GRO-${b}-${u}-${year}`;

    const [inserted] = await this.db
      .insert(batchCertificates)
      .values({ batchId, userId, certificateNumber })
      .onConflictDoNothing()
      .returning({ certificateId: batchCertificates.certificateId });

    if (!inserted) return null;

    await this.auditLog.record({
      action: "certificate.issued",
      targetType: "batch_certificate",
      targetId: inserted.certificateId,
      after: { batchId, userId, certificateNumber },
    });

    const [user] = await this.db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (user) {
      await this.notifications.create({
        userId,
        type: "BATCH_CERTIFICATE",
        title: `Certificate issued — ${batch.title}`,
        body: `Your certificate ${certificateNumber} is ready to download.`,
        link: `/batches/${batch.slug}/certificate`,
        batchId,
      });
    }

    return inserted.certificateId;
  }
}
