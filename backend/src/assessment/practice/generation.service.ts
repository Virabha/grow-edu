import {
  BadRequestException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, eq, inArray, isNull, not } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../../common/clock';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '../../database/schema';
import {
  assessmentQuestions,
  assessmentQuestionsServed,
  assessmentTestQuestions,
  assessmentTests,
} from '../../database/schema';
import { effectiveDifficultyExpr } from '../shared/difficulty';

export interface GenerationCriteria {
  topicCounts: { topicId: string; count: number }[];
  difficultyCounts: { ordinal: number; count: number }[];
  excludeRetired?: boolean;
  excludeQuestionIds?: string[];
}

export interface GenerationShortage {
  topicId: string;
  difficultyOrdinal: number;
  needed: number;
  available: number;
}

export interface GeneratedSet {
  testId: string;
  questionCount: number;
}

@Injectable()
export class GenerationService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async generate(
    criteria: GenerationCriteria,
    actorId: string,
    batchId?: string,
  ): Promise<GeneratedSet> {
    const topicTotal = criteria.topicCounts.reduce((s, tc) => s + tc.count, 0);
    const diffTotal = criteria.difficultyCounts.reduce(
      (s, dc) => s + dc.count,
      0,
    );

    if (topicTotal !== diffTotal) {
      throw new BadRequestException(
        `Topic total (${topicTotal}) must equal difficulty total (${diffTotal})`,
      );
    }

    const total = topicTotal;
    const cells = this.computeCells(
      criteria.topicCounts,
      criteria.difficultyCounts,
      total,
    );

    const excludeIds = criteria.excludeQuestionIds ?? [];
    const shortages: GenerationShortage[] = [];
    const selected: string[] = [];

    for (const cell of cells) {
      if (cell.count === 0) continue;

      const baseConditions = [
        eq(assessmentQuestions.topicId, cell.topicId),
        eq(effectiveDifficultyExpr(), cell.ordinal),
        eq(assessmentQuestions.isRetired, false),
        isNull(assessmentQuestions.groupId),
      ];

      const allExcluded = [...excludeIds];
      if (allExcluded.length > 0) {
        baseConditions.push(
          not(inArray(assessmentQuestions.questionId, allExcluded)),
        );
      }

      const rows = await this.db
        .select({ questionId: assessmentQuestions.questionId })
        .from(assessmentQuestions)
        .where(and(...baseConditions))
        .orderBy(asc(assessmentQuestions.questionId))
        .limit(cell.count);

      if (rows.length < cell.count) {
        shortages.push({
          topicId: cell.topicId,
          difficultyOrdinal: cell.ordinal,
          needed: cell.count,
          available: rows.length,
        });
      } else {
        selected.push(...rows.map((r) => r.questionId));
      }
    }

    if (shortages.length > 0) {
      throw new UnprocessableEntityException({ shortages });
    }

    const now = this.clock.now();
    const [test] = await this.db
      .insert(assessmentTests)
      .values({
        title: `Generated practice set – ${now.toISOString().slice(0, 10)}`,
        batchId: batchId ?? null,
        durationMinutes: 30,
        maxAttempts: 999,
        publishedAt: now,
        createdBy: actorId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await this.db.insert(assessmentTestQuestions).values(
      selected.map((questionId, index) => ({
        testId: test.testId,
        questionId,
        order: index + 1,
        marks: '1',
        createdAt: now,
        updatedAt: now,
      })),
    );

    return { testId: test.testId, questionCount: selected.length };
  }

  async recentlyServedIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ questionId: assessmentQuestionsServed.questionId })
      .from(assessmentQuestionsServed)
      .where(eq(assessmentQuestionsServed.userId, userId));

    return [...new Set(rows.map((r) => r.questionId))];
  }

  private computeCells(
    topicCounts: { topicId: string; count: number }[],
    difficultyCounts: { ordinal: number; count: number }[],
    total: number,
  ): { topicId: string; ordinal: number; count: number }[] {
    const cells: {
      topicId: string;
      ordinal: number;
      raw: number;
      base: number;
      remainder: number;
    }[] = [];

    for (const tc of topicCounts) {
      for (const dc of difficultyCounts) {
        const raw = (tc.count * dc.count) / total;
        const base = Math.floor(raw);
        cells.push({
          topicId: tc.topicId,
          ordinal: dc.ordinal,
          raw,
          base,
          remainder: raw - base,
        });
      }
    }

    const allocated = cells.reduce((s, c) => s + c.base, 0);
    const remaining = total - allocated;

    cells.sort(
      (a, b) =>
        b.remainder - a.remainder ||
        a.topicId.localeCompare(b.topicId) ||
        a.ordinal - b.ordinal,
    );

    return cells.map((c, i) => ({
      topicId: c.topicId,
      ordinal: c.ordinal,
      count: c.base + (i < remaining ? 1 : 0),
    }));
  }
}
