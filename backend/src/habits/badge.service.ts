import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { and, count, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  lessonProgress,
  reviewLogs,
  studentBadges,
  studyTimeDailyTotals,
} from "../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../jobs/job-queue";
import { NotificationsService } from "../notifications/notifications.service";
import { STUDY_HABITS_SETTINGS_GROUP } from "../settings/settings.definitions";
import { SettingsService } from "../settings/settings.service";
import { StreakService } from "./streak.service";
import { StudyTimeService } from "./study-time.service";

type Db = PostgresJsDatabase<typeof schema>;

const BADGE_JOB = "habits.badges.evaluate";
const EVERY_DAY = 24 * 60 * 60 * 1000;

export const BADGE_KEYS = [
  "STUDY_MINUTES_TOTAL",
  "STREAK_DAYS",
  "LESSONS_COMPLETED",
  "REVIEWS_COMPLETED",
] as const;

export type BadgeKey = (typeof BADGE_KEYS)[number];

const BADGE_LABELS: Record<BadgeKey, string> = {
  STUDY_MINUTES_TOTAL: "Study Marathon",
  STREAK_DAYS: "On Fire",
  LESSONS_COMPLETED: "Lesson Master",
  REVIEWS_COMPLETED: "Review Champion",
};

@Injectable()
export class BadgeService implements OnModuleInit {
  private readonly logger = new Logger(BadgeService.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    private readonly settings: SettingsService,
    private readonly studyTime: StudyTimeService,
    private readonly streak: StreakService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      BADGE_JOB,
      async () => {
        await this.evaluateAll();
      },
      EVERY_DAY,
      (err) => this.logger.error("Badge evaluation job failed", err),
    );
  }

  async evaluateBadges(userId: string): Promise<string[]> {
    const criteria = await this.loadCriteria();
    const awarded: string[] = [];

    const checks: Array<{ key: BadgeKey; met: boolean }> = [
      {
        key: "STUDY_MINUTES_TOTAL",
        met:
          (await this.studyTime.getTotalStudyMinutes(userId)) >=
          criteria.badgeStudyMinutesTotal,
      },
      {
        key: "STREAK_DAYS",
        met:
          (await this.streak.getLongestStreak(userId)) >=
          criteria.badgeStreakDays,
      },
      {
        key: "LESSONS_COMPLETED",
        met:
          (await this.lessonsCompleted(userId)) >=
          criteria.badgeLessonsCompleted,
      },
      {
        key: "REVIEWS_COMPLETED",
        met:
          (await this.reviewsCompleted(userId)) >=
          criteria.badgeReviewsCompleted,
      },
    ];

    const now = this.clock.now();

    for (const check of checks) {
      if (!check.met) continue;

      const [inserted] = await this.db
        .insert(studentBadges)
        .values({ userId, badgeKey: check.key, awardedAt: now })
        .onConflictDoNothing()
        .returning();

      if (inserted) {
        awarded.push(check.key);
        await this.notifications.notify({
          userId,
          type: "BADGE_AWARDED",
          vars: { badgeName: BADGE_LABELS[check.key] },
          dedupeKey: `badge:${userId}:${check.key}`,
        });
      }
    }

    return awarded;
  }

  async listBadges(userId: string): Promise<{
    earned: Array<{ badgeKey: string; awardedAt: string }>;
    available: Array<{ badgeKey: string; label: string }>;
  }> {
    const rows = await this.db
      .select()
      .from(studentBadges)
      .where(eq(studentBadges.userId, userId));

    const earnedKeys = new Set(rows.map((r) => r.badgeKey));

    return {
      earned: rows.map((r) => ({
        badgeKey: r.badgeKey,
        awardedAt: r.awardedAt.toISOString(),
      })),
      available: BADGE_KEYS.filter((k) => !earnedKeys.has(k)).map((k) => ({
        badgeKey: k,
        label: BADGE_LABELS[k],
      })),
    };
  }

  private async evaluateAll(): Promise<void> {
    const [fromLessons, fromReviews, fromStudyTime] = await Promise.all([
      this.db.selectDistinct({ userId: lessonProgress.userId }).from(lessonProgress),
      this.db.selectDistinct({ userId: reviewLogs.userId }).from(reviewLogs),
      this.db.selectDistinct({ userId: studyTimeDailyTotals.userId }).from(studyTimeDailyTotals),
    ]);
    const allUserIds = new Set([
      ...fromLessons.map((r) => r.userId),
      ...fromReviews.map((r) => r.userId),
      ...fromStudyTime.map((r) => r.userId),
    ]);
    for (const userId of allUserIds) {
      try {
        await this.evaluateBadges(userId);
      } catch (err) {
        this.logger.error(`Badge evaluation failed for ${userId}`, err);
      }
    }
  }

  private async lessonsCompleted(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.completed, true),
        ),
      );
    return row?.n ?? 0;
  }

  private async reviewsCompleted(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ n: count() })
      .from(reviewLogs)
      .where(eq(reviewLogs.userId, userId));
    return row?.n ?? 0;
  }

  private async loadCriteria(): Promise<{
    badgeStudyMinutesTotal: number;
    badgeStreakDays: number;
    badgeLessonsCompleted: number;
    badgeReviewsCompleted: number;
  }> {
    const group = await this.settings.getGroup(STUDY_HABITS_SETTINGS_GROUP);
    return {
      badgeStudyMinutesTotal:
        Number(group.values.badgeStudyMinutesTotal) || 600,
      badgeStreakDays: Number(group.values.badgeStreakDays) || 7,
      badgeLessonsCompleted: Number(group.values.badgeLessonsCompleted) || 25,
      badgeReviewsCompleted: Number(group.values.badgeReviewsCompleted) || 100,
    };
  }
}
