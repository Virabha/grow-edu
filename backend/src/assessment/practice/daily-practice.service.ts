import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../../common/clock';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '../../database/schema';
import {
  assessmentPracticeSets,
  assessmentQuestions,
  assessmentTestQuestions,
  assessmentTests,
  assessmentWeakTopics,
} from '../../database/schema';
import { effectiveDifficultyExpr } from '../shared/difficulty';
import { GenerationService } from './generation.service';

export interface DailySetView {
  setId: string;
  testId: string;
  forDate: string;
  isNew: boolean;
}

@Injectable()
export class DailyPracticeService {
  private static readonly DAILY_COUNT = 10;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly generation: GenerationService,
  ) {}

  async getOrCreate(userId: string, batchId: string): Promise<DailySetView> {
    const forDate = this.clock.now().toISOString().slice(0, 10);

    const [existing] = await this.db
      .select()
      .from(assessmentPracticeSets)
      .where(
        and(
          eq(assessmentPracticeSets.userId, userId),
          eq(assessmentPracticeSets.kind, 'DAILY'),
          eq(assessmentPracticeSets.forDate, forDate),
        ),
      )
      .limit(1);

    if (existing) {
      return {
        setId: existing.setId,
        testId: existing.testId,
        forDate,
        isNew: false,
      };
    }

    const topicIds = await this.batchTopics(batchId);
    if (topicIds.length === 0) {
      throw new NotFoundException(
        'No topics found for this batch — add questions to a batch test first',
      );
    }

    const topicCounts = await this.computeTopicCounts(
      userId,
      topicIds,
      DailyPracticeService.DAILY_COUNT,
    );

    const difficultyCounts = await this.computeDifficultyCounts(
      topicIds,
      DailyPracticeService.DAILY_COUNT,
    );

    const recentlySeen = await this.generation.recentlyServedIds(userId);

    const generated = await this.generation.generate(
      { topicCounts, difficultyCounts, excludeRetired: true, excludeQuestionIds: recentlySeen },
      userId,
      batchId,
    );

    const now = this.clock.now();
    const [practiceSet] = await this.db
      .insert(assessmentPracticeSets)
      .values({
        userId,
        kind: 'DAILY',
        batchId,
        forDate,
        testId: generated.testId,
        createdAt: now,
      })
      .returning();

    return {
      setId: practiceSet.setId,
      testId: generated.testId,
      forDate,
      isNew: true,
    };
  }

  private async batchTopics(batchId: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ topicId: assessmentQuestions.topicId })
      .from(assessmentTests)
      .innerJoin(
        assessmentTestQuestions,
        eq(assessmentTestQuestions.testId, assessmentTests.testId),
      )
      .innerJoin(
        assessmentQuestions,
        eq(assessmentQuestions.questionId, assessmentTestQuestions.questionId),
      )
      .where(
        and(
          eq(assessmentTests.batchId, batchId),
          eq(assessmentTests.isDeleted, false),
          eq(assessmentQuestions.isRetired, false),
        ),
      )
      .orderBy(asc(assessmentQuestions.topicId));

    return rows.map((r) => r.topicId);
  }

  private async computeTopicCounts(
    userId: string,
    topicIds: string[],
    total: number,
  ): Promise<{ topicId: string; count: number }[]> {
    const weakRows = await this.db
      .select({ topicId: assessmentWeakTopics.topicId })
      .from(assessmentWeakTopics)
      .where(eq(assessmentWeakTopics.userId, userId));

    const weakSet = new Set(weakRows.map((w) => w.topicId));

    const weights = topicIds.map((topicId) => ({
      topicId,
      weight: weakSet.has(topicId) ? 2 : 1,
    }));

    const totalWeight = weights.reduce((s, w) => s + w.weight, 0);

    const counts = weights.map((w) => ({
      topicId: w.topicId,
      count: Math.floor((total * w.weight) / totalWeight),
    }));

    const allocated = counts.reduce((s, c) => s + c.count, 0);
    const remainder = total - allocated;

    for (let i = 0; i < remainder; i += 1) {
      counts[i % counts.length].count += 1;
    }

    return counts.filter((c) => c.count > 0);
  }

  private async computeDifficultyCounts(
    topicIds: string[],
    total: number,
  ): Promise<{ ordinal: number; count: number }[]> {
    const reviewable = or(
      isNull(assessmentQuestions.reviewStatus),
      eq(assessmentQuestions.reviewStatus, 'APPROVED'),
    );
    const available = await this.db
      .selectDistinct({ ordinal: effectiveDifficultyExpr() })
      .from(assessmentQuestions)
      .where(
        and(
          inArray(assessmentQuestions.topicId, topicIds),
          eq(assessmentQuestions.isRetired, false),
          isNull(assessmentQuestions.groupId),
          ...(reviewable ? [reviewable] : []),
        ),
      );

    if (available.length === 0) {
      throw new ConflictException(
        'No active questions found for the batch topics',
      );
    }

    const ordinals = available
      .map((r) => Number(r.ordinal))
      .sort((left, right) => left - right);
    const perLevel = Math.floor(total / ordinals.length);
    const remainder = total - perLevel * ordinals.length;

    return ordinals.map((ordinal, i) => ({
      ordinal,
      count: perLevel + (i < remainder ? 1 : 0),
    }));
  }
}
