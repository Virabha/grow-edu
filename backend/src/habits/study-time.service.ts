import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, isNull, sql, sum } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  studyTimeDailyTotals,
  studyTimeSessions,
} from "../database/schema";
import { STUDY_HABITS_SETTINGS_GROUP } from "../settings/settings.definitions";
import { SettingsService } from "../settings/settings.service";
import { RecordActivityDto } from "./dto/record-activity.dto";

type Db = PostgresJsDatabase<typeof schema>;

@Injectable()
export class StudyTimeService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly settings: SettingsService,
  ) {}

  async recordActivity(
    userId: string,
    dto: RecordActivityDto,
  ): Promise<{ accruedSeconds: number; sessionId: string }> {
    const now = this.clock.now();
    const cutoffSeconds = await this.cutoff();

    const batchId = dto.batchId ?? null;
    const subjectId = dto.subjectId ?? null;
    const lessonId = dto.lessonId ?? null;

    const [open] = await this.db
      .select()
      .from(studyTimeSessions)
      .where(
        and(
          eq(studyTimeSessions.userId, userId),
          isNull(studyTimeSessions.closedAt),
        ),
      )
      .orderBy(studyTimeSessions.lastEventAt)
      .limit(1);

    if (!open) {
      const [created] = await this.db
        .insert(studyTimeSessions)
        .values({
          userId,
          batchId,
          subjectId,
          lessonId,
          startedAt: now,
          lastEventAt: now,
          accruedSeconds: 0,
        })
        .returning();
      return { accruedSeconds: 0, sessionId: created.studySessionId };
    }

    const gapSeconds = Math.floor(
      (now.getTime() - open.lastEventAt.getTime()) / 1000,
    );

    const sameContext =
      open.batchId === batchId &&
      open.subjectId === subjectId &&
      open.lessonId === lessonId;

    if (gapSeconds > cutoffSeconds || !sameContext) {
      await this.db
        .update(studyTimeSessions)
        .set({ closedAt: now })
        .where(eq(studyTimeSessions.studySessionId, open.studySessionId));

      const [created] = await this.db
        .insert(studyTimeSessions)
        .values({
          userId,
          batchId,
          subjectId,
          lessonId,
          startedAt: now,
          lastEventAt: now,
          accruedSeconds: 0,
        })
        .returning();
      return { accruedSeconds: 0, sessionId: created.studySessionId };
    }

    const newAccrued = open.accruedSeconds + gapSeconds;
    await this.db
      .update(studyTimeSessions)
      .set({ lastEventAt: now, accruedSeconds: newAccrued })
      .where(eq(studyTimeSessions.studySessionId, open.studySessionId));

    const day = now.toISOString().slice(0, 10);
    await this.rollDailyTotal(userId, batchId, subjectId, day, gapSeconds);

    return { accruedSeconds: newAccrued, sessionId: open.studySessionId };
  }

  async getDailyTotal(userId: string, day: string): Promise<number> {
    const rows = await this.db
      .select({ seconds: studyTimeDailyTotals.seconds })
      .from(studyTimeDailyTotals)
      .where(
        and(
          eq(studyTimeDailyTotals.userId, userId),
          eq(studyTimeDailyTotals.day, day),
        ),
      );
    return rows.reduce((acc, r) => acc + r.seconds, 0);
  }

  async getSummary(
    userId: string,
    opts: { days?: number; batchId?: string },
  ): Promise<{
    totalSeconds: number;
    bySubject: { subjectId: string | null; seconds: number }[];
  }> {
    const days = opts.days ?? 7;
    const cutoffDate = new Date(this.clock.now().getTime() - days * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const conditions = [
      eq(studyTimeDailyTotals.userId, userId),
      gte(studyTimeDailyTotals.day, cutoffDate),
    ];
    if (opts.batchId) {
      conditions.push(eq(studyTimeDailyTotals.batchId, opts.batchId));
    }

    const rows = await this.db
      .select({
        subjectId: studyTimeDailyTotals.subjectId,
        seconds: sum(studyTimeDailyTotals.seconds).mapWith(Number),
      })
      .from(studyTimeDailyTotals)
      .where(and(...conditions))
      .groupBy(studyTimeDailyTotals.subjectId);

    const totalSeconds = rows.reduce((acc, r) => acc + (r.seconds ?? 0), 0);
    return {
      totalSeconds,
      bySubject: rows.map((r) => ({
        subjectId: r.subjectId,
        seconds: r.seconds ?? 0,
      })),
    };
  }

  async getTotalStudyMinutes(userId: string): Promise<number> {
    const rows = await this.db
      .select({ seconds: sum(studyTimeDailyTotals.seconds).mapWith(Number) })
      .from(studyTimeDailyTotals)
      .where(eq(studyTimeDailyTotals.userId, userId));
    const total = rows[0]?.seconds ?? 0;
    return Math.floor(total / 60);
  }

  private async rollDailyTotal(
    userId: string,
    batchId: string | null,
    subjectId: string | null,
    day: string,
    seconds: number,
  ): Promise<void> {
    const now = this.clock.now();

    if (batchId !== null && subjectId !== null) {
      await this.db
        .insert(studyTimeDailyTotals)
        .values({
          userId,
          day,
          batchId,
          subjectId,
          seconds,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            studyTimeDailyTotals.userId,
            studyTimeDailyTotals.day,
            studyTimeDailyTotals.batchId,
            studyTimeDailyTotals.subjectId,
          ],
          set: {
            seconds: sql`${studyTimeDailyTotals.seconds} + ${seconds}`,
            updatedAt: now,
          },
        });
      return;
    }

    const existing = await this.db
      .select()
      .from(studyTimeDailyTotals)
      .where(
        and(
          eq(studyTimeDailyTotals.userId, userId),
          eq(studyTimeDailyTotals.day, day),
          batchId === null
            ? isNull(studyTimeDailyTotals.batchId)
            : eq(studyTimeDailyTotals.batchId, batchId),
          subjectId === null
            ? isNull(studyTimeDailyTotals.subjectId)
            : eq(studyTimeDailyTotals.subjectId, subjectId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(studyTimeDailyTotals)
        .set({
          seconds: existing[0].seconds + seconds,
          updatedAt: now,
        })
        .where(eq(studyTimeDailyTotals.totalId, existing[0].totalId));
    } else {
      await this.db.insert(studyTimeDailyTotals).values({
        userId,
        day,
        batchId,
        subjectId,
        seconds,
        updatedAt: now,
      });
    }
  }

  private async cutoff(): Promise<number> {
    const group = await this.settings.getGroup(STUDY_HABITS_SETTINGS_GROUP);
    const v = Number(group.values.inactivityCutoffSeconds);
    return Number.isFinite(v) && v > 0 ? v : 300;
  }
}
