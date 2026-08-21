import { Inject, Injectable } from "@nestjs/common";
import { and, inArray, ne, sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assessmentAttemptAnswers,
  assessmentAttempts,
  assessmentTestStats,
} from "../../database/schema";

export interface PerQuestionStat {
  meanSeconds: number;
  nonSkippedCount: number;
}

export interface CohortFigures {
  perQuestion: Record<string, PerQuestionStat>;
  topAttemptId: string | null;
  topScore: number | null;
  scores: number[];
}

@Injectable()
export class CohortStatsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async getStats(testId: string): Promise<CohortFigures> {
    const cached = await this.db
      .select()
      .from(assessmentTestStats)
      .where(eq(assessmentTestStats.testId, testId))
      .limit(1);

    if (cached.length === 0) {
      return this.computeAndCache(testId);
    }

    const [staleCheck] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(assessmentAttempts)
      .where(
        and(
          eq(assessmentAttempts.testId, testId),
          ne(assessmentAttempts.status, "IN_PROGRESS"),
          sql`${assessmentAttempts.updatedAt} > ${cached[0].computedAt}`,
        ),
      );

    if (staleCheck.count > 0) {
      return this.computeAndCache(testId);
    }

    return this.parseFigures(cached[0].figures);
  }

  private async computeAndCache(testId: string): Promise<CohortFigures> {
    const completedAttempts = await this.db
      .select()
      .from(assessmentAttempts)
      .where(
        and(
          eq(assessmentAttempts.testId, testId),
          ne(assessmentAttempts.status, "IN_PROGRESS"),
        ),
      );

    if (completedAttempts.length === 0) {
      return { perQuestion: {}, topAttemptId: null, topScore: null, scores: [] };
    }

    const attemptIds = completedAttempts.map((a) => a.attemptId);

    const answers = await this.db
      .select()
      .from(assessmentAttemptAnswers)
      .where(inArray(assessmentAttemptAnswers.attemptId, attemptIds));

    const perPlacement = new Map<
      string,
      { totalSeconds: number; count: number }
    >();

    for (const answer of answers) {
      if (answer.isSkipped) continue;
      const current = perPlacement.get(answer.placementId) ?? {
        totalSeconds: 0,
        count: 0,
      };
      current.totalSeconds += answer.elapsedSeconds;
      current.count += 1;
      perPlacement.set(answer.placementId, current);
    }

    const perQuestion: Record<string, PerQuestionStat> = {};
    for (const [placementId, stats] of perPlacement) {
      perQuestion[placementId] = {
        meanSeconds:
          stats.count > 0 ? stats.totalSeconds / stats.count : 0,
        nonSkippedCount: stats.count,
      };
    }

    let topAttemptId: string | null = null;
    let topScore: number | null = null;
    const scores: number[] = [];

    for (const attempt of completedAttempts) {
      const score =
        attempt.finalScore !== null
          ? Number(attempt.finalScore)
          : attempt.provisionalScore !== null
            ? Number(attempt.provisionalScore)
            : 0;
      scores.push(score);

      if (topScore === null || score > topScore) {
        topScore = score;
        topAttemptId = attempt.attemptId;
      }
    }

    const figures: CohortFigures = {
      perQuestion,
      topAttemptId,
      topScore,
      scores,
    };

    const now = this.clock.now();

    await this.db.delete(assessmentTestStats).where(
      eq(assessmentTestStats.testId, testId),
    );

    const figuresToStore: Record<string, unknown> = {
      perQuestion: figures.perQuestion,
      topAttemptId: figures.topAttemptId,
      topScore: figures.topScore,
      scores: figures.scores,
    };

    await this.db.insert(assessmentTestStats).values({
      testId,
      figures: figuresToStore,
      computedAt: now,
    });

    return figures;
  }

  private parseFigures(raw: Record<string, unknown>): CohortFigures {
    const perQuestion =
      (raw["perQuestion"] as Record<string, PerQuestionStat>) ?? {};
    const topAttemptId =
      typeof raw["topAttemptId"] === "string" ? raw["topAttemptId"] : null;
    const topScore =
      typeof raw["topScore"] === "number" ? raw["topScore"] : null;
    const scores = Array.isArray(raw["scores"])
      ? (raw["scores"] as number[])
      : [];
    return { perQuestion, topAttemptId, topScore, scores };
  }
}
