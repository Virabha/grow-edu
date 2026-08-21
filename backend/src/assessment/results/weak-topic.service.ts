import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assessmentAttemptAnswers,
  assessmentAttempts,
  assessmentQuestions,
  assessmentWeakTopics,
} from "../../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../../jobs/job-queue";
import { TaxonomyService } from "../taxonomy/taxonomy.service";

export const WEAK_TOPIC_JOB = "assessment.weak-topic-map";
const REPEAT_INTERVAL_MS = 24 * 60 * 60 * 1_000;

@Injectable()
export class WeakTopicService implements OnModuleInit {
  private readonly logger = new Logger(WeakTopicService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    private readonly taxonomyService: TaxonomyService,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      WEAK_TOPIC_JOB,
      () => this.runJob(),
      REPEAT_INTERVAL_MS,
      (err) => this.logger.error("Failed to schedule weak-topic job", err),
    );
  }

  async runJob(): Promise<void> {
    const { parentOf } = await this.taxonomyService.hierarchy();

    const rows = await this.db
      .select({
        userId: assessmentAttempts.userId,
        topicId: assessmentQuestions.topicId,
        subTopicId: assessmentQuestions.subTopicId,
        isCorrect: assessmentAttemptAnswers.isCorrect,
      })
      .from(assessmentAttemptAnswers)
      .innerJoin(
        assessmentAttempts,
        eq(assessmentAttemptAnswers.attemptId, assessmentAttempts.attemptId),
      )
      .innerJoin(
        assessmentQuestions,
        eq(assessmentAttemptAnswers.questionId, assessmentQuestions.questionId),
      )
      .where(
        and(
          ne(assessmentAttempts.status, "IN_PROGRESS"),
          eq(assessmentAttemptAnswers.isSkipped, false),
          isNotNull(assessmentAttemptAnswers.isCorrect),
        ),
      );

    type TallyKey = string;
    const tally = new Map<
      TallyKey,
      { userId: string; topicId: string; attempted: number; correct: number }
    >();

    for (const row of rows) {
      const effectiveTopicId = this.resolveTopicId(
        row.topicId,
        row.subTopicId,
        parentOf,
      );
      if (!effectiveTopicId) continue;

      const key: TallyKey = `${row.userId}:${effectiveTopicId}`;
      const entry = tally.get(key) ?? {
        userId: row.userId,
        topicId: effectiveTopicId,
        attempted: 0,
        correct: 0,
      };
      entry.attempted += 1;
      if (row.isCorrect) entry.correct += 1;
      tally.set(key, entry);
    }

    if (tally.size === 0) return;

    const now = this.clock.now();

    for (const entry of tally.values()) {
      const accuracy = entry.attempted > 0 ? entry.correct / entry.attempted : 0;

      await this.db
        .insert(assessmentWeakTopics)
        .values({
          userId: entry.userId,
          topicId: entry.topicId,
          attempted: entry.attempted,
          correct: entry.correct,
          accuracy: accuracy.toFixed(4),
          computedAt: now,
        })
        .onConflictDoUpdate({
          target: [assessmentWeakTopics.userId, assessmentWeakTopics.topicId],
          set: {
            attempted: entry.attempted,
            correct: entry.correct,
            accuracy: accuracy.toFixed(4),
            computedAt: now,
          },
        });
    }
  }

  async forUser(
    userId: string,
  ): Promise<
    {
      topicId: string;
      topicName: string;
      attempted: number;
      correct: number;
      accuracy: number;
    }[]
  > {
    const entries = await this.db
      .select()
      .from(assessmentWeakTopics)
      .where(eq(assessmentWeakTopics.userId, userId));

    if (entries.length === 0) return [];

    const topicIds = entries.map((e) => e.topicId);

    const nameOf = await this.taxonomyService.namesForIds(topicIds);

    return entries.map((entry) => ({
      topicId: entry.topicId,
      topicName: nameOf.get(entry.topicId) ?? entry.topicId,
      attempted: entry.attempted,
      correct: entry.correct,
      accuracy: Number(entry.accuracy),
    }));
  }

  private resolveTopicId(
    topicId: string,
    subTopicId: string | null,
    parentOf: Map<string, string | null>,
  ): string | null {
    if (subTopicId) {
      const parent = parentOf.get(subTopicId);
      if (parent) return parent;
    }
    return topicId;
  }
}
