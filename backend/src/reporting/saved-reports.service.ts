import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, isNull, lte } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { reportSchedules, reportShares, savedReports } from "../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../jobs/job-queue";
import { ReportBuilderService, ReportDefinition, ViewerContext } from "./report-builder.service";

const SCHEDULE_JOB = "saved-reports.schedule";
const SCHEDULE_INTERVAL_MS = 60 * 60 * 1000;

function nextRunAtForCadence(from: Date, cadence: string): Date {
  const d = new Date(from.getTime());
  if (cadence === "DAILY") d.setDate(d.getDate() + 1);
  else if (cadence === "WEEKLY") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

@Injectable()
export class SavedReportsService {
  private readonly logger = new Logger(SavedReportsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    private readonly builder: ReportBuilderService,
  ) {
    registerAndRepeat(
      jobs,
      SCHEDULE_JOB,
      () => this.dispatchScheduled(),
      SCHEDULE_INTERVAL_MS,
      (err) => this.logger.error("Failed to schedule saved-reports.schedule", err),
    );
  }

  async save(
    title: string,
    definition: ReportDefinition,
    creator: ViewerContext,
  ) {
    const now = this.clock.now();
    const [row] = await this.db
      .insert(savedReports)
      .values({
        title,
        createdBy: creator.userId,
        definition: definition as (typeof savedReports)["$inferInsert"]["definition"],
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return row;
  }

  async list(viewer: ViewerContext) {
    const owned = await this.db
      .select()
      .from(savedReports)
      .where(
        and(
          eq(savedReports.createdBy, viewer.userId),
          eq(savedReports.isDeleted, false),
        ),
      );

    const shared = await this.db
      .select({ report: savedReports })
      .from(reportShares)
      .innerJoin(savedReports, eq(reportShares.reportId, savedReports.reportId))
      .where(
        and(
          eq(reportShares.grantedTo, viewer.userId),
          isNull(reportShares.revokedAt),
          eq(savedReports.isDeleted, false),
        ),
      );

    return [
      ...owned.map((r) => ({ ...r, owned: true })),
      ...shared.map((s) => ({ ...s.report, owned: false })),
    ];
  }

  async run(reportId: string, viewer: ViewerContext) {
    const report = await this.loadAccessible(reportId, viewer.userId);
    const definition = report.definition as ReportDefinition;
    return this.builder.run(definition, viewer);
  }

  async export(reportId: string, viewer: ViewerContext) {
    const report = await this.loadAccessible(reportId, viewer.userId);
    const definition = report.definition as ReportDefinition;
    return this.builder.run(definition, viewer);
  }

  async schedule(reportId: string, owner: ViewerContext, cadence: string) {
    const report = await this.loadOwned(reportId, owner.userId);
    const now = this.clock.now();
    const nextRunAt = nextRunAtForCadence(now, cadence);

    const existing = await this.db
      .select()
      .from(reportSchedules)
      .where(
        and(
          eq(reportSchedules.contractId, report.reportId),
          eq(reportSchedules.recipientId, owner.userId),
          eq(reportSchedules.reportType, "SAVED_REPORT"),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await this.db
        .update(reportSchedules)
        .set({ cadence, nextRunAt, isPaused: false, updatedAt: now })
        .where(eq(reportSchedules.scheduleId, existing[0].scheduleId))
        .returning();
      return updated;
    }

    const [row] = await this.db
      .insert(reportSchedules)
      .values({
        contractId: report.reportId,
        recipientId: owner.userId,
        reportType: "SAVED_REPORT",
        cadence,
        nextRunAt,
        createdBy: owner.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return row;
  }

  async getSchedule(reportId: string, owner: ViewerContext) {
    const report = await this.loadOwned(reportId, owner.userId);

    const [row] = await this.db
      .select()
      .from(reportSchedules)
      .where(
        and(
          eq(reportSchedules.contractId, report.reportId),
          eq(reportSchedules.recipientId, owner.userId),
          eq(reportSchedules.reportType, "SAVED_REPORT"),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException("Schedule not found");
    return row;
  }

  async share(reportId: string, owner: ViewerContext, grantedTo: string) {
    const report = await this.loadOwned(reportId, owner.userId);
    const now = this.clock.now();
    const [row] = await this.db
      .insert(reportShares)
      .values({
        reportId: report.reportId,
        grantedTo,
        grantedBy: owner.userId,
        createdAt: now,
      })
      .returning();
    return row;
  }

  async revokeShare(reportId: string, owner: ViewerContext, grantedTo: string) {
    const report = await this.loadOwned(reportId, owner.userId);
    const share = await this.db
      .select()
      .from(reportShares)
      .where(
        and(
          eq(reportShares.reportId, report.reportId),
          eq(reportShares.grantedTo, grantedTo),
          isNull(reportShares.revokedAt),
        ),
      )
      .limit(1);

    if (share.length === 0) {
      throw new NotFoundException("Share not found");
    }

    await this.db
      .update(reportShares)
      .set({ revokedAt: this.clock.now() })
      .where(eq(reportShares.shareId, share[0].shareId));
  }

  async delete(reportId: string, owner: ViewerContext) {
    await this.loadOwned(reportId, owner.userId);
    await this.db
      .update(savedReports)
      .set({ isDeleted: true, updatedAt: this.clock.now() })
      .where(eq(savedReports.reportId, reportId));
  }

  private async dispatchScheduled(): Promise<void> {
    const now = this.clock.now();

    const dueSchedules = await this.db
      .select()
      .from(reportSchedules)
      .where(
        and(
          eq(reportSchedules.reportType, "SAVED_REPORT"),
          eq(reportSchedules.isPaused, false),
          lte(reportSchedules.nextRunAt, now),
        ),
      );

    for (const sched of dueSchedules) {
      try {
        const [report] = await this.db
          .select()
          .from(savedReports)
          .where(
            and(
              eq(savedReports.reportId, sched.contractId),
              eq(savedReports.isDeleted, false),
            ),
          )
          .limit(1);

        if (report) {
          const viewer: ViewerContext = { userId: sched.recipientId, role: "PLATFORM_ADMIN" };
          const definition = report.definition as ReportDefinition;
          await this.builder.run(definition, viewer);
        }

        const nextRunAt = nextRunAtForCadence(now, sched.cadence);
        await this.db
          .update(reportSchedules)
          .set({ lastRunAt: now, nextRunAt, updatedAt: now })
          .where(eq(reportSchedules.scheduleId, sched.scheduleId));
      } catch (err) {
        this.logger.error(`Failed to dispatch schedule ${sched.scheduleId}`, err);
      }
    }
  }

  private async loadOwned(reportId: string, userId: string) {
    const [report] = await this.db
      .select()
      .from(savedReports)
      .where(
        and(
          eq(savedReports.reportId, reportId),
          eq(savedReports.createdBy, userId),
          eq(savedReports.isDeleted, false),
        ),
      )
      .limit(1);
    if (!report) {
      throw new NotFoundException("Report not found");
    }
    return report;
  }

  private async loadAccessible(reportId: string, userId: string) {
    const [owned] = await this.db
      .select()
      .from(savedReports)
      .where(
        and(
          eq(savedReports.reportId, reportId),
          eq(savedReports.createdBy, userId),
          eq(savedReports.isDeleted, false),
        ),
      )
      .limit(1);

    if (owned) return owned;

    const [sharedRow] = await this.db
      .select({ report: savedReports })
      .from(reportShares)
      .innerJoin(savedReports, eq(reportShares.reportId, savedReports.reportId))
      .where(
        and(
          eq(reportShares.reportId, reportId),
          eq(reportShares.grantedTo, userId),
          isNull(reportShares.revokedAt),
          eq(savedReports.isDeleted, false),
        ),
      )
      .limit(1);

    if (!sharedRow) {
      throw new ForbiddenException("Report not accessible");
    }
    return sharedRow.report;
  }
}
