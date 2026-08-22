import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { toDayString } from "../common/day";
import { and, eq, gte, lt, sum } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  batchEnrollments,
  parentLinks,
  studyTimeDailyTotals,
  weeklyReportCards,
} from "../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../jobs/job-queue";
import { NotificationsService } from "../notifications/notifications.service";

type Db = PostgresJsDatabase<typeof schema>;

const REPORT_CARD_JOB = "habits.report-card.weekly";
const EVERY_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 86_400_000;

@Injectable()
export class ReportCardService implements OnModuleInit {
  private readonly logger = new Logger(ReportCardService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      REPORT_CARD_JOB,
      async () => {
        await this.generateDue();
      },
      EVERY_HOUR,
      (err) => this.logger.error("Weekly report card job failed", err),
    );
  }

  async generateDue(): Promise<string[]> {
    const weekStart = this.lastWeekStart();
    const weekEnd = addDays(weekStart, 7);

    const enrollments = await this.db
      .selectDistinct({ userId: batchEnrollments.userId })
      .from(batchEnrollments);

    const generated: string[] = [];

    for (const { userId } of enrollments) {
      try {
        const reportId = await this.generateForUser(userId, weekStart, weekEnd);
        if (reportId) generated.push(reportId);
      } catch (err) {
        this.logger.error(`Report card failed for ${userId}`, err);
      }
    }

    return generated;
  }

  private async generateForUser(
    userId: string,
    weekStart: string,
    weekEnd: string,
  ): Promise<string | null> {
    const now = this.clock.now();

    const dailyRows = await this.db
      .select({
        day: studyTimeDailyTotals.day,
        subjectId: studyTimeDailyTotals.subjectId,
        seconds: sum(studyTimeDailyTotals.seconds).mapWith(Number),
      })
      .from(studyTimeDailyTotals)
      .where(
        and(
          eq(studyTimeDailyTotals.userId, userId),
          gte(studyTimeDailyTotals.day, weekStart),
          lt(studyTimeDailyTotals.day, weekEnd),
        ),
      )
      .groupBy(studyTimeDailyTotals.day, studyTimeDailyTotals.subjectId);

    const totalSeconds = dailyRows.reduce(
      (acc, r) => acc + (r.seconds ?? 0),
      0,
    );
    const hadActivity = totalSeconds > 0;

    const byDay: Record<string, number> = {};
    const bySubject: Record<string, number> = {};
    for (const row of dailyRows) {
      const dayKey = toDayString(row.day);
      byDay[dayKey] = (byDay[dayKey] ?? 0) + (row.seconds ?? 0);
      const key = row.subjectId ?? "unknown";
      bySubject[key] = (bySubject[key] ?? 0) + (row.seconds ?? 0);
    }

    const summary = hadActivity
      ? `You studied for ${Math.round(totalSeconds / 60)} minutes this week.`
      : "No study activity recorded this week.";

    const payload: Record<string, unknown> = {
      weekStart,
      weekEnd,
      totalSeconds,
      byDay,
      bySubject,
      summary,
    };

    const [inserted] = await this.db
      .insert(weeklyReportCards)
      .values({
        userId,
        weekStart,
        payload,
        hadActivity,
        generatedAt: now,
        recipientCount: 0,
      })
      .onConflictDoNothing()
      .returning();

    if (!inserted) {
      return null;
    }

    const parentRows = await this.db
      .select({ parentUserId: parentLinks.parentUserId })
      .from(parentLinks)
      .where(
        and(
          eq(parentLinks.studentUserId, userId),
          eq(parentLinks.status, "ACTIVE"),
        ),
      );

    const recipients = [userId, ...parentRows.map((r) => r.parentUserId)];

    for (const recipientId of recipients) {
      await this.notifications.notify({
        userId: recipientId,
        type: "WEEKLY_REPORT_CARD",
        vars: { summary },
        link: `/habits/report/${inserted.reportId}`,
        dedupeKey: `weekly-report:${inserted.reportId}:${recipientId}`,
      });
    }

    await this.db
      .update(weeklyReportCards)
      .set({ sentAt: this.clock.now(), recipientCount: recipients.length })
      .where(eq(weeklyReportCards.reportId, inserted.reportId));

    return inserted.reportId;
  }

  private lastWeekStart(): string {
    const now = this.clock.now();
    const dayOfWeek = now.getUTCDay();
    const daysFromMonday = (dayOfWeek + 6) % 7;
    const startOfThisWeekMs =
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      ) -
      daysFromMonday * MS_PER_DAY;
    const weekStartMs = startOfThisWeekMs - 7 * MS_PER_DAY;
    return new Date(weekStartMs).toISOString().slice(0, 10);
  }
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
