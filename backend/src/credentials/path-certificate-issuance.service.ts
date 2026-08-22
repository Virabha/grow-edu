import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AuditLogService } from "../audit/audit-log.service";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  certificateTemplates,
  learningPaths,
  pathCertificates,
  pathCompletionCriteria,
  pathEnrolments,
  pathStageProgress,
  pathStages,
  users,
} from "../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../jobs/job-queue";
import { NotificationsService } from "../notifications/notifications.service";

export const PATH_CERTIFICATE_ISSUANCE_JOB = "path.certificate.issuance.sweep";

const EVERY_HOUR = 60 * 60 * 1000;

type DbType = PostgresJsDatabase<typeof schema>;

@Injectable()
export class PathCertificateIssuanceService implements OnModuleInit {
  private readonly logger = new Logger(PathCertificateIssuanceService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    private readonly notifications: NotificationsService,
    private readonly auditLog: AuditLogService,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      PATH_CERTIFICATE_ISSUANCE_JOB,
      async () => {
        await this.sweep();
      },
      EVERY_HOUR,
      (err) =>
        this.logger.error(
          "Could not schedule path certificate issuance sweep",
          err,
        ),
    );
  }

  async sweep(): Promise<string[]> {
    const criteriaRows = await this.db
      .select()
      .from(pathCompletionCriteria);

    const issued: string[] = [];

    for (const criterion of criteriaRows) {
      const enrolments = await this.db
        .select({ userId: pathEnrolments.userId })
        .from(pathEnrolments)
        .where(
          and(
            eq(pathEnrolments.pathId, criterion.pathId),
            eq(pathEnrolments.status, "ACTIVE"),
          ),
        );

      for (const { userId } of enrolments) {
        try {
          const met = await this.criteriaMetFor(criterion, userId);
          if (!met) continue;
          const certId = await this.issueIdempotent(criterion.pathId, userId);
          if (certId) issued.push(certId);
        } catch (err) {
          this.logger.error(
            `Path issuance failed for path=${criterion.pathId} user=${userId}`,
            err,
          );
        }
      }
    }

    return issued;
  }

  private async criteriaMetFor(
    criterion: typeof pathCompletionCriteria.$inferSelect,
    userId: string,
  ): Promise<boolean> {
    const { pathId, requireCapstone, minStagesCompletePercent } = criterion;

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(pathStages)
      .where(
        and(eq(pathStages.pathId, pathId), eq(pathStages.isDeleted, false)),
      );

    if (total === 0) return false;

    const [{ done }] = await this.db
      .select({ done: sql<number>`count(*)::int` })
      .from(pathStageProgress)
      .innerJoin(
        pathStages,
        and(
          eq(pathStages.stageId, pathStageProgress.stageId),
          eq(pathStages.isDeleted, false),
        ),
      )
      .where(
        and(
          eq(pathStageProgress.pathId, pathId),
          eq(pathStageProgress.userId, userId),
          eq(pathStageProgress.state, "COMPLETE"),
        ),
      );

    const pct = (done / total) * 100;
    if (pct < minStagesCompletePercent) return false;

    if (requireCapstone) {
      const [{ capstoneDone }] = await this.db
        .select({ capstoneDone: sql<number>`count(*)::int` })
        .from(pathStageProgress)
        .innerJoin(
          pathStages,
          and(
            eq(pathStages.stageId, pathStageProgress.stageId),
            eq(pathStages.isCapstone, true),
            eq(pathStages.isDeleted, false),
          ),
        )
        .where(
          and(
            eq(pathStageProgress.pathId, pathId),
            eq(pathStageProgress.userId, userId),
            eq(pathStageProgress.state, "COMPLETE"),
          ),
        );

      if (capstoneDone === 0) return false;
    }

    return true;
  }

  private async issueIdempotent(
    pathId: string,
    userId: string,
  ): Promise<string | null> {
    const [path] = await this.db
      .select({ title: learningPaths.title })
      .from(learningPaths)
      .where(eq(learningPaths.pathId, pathId))
      .limit(1);

    if (!path) return null;

    const now = this.clock.now();
    const year = now.getFullYear();
    const p = pathId.replace(/-/g, "").slice(0, 12).toUpperCase();
    const u = userId.replace(/-/g, "").slice(0, 12).toUpperCase();
    const certificateNumber = `PATH-${p}-${u}-${year}`;

    const [inserted] = await this.db
      .insert(pathCertificates)
      .values({
        pathId,
        userId,
        certificateNumber,
        issuedAt: now,
      })
      .onConflictDoNothing()
      .returning({ certificateId: pathCertificates.certificateId });

    if (!inserted) return null;

    await this.auditLog.record({
      action: "path_certificate.issued",
      targetType: "path_certificate",
      targetId: inserted.certificateId,
      after: { pathId, userId, certificateNumber },
    });

    const [user] = await this.db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (user) {
      await this.notifications.create({
        userId,
        type: "PATH_CERTIFICATE",
        title: `Path certificate issued — ${path.title}`,
        body: `Your certificate ${certificateNumber} is ready.`,
        link: `/paths/${pathId}/certificate`,
      });
    }

    return inserted.certificateId;
  }

  async verify(verificationCode: string) {
    const [row] = await this.db
      .select({
        cert: {
          issuedAt: pathCertificates.issuedAt,
          revokedAt: pathCertificates.revokedAt,
        },
        path: { title: learningPaths.title },
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(pathCertificates)
      .innerJoin(
        learningPaths,
        eq(learningPaths.pathId, pathCertificates.pathId),
      )
      .innerJoin(users, eq(users.userId, pathCertificates.userId))
      .where(eq(pathCertificates.verificationCode, verificationCode))
      .limit(1);

    if (!row) return null;

    const [template] = await this.db
      .select({ signatoryName: certificateTemplates.signatoryName })
      .from(certificateTemplates)
      .limit(1);

    const issuerName = template?.signatoryName || "groEdu";
    const holderName =
      [row.user.firstName, row.user.lastName].filter(Boolean).join(" ") ||
      "Certificate Holder";

    return {
      holderName,
      pathTitle: row.path.title,
      issuedAt: row.cert.issuedAt.toISOString(),
      issuerName,
      revoked: row.cert.revokedAt !== null,
      revokedAt: row.cert.revokedAt
        ? row.cert.revokedAt.toISOString()
        : null,
    };
  }
}
