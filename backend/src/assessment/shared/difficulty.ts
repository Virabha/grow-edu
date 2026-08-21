import { sql } from "drizzle-orm";

import { assessmentQuestions } from "../../database/schema";

export const CALIBRATION_THRESHOLD = 10;

export interface CalibratableQuestion {
  authoredDifficulty: number;
  observedDifficulty: string | null;
  observedAttemptCount: number;
}

export function effectiveDifficultyOf(question: CalibratableQuestion): number {
  if (
    question.observedAttemptCount >= CALIBRATION_THRESHOLD &&
    question.observedDifficulty !== null
  ) {
    return Math.round(Number(question.observedDifficulty));
  }
  return question.authoredDifficulty;
}

export function effectiveDifficultyExpr() {
  return sql<number>`
    CASE
      WHEN ${assessmentQuestions.observedAttemptCount} >= ${CALIBRATION_THRESHOLD}
        AND ${assessmentQuestions.observedDifficulty} IS NOT NULL
        THEN ROUND(${assessmentQuestions.observedDifficulty}::numeric)::int
      ELSE ${assessmentQuestions.authoredDifficulty}::int
    END
  `;
}
