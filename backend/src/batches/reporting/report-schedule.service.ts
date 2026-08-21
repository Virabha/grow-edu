import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { and, asc, eq, lte } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import { reportSchedules } from "../../database/schema";
import { JOB_QUEUE, JobQueue } from "../../jobs/job-queue";
import { NotificationsService } from "../../notifications/notifications.service";
import { CreateReportScheduleDto } from "./dto/create-report-schedule.dto";
import { CorporateReportService } from "./corporate-report.service";

export const REPORT_SCHEDULE_JOB = "report.schedule.send";

const EVERY_HOUR = 60 * 60 * 1000;
const MILLIS_PER_DAY = 86_400_000;

const CADENCE_DAYS: Record<string, number> = {
  DAILY: 1,
  WEEKLY: 7,
  FORTNIGHTLY: 14,
  MONTHLY: 30,
};

@Injectable()
export class ReportScheduleService implements OnModuleInit {
  private readonly logger = new Logger(ReportScheduleService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    private readonly reports: CorporateReportService,
    private readonly notifications: NotificationsService,
    private readonly auditLog: AuditLogService,
  ) {}

  onModuleInit(): void {
    this.jobs.register(REPORT_SCHEDULE_JOB, async () => {
      await this.sendDue();
    });
    this.jobs
      .repeat(REPORT_SCHEDULE_JOB, EVERY_HOUR)
      .catch((err) =>
        this.logger.error("Could not schedule report emails", err),
      );
  }

  async create(
    contractId: string,
    dto: CreateReportScheduleDto,
    actorId: string,
  ) {
    await this.reports.assertOwnsContract(actorId, contractId);

    const everyDays = CADENCE_DAYS[dto.cadence];
    if (everyDays === undefined) {
      throw new BadRequestException(`Unknown cadence: ${dto.cadence}`);
    }

    const now = this.clock.now();
    const [created] = await this.db
      .insert(reportSchedules)
      .values({
        contractId,
        recipientId: actorId,
        reportType: dto.reportType,
        subGroupId: dto.subGroupId ?? null,
        cadence: dto.cadence,
        nextRunAt: new Date(now.getTime() + everyDays * MILLIS_PER_DAY),
        createdBy: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await this.auditLog.record({
      action: "report.schedule.create",
      targetType: "report_schedule",
      targetId: created.scheduleId,
      after: {
        contractId,
        reportType: dto.reportType,
        cadence: dto.cadence,
        nextRunAt: created.nextRunAt.toISOString(),
      },
    });

    return this.present(created);
  }

  async list(contractId: string, actorId: string) {
    await this.reports.assertOwnsContract(actorId, contractId);
    const rows = await this.db
      .select()
      .from(reportSchedules)
      .where(eq(reportSchedules.contractId, contractId))
      .orderBy(asc(reportSchedules.createdAt));
    return rows.map((row) => this.present(row));
  }

  async setPaused(
    contractId: string,
    scheduleId: string,
    isPaused: boolean,
    actorId: string,
  ) {
    await this.reports.assertOwnsContract(actorId, contractId);
    const now = this.clock.now();

    const [updated] = await this.db
      .update(reportSchedules)
      .set({ isPaused, updatedAt: now })
      .where(
        and(
          eq(reportSchedules.scheduleId, scheduleId),
          eq(reportSchedules.contractId, contractId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException("Schedule not found");

    await this.auditLog.record({
      action: isPaused ? "report.schedule.pause" : "report.schedule.resume",
      targetType: "report_schedule",
      targetId: scheduleId,
      after: { contractId, isPaused },
    });

    return this.present(updated);
  }

  async remove(contractId: string, scheduleId: string, actorId: string) {
    await this.reports.assertOwnsContract(actorId, contractId);
    const [removed] = await this.db
      .delete(reportSchedules)
      .where(
        and(
          eq(reportSchedules.scheduleId, scheduleId),
          eq(reportSchedules.contractId, contractId),
        ),
      )
      .returning({ scheduleId: reportSchedules.scheduleId });

    if (!removed) throw new NotFoundException("Schedule not found");
    return { scheduleId: removed.scheduleId, removed: true };
  }

  async sendDue(): Promise<string[]> {
    const now = this.clock.now();
    const due = await this.db
      .select()
      .from(reportSchedules)
      .where(
        and(
          eq(reportSchedules.isPaused, false),
          lte(reportSchedules.nextRunAt, now),
        ),
      )
      .orderBy(asc(reportSchedules.nextRunAt));

    const sent: string[] = [];

    for (const schedule of due) {
      try {
        const summary = await this.summaryFor(schedule);
        await this.notifications.queuedFanout(
          [schedule.recipientId],
          "GENERIC",
          {
            title: `Your ${schedule.cadence.toLowerCase()} ${this.label(schedule.reportType)}`,
            body: summary,
          },
          this.liveLinkFor(schedule),
          undefined,
          `report-schedule:${schedule.scheduleId}:${schedule.nextRunAt.getTime()}`,
        );
        sent.push(schedule.scheduleId);
      } catch (err) {
        this.logger.error(
          `Scheduled report ${schedule.scheduleId} failed`,
          err,
        );
      }

      const everyDays = CADENCE_DAYS[schedule.cadence] ?? 7;
      await this.db
        .update(reportSchedules)
        .set({
          lastRunAt: now,
          nextRunAt: new Date(now.getTime() + everyDays * MILLIS_PER_DAY),
          updatedAt: now,
        })
        .where(eq(reportSchedules.scheduleId, schedule.scheduleId));
    }

    return sent;
  }

  private async summaryFor(
    schedule: typeof reportSchedules.$inferSelect,
  ): Promise<string> {
    if (schedule.reportType === "attendance") {
      const rows = await this.reports.attendanceReport(
        schedule.contractId,
        schedule.subGroupId ?? undefined,
      );
      if (rows.length === 0) return "No students on this contract yet.";
      const withPercent = rows.filter((r) => r.attendancePercent !== null);
      const average =
        withPercent.length === 0
          ? null
          : Math.round(
              withPercent.reduce(
                (total, r) => total + (r.attendancePercent ?? 0),
                0,
              ) / withPercent.length,
            );
      return `${rows.length} students. Average attendance ${
        average === null ? "not yet measurable" : `${average}%`
      }.`;
    }

    const rows = await this.reports.testPerformanceReport(
      schedule.contractId,
      schedule.subGroupId ?? undefined,
    );
    if (rows.length === 0) return "No students on this contract yet.";
    const withScore = rows.filter((r) => r.averageScorePercent !== null);
    const average =
      withScore.length === 0
        ? null
        : Math.round(
            withScore.reduce(
              (total, r) => total + (r.averageScorePercent ?? 0),
              0,
            ) / withScore.length,
          );
    return `${rows.length} students. Average score ${
      average === null ? "not yet measurable" : `${average}%`
    }.`;
  }

  private liveLinkFor(
    schedule: typeof reportSchedules.$inferSelect,
  ): string {
    const base = `/corporate/contracts/${schedule.contractId}/reports/${schedule.reportType}`;
    return schedule.subGroupId
      ? `${base}?subGroupId=${schedule.subGroupId}`
      : base;
  }

  private label(reportType: string): string {
    return reportType === "attendance"
      ? "attendance summary"
      : "test performance summary";
  }

  private present(row: typeof reportSchedules.$inferSelect) {
    return {
      scheduleId: row.scheduleId,
      contractId: row.contractId,
      reportType: row.reportType,
      subGroupId: row.subGroupId,
      cadence: row.cadence,
      isPaused: row.isPaused,
      nextRunAt: row.nextRunAt.toISOString(),
      lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
      liveLink: this.liveLinkFor(row),
    };
  }
}
