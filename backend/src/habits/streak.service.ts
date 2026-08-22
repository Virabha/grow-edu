import { Inject, Injectable } from "@nestjs/common";
import { toDayString } from "../common/day";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import { studentStudyGoals, studyStreaks } from "../database/schema";
import { STUDY_HABITS_SETTINGS_GROUP } from "../settings/settings.definitions";
import { SettingsService } from "../settings/settings.service";
import { StudyTimeService } from "./study-time.service";

type Db = PostgresJsDatabase<typeof schema>;

const MS_PER_DAY = 86_400_000;

@Injectable()
export class StreakService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly settings: SettingsService,
    private readonly studyTime: StudyTimeService,
  ) {}

  async getGoal(
    userId: string,
  ): Promise<{ dailyGoalMinutes: number; isDefault: boolean }> {
    const [row] = await this.db
      .select()
      .from(studentStudyGoals)
      .where(eq(studentStudyGoals.userId, userId))
      .limit(1);

    if (row) {
      return { dailyGoalMinutes: row.dailyGoalMinutes, isDefault: false };
    }

    const defaultMinutes = await this.defaultGoalMinutes();
    return { dailyGoalMinutes: defaultMinutes, isDefault: true };
  }

  async setGoal(
    userId: string,
    dailyGoalMinutes: number,
  ): Promise<{ dailyGoalMinutes: number }> {
    const now = this.clock.now();
    await this.db
      .insert(studentStudyGoals)
      .values({ userId, dailyGoalMinutes, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: studentStudyGoals.userId,
        set: { dailyGoalMinutes, updatedAt: now },
      });
    return { dailyGoalMinutes };
  }

  async getStreak(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastQualifyingDay: string | null;
  }> {
    const [row] = await this.db
      .select()
      .from(studyStreaks)
      .where(eq(studyStreaks.userId, userId))
      .limit(1);

    if (!row) {
      return { currentStreak: 0, longestStreak: 0, lastQualifyingDay: null };
    }

    return {
      currentStreak: row.currentStreak,
      longestStreak: row.longestStreak,
      lastQualifyingDay:
        row.lastQualifyingDay === null
          ? null
          : toDayString(row.lastQualifyingDay),
    };
  }

  async evaluateStreak(userId: string): Promise<void> {
    const now = this.clock.now();
    const today = now.toISOString().slice(0, 10);

    const goalData = await this.getGoal(userId);
    const goalSeconds = goalData.dailyGoalMinutes * 60;
    const todaySeconds = await this.studyTime.getDailyTotal(userId, today);

    if (todaySeconds < goalSeconds) {
      return;
    }

    const [existing] = await this.db
      .select()
      .from(studyStreaks)
      .where(eq(studyStreaks.userId, userId))
      .limit(1);

    if (!existing) {
      await this.db.insert(studyStreaks).values({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastQualifyingDay: today,
        updatedAt: now,
      });
      return;
    }

    const lqd = existing.lastQualifyingDay;
    const lastDayStr: string | null = lqd === null ? null : toDayString(lqd);

    if (lastDayStr === today) {
      return;
    }

    const lastDay = lastDayStr
      ? new Date(lastDayStr + "T00:00:00.000Z")
      : null;

    const daysSinceLast = lastDay
      ? Math.round(
          (new Date(today + "T00:00:00.000Z").getTime() - lastDay.getTime()) /
            MS_PER_DAY,
        )
      : null;

    let currentStreak: number;
    if (daysSinceLast === 1) {
      currentStreak = existing.currentStreak + 1;
    } else {
      currentStreak = 1;
    }

    const longestStreak = Math.max(currentStreak, existing.longestStreak);

    await this.db
      .update(studyStreaks)
      .set({
        currentStreak,
        longestStreak,
        lastQualifyingDay: today,
        updatedAt: now,
      })
      .where(eq(studyStreaks.streakId, existing.streakId));
  }

  async getLongestStreak(userId: string): Promise<number> {
    const [row] = await this.db
      .select()
      .from(studyStreaks)
      .where(eq(studyStreaks.userId, userId))
      .limit(1);
    return row?.longestStreak ?? 0;
  }

  private async defaultGoalMinutes(): Promise<number> {
    const group = await this.settings.getGroup(STUDY_HABITS_SETTINGS_GROUP);
    const v = Number(group.values.defaultDailyGoalMinutes);
    return Number.isFinite(v) && v > 0 ? v : 30;
  }
}
