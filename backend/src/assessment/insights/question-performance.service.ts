import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assessmentAttemptAnswers,
  assessmentAttempts,
  assessmentQuestionVersions,
  assessmentQuestions,
  assessmentTests,
} from "../../database/schema";

export const MIN_ATTEMPTS_FOR_REPORT = 5;
export const DEFAULT_FAILURE_THRESHOLD = 0.7;

export interface QuestionPerformance {
  questionId: string;
  topicId: string;
  authoredDifficulty: number;
  attempts: number;
  correct: number;
  wrong: number;
  skipped: number;
  correctRate: number;
  meanSeconds: number | null;
  optionDistribution: Record<string, number>;
  testsAppearedIn: number;
}

export interface FailedQuestion {
  questionId: string;
  topicId: string;
  attempts: number;
  correct: number;
  failureRate: number;
  batchesSeenIn: number;
  batchesFailedIn: number;
  performancePath: string;
}

interface AnswerFact {
  questionId: string;
  response: unknown;
  elapsedSeconds: number;
  isSkipped: boolean;
  isCorrect: boolean | null;
  testId: string;
  batchId: string | null;
}

@Injectable()
export class QuestionPerformanceService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async forQuestion(questionId: string): Promise<QuestionPerformance> {
    const [question] = await this.db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.questionId, questionId))
      .limit(1);

    if (!question) throw new NotFoundException("Question not found");

    const facts = await this.factsFor([questionId]);

    const attempts = facts.length;
    const correct = facts.filter((fact) => fact.isCorrect === true).length;
    const skipped = facts.filter((fact) => fact.isSkipped).length;
    const wrong = facts.filter(
      (fact) => !fact.isSkipped && fact.isCorrect !== true,
    ).length;

    const timed = facts.filter((fact) => fact.elapsedSeconds > 0);
    const meanSeconds =
      timed.length === 0
        ? null
        : Number(
            (
              timed.reduce((sum, fact) => sum + fact.elapsedSeconds, 0) /
              timed.length
            ).toFixed(2),
          );

    const versions = await this.db
      .select({ options: assessmentQuestionVersions.options })
      .from(assessmentQuestionVersions)
      .where(eq(assessmentQuestionVersions.questionId, questionId));

    const optionDistribution: Record<string, number> = {};
    for (const version of versions) {
      for (const option of version.options) {
        if (!(option.id in optionDistribution)) optionDistribution[option.id] = 0;
      }
    }
    for (const fact of facts) {
      for (const chosen of this.chosenOptionIds(fact.response)) {
        optionDistribution[chosen] = (optionDistribution[chosen] ?? 0) + 1;
      }
    }

    return {
      questionId,
      topicId: question.topicId,
      authoredDifficulty: question.authoredDifficulty,
      attempts,
      correct,
      wrong,
      skipped,
      correctRate: attempts === 0 ? 0 : Number((correct / attempts).toFixed(4)),
      meanSeconds,
      optionDistribution,
      testsAppearedIn: new Set(facts.map((fact) => fact.testId)).size,
    };
  }

  async failedQuestions(options: {
    batchId?: string;
    minAttempts?: number;
    failureThreshold?: number;
  }): Promise<{
    minAttempts: number;
    failureThreshold: number;
    questions: FailedQuestion[];
  }> {
    const minAttempts = options.minAttempts ?? MIN_ATTEMPTS_FOR_REPORT;
    const failureThreshold =
      options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;

    const facts = await this.factsFor(undefined, options.batchId);

    const grouped = new Map<string, AnswerFact[]>();
    for (const fact of facts) {
      const bucket = grouped.get(fact.questionId) ?? [];
      bucket.push(fact);
      grouped.set(fact.questionId, bucket);
    }

    const questionIds = [...grouped.keys()];
    const topics = await this.topicsFor(questionIds);

    const questions: FailedQuestion[] = [];

    for (const [questionId, bucket] of grouped) {
      if (bucket.length < minAttempts) continue;

      const correct = bucket.filter((fact) => fact.isCorrect === true).length;
      const failureRate = 1 - correct / bucket.length;
      if (failureRate < failureThreshold) continue;

      const perBatch = new Map<string, { total: number; correct: number }>();
      for (const fact of bucket) {
        const key = fact.batchId ?? "";
        const tally = perBatch.get(key) ?? { total: 0, correct: 0 };
        tally.total += 1;
        if (fact.isCorrect === true) tally.correct += 1;
        perBatch.set(key, tally);
      }

      const batchesFailedIn = [...perBatch.values()].filter(
        (tally) =>
          tally.total >= minAttempts &&
          1 - tally.correct / tally.total >= failureThreshold,
      ).length;

      questions.push({
        questionId,
        topicId: topics.get(questionId) ?? "",
        attempts: bucket.length,
        correct,
        failureRate: Number(failureRate.toFixed(4)),
        batchesSeenIn: perBatch.size,
        batchesFailedIn,
        performancePath: `/assessment/insights/questions/${questionId}/performance`,
      });
    }

    questions.sort((left, right) => right.failureRate - left.failureRate);

    return { minAttempts, failureThreshold, questions };
  }

  private async factsFor(
    questionIds?: string[],
    batchId?: string,
  ): Promise<AnswerFact[]> {
    if (questionIds && questionIds.length === 0) return [];

    const filters = [
      ne(assessmentAttempts.status, "IN_PROGRESS"),
      ne(assessmentAttemptAnswers.status, "PENDING_GRADING"),
    ];
    if (questionIds) {
      filters.push(inArray(assessmentAttemptAnswers.questionId, questionIds));
    }
    if (batchId) {
      filters.push(eq(assessmentTests.batchId, batchId));
    }

    const rows = await this.db
      .select({
        questionId: assessmentAttemptAnswers.questionId,
        response: assessmentAttemptAnswers.response,
        elapsedSeconds: assessmentAttemptAnswers.elapsedSeconds,
        isSkipped: assessmentAttemptAnswers.isSkipped,
        isCorrect: assessmentAttemptAnswers.isCorrect,
        testId: assessmentAttempts.testId,
        batchId: assessmentTests.batchId,
      })
      .from(assessmentAttemptAnswers)
      .innerJoin(
        assessmentAttempts,
        eq(assessmentAttempts.attemptId, assessmentAttemptAnswers.attemptId),
      )
      .innerJoin(
        assessmentTests,
        eq(assessmentTests.testId, assessmentAttempts.testId),
      )
      .where(and(...filters));

    return rows;
  }

  private async topicsFor(
    questionIds: string[],
  ): Promise<Map<string, string>> {
    if (questionIds.length === 0) return new Map();
    const rows = await this.db
      .select({
        questionId: assessmentQuestions.questionId,
        topicId: assessmentQuestions.topicId,
      })
      .from(assessmentQuestions)
      .where(inArray(assessmentQuestions.questionId, questionIds));
    return new Map(rows.map((row) => [row.questionId, row.topicId]));
  }

  private chosenOptionIds(response: unknown): string[] {
    if (typeof response === "string") return [response];
    if (Array.isArray(response)) {
      return response.filter((entry): entry is string => typeof entry === "string");
    }
    return [];
  }
}
