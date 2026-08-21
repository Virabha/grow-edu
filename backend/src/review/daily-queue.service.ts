import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, isNull, lte } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  assessmentTestQuestions,
  dailyReviewQueueEntries,
  dailyReviewQueues,
  reviewItems,
  reviewLogs,
} from '../database/schema';
import { DailyPracticeService } from '../assessment/practice/daily-practice.service';
import { SchedulerService } from './scheduler.service';
import { SettingsService } from '../settings/settings.service';
import { STUDY_HABITS_SETTINGS_GROUP } from '../settings/settings.definitions';

const DEFAULT_DAILY_REVIEW_SIZE = 20;

@Injectable()
export class DailyQueueService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly scheduler: SchedulerService,
    private readonly dailyPractice: DailyPracticeService,
    private readonly settings: SettingsService,
  ) {}

  async getOrCreate(userId: string, batchId?: string) {
    const today = this.clock.now().toISOString().slice(0, 10);

    const [existing] = await this.db
      .select()
      .from(dailyReviewQueues)
      .where(
        and(
          eq(dailyReviewQueues.userId, userId),
          eq(dailyReviewQueues.queueDate, today),
        ),
      )
      .limit(1);

    if (existing) {
      return this.loadQueue(existing.queueId);
    }

    return this.build(userId, today, batchId);
  }

  async completeEntry(entryId: string, userId: string, outcome?: 'CORRECT' | 'WRONG') {
    const [entry] = await this.db
      .select()
      .from(dailyReviewQueueEntries)
      .where(
        and(
          eq(dailyReviewQueueEntries.entryId, entryId),
          eq(dailyReviewQueueEntries.userId, userId),
        ),
      )
      .limit(1);

    if (!entry) {
      throw new NotFoundException('Queue entry not found');
    }

    if (entry.completedAt) {
      throw new BadRequestException('Entry already completed');
    }

    if (entry.kind === 'REVIEW' && !outcome) {
      throw new BadRequestException('outcome is required for review entries');
    }

    const now = this.clock.now();

    await this.db
      .update(dailyReviewQueueEntries)
      .set({ completedAt: now })
      .where(eq(dailyReviewQueueEntries.entryId, entryId));

    if (entry.kind === 'REVIEW' && outcome) {
      await this.applyReviewOutcome(entry.referenceId, userId, outcome, now);
    }

    return { entryId: entry.entryId, completedAt: now.toISOString() };
  }

  private async applyReviewOutcome(
    reviewItemId: string,
    userId: string,
    outcome: 'CORRECT' | 'WRONG',
    now: Date,
  ): Promise<void> {
    const [item] = await this.db
      .select()
      .from(reviewItems)
      .where(eq(reviewItems.reviewItemId, reviewItemId))
      .limit(1);

    if (!item) return;

    const schedule = this.scheduler.schedule(
      {
        intervalDays: item.intervalDays,
        easeFactor: item.easeFactor,
        repetitionCount: item.repetitionCount,
        lapseCount: item.lapseCount,
      },
      outcome,
      now,
    );

    await this.db
      .update(reviewItems)
      .set({
        intervalDays: schedule.intervalDays,
        easeFactor: schedule.easeFactor,
        repetitionCount: schedule.repetitionCount,
        lapseCount: schedule.lapseCount,
        dueAt: schedule.dueAt,
        lastReviewedAt: now,
        updatedAt: now,
      })
      .where(eq(reviewItems.reviewItemId, reviewItemId));

    await this.db.insert(reviewLogs).values({
      reviewItemId,
      userId,
      outcome,
      previousIntervalDays: item.intervalDays,
      nextIntervalDays: schedule.intervalDays,
      reviewedAt: now,
    });
  }

  private async loadQueue(queueId: string) {
    const [queue] = await this.db
      .select()
      .from(dailyReviewQueues)
      .where(eq(dailyReviewQueues.queueId, queueId))
      .limit(1);

    if (!queue) {
      throw new NotFoundException('Queue not found');
    }

    const entries = await this.db
      .select()
      .from(dailyReviewQueueEntries)
      .where(
        and(
          eq(dailyReviewQueueEntries.queueId, queueId),
          isNull(dailyReviewQueueEntries.completedAt),
        ),
      )
      .orderBy(asc(dailyReviewQueueEntries.ordinal));

    return this.present(queue, entries);
  }

  private async build(userId: string, today: string, batchId?: string) {
    const now = this.clock.now();

    const group = await this.settings.getGroup(STUDY_HABITS_SETTINGS_GROUP);
    const configured = Number(group.values.dailyReviewSize);
    const reviewLimit =
      Number.isFinite(configured) && configured > 0
        ? configured
        : DEFAULT_DAILY_REVIEW_SIZE;

    const dueItems = await this.db
      .select()
      .from(reviewItems)
      .where(
        and(
          eq(reviewItems.userId, userId),
          isNull(reviewItems.retiredAt),
          lte(reviewItems.dueAt, now),
        ),
      )
      .orderBy(asc(reviewItems.dueAt))
      .limit(reviewLimit);

    let practiceSetId: string | null = null;
    let practiceQuestions: { placementId: string; questionId: string }[] = [];

    if (batchId) {
      try {
        const practiceSet = await this.dailyPractice.getOrCreate(userId, batchId);
        practiceSetId = practiceSet.setId;

        practiceQuestions = await this.db
          .select({
            placementId: assessmentTestQuestions.placementId,
            questionId: assessmentTestQuestions.questionId,
          })
          .from(assessmentTestQuestions)
          .where(eq(assessmentTestQuestions.testId, practiceSet.testId))
          .orderBy(asc(assessmentTestQuestions.order));
      } catch (_err) {
        practiceSetId = null;
        practiceQuestions = [];
      }
    }

    const [queue] = await this.db
      .insert(dailyReviewQueues)
      .values({
        userId,
        queueDate: today,
        practiceSetId,
        createdAt: now,
      })
      .returning();

    const entryRows: (typeof dailyReviewQueueEntries.$inferInsert)[] = [];

    dueItems.forEach((item, index) => {
      entryRows.push({
        queueId: queue.queueId,
        userId,
        ordinal: index,
        kind: 'REVIEW',
        referenceId: item.reviewItemId,
        questionId: item.questionId,
      });
    });

    practiceQuestions.forEach((pq, index) => {
      entryRows.push({
        queueId: queue.queueId,
        userId,
        ordinal: dueItems.length + index,
        kind: 'PRACTICE',
        referenceId: pq.placementId,
        questionId: pq.questionId,
      });
    });

    if (entryRows.length > 0) {
      await this.db.insert(dailyReviewQueueEntries).values(entryRows);
    }

    return this.loadQueue(queue.queueId);
  }

  private toDateString(value: unknown): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  private present(
    queue: typeof dailyReviewQueues.$inferSelect,
    entries: (typeof dailyReviewQueueEntries.$inferSelect)[],
  ) {
    return {
      queueId: queue.queueId,
      queueDate: this.toDateString(queue.queueDate),
      practiceSetId: queue.practiceSetId,
      entries: entries.map((e) => ({
        entryId: e.entryId,
        ordinal: e.ordinal,
        kind: e.kind,
        referenceId: e.referenceId,
        questionId: e.questionId,
        completedAt: e.completedAt ? e.completedAt.toISOString() : null,
      })),
    };
  }
}
