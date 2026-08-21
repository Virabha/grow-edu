import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../../common/clock';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '../../database/schema';
import {
  assessmentAttemptAnswers,
  assessmentDifficultyLevels,
  assessmentQuestions,
} from '../../database/schema';
import { JOB_QUEUE, JobQueue, registerAndRepeat } from '../../jobs/job-queue';
import { CALIBRATION_THRESHOLD } from '../shared/difficulty';

export const CALIBRATION_JOB = 'assessment.difficulty.calibrate';
export { CALIBRATION_THRESHOLD };
const REPEAT_INTERVAL_MS = 60 * 60 * 1000;

export interface DivergentQuestion {
  questionId: string;
  authoredDifficulty: number;
  observedDifficulty: number;
  divergence: number;
}

@Injectable()
export class DifficultyCalibrationService implements OnModuleInit {
  private readonly logger = new Logger(DifficultyCalibrationService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      CALIBRATION_JOB,
      () => this.recalibrate(),
      REPEAT_INTERVAL_MS,
      (err) => this.logger.error('Failed to schedule calibration job', err),
    );
  }

  async recalibrate(): Promise<void> {
    const levels = await this.db
      .select({ ordinal: assessmentDifficultyLevels.ordinal })
      .from(assessmentDifficultyLevels)
      .orderBy(asc(assessmentDifficultyLevels.ordinal));

    if (levels.length === 0) return;

    const minOrdinal = levels[0].ordinal;
    const maxOrdinal = levels[levels.length - 1].ordinal;

    const stats = await this.db
      .select({
        questionId: assessmentAttemptAnswers.questionId,
        total: sql<number>`count(*)::int`,
        correct: sql<number>`count(*) filter (where ${assessmentAttemptAnswers.isCorrect} = true)::int`,
      })
      .from(assessmentAttemptAnswers)
      .where(isNotNull(assessmentAttemptAnswers.isCorrect))
      .groupBy(assessmentAttemptAnswers.questionId);

    const now = this.clock.now();

    for (const stat of stats) {
      if (stat.total < CALIBRATION_THRESHOLD) {
        await this.db
          .update(assessmentQuestions)
          .set({
            observedAttemptCount: stat.total,
            observedDifficulty: null,
            updatedAt: now,
          })
          .where(eq(assessmentQuestions.questionId, stat.questionId));
        continue;
      }

      const accuracy = stat.correct / stat.total;
      const observed =
        minOrdinal + (1 - accuracy) * (maxOrdinal - minOrdinal);

      await this.db
        .update(assessmentQuestions)
        .set({
          observedAttemptCount: stat.total,
          observedDifficulty: observed.toFixed(3),
          updatedAt: now,
        })
        .where(eq(assessmentQuestions.questionId, stat.questionId));
    }
  }

  async divergent(threshold = 0.5): Promise<DivergentQuestion[]> {
    const rows = await this.db
      .select()
      .from(assessmentQuestions)
      .where(
        and(
          isNotNull(assessmentQuestions.observedDifficulty),
          sql`ABS(${assessmentQuestions.observedDifficulty}::numeric - ${assessmentQuestions.authoredDifficulty}) > ${threshold}`,
        ),
      )
      .orderBy(
        desc(
          sql`ABS(${assessmentQuestions.observedDifficulty}::numeric - ${assessmentQuestions.authoredDifficulty})`,
        ),
      );

    return rows.map((q) => ({
      questionId: q.questionId,
      authoredDifficulty: q.authoredDifficulty,
      observedDifficulty: Number(q.observedDifficulty),
      divergence: Math.abs(
        Number(q.observedDifficulty) - q.authoredDifficulty,
      ),
    }));
  }
}
