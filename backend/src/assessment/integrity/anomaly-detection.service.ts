import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { and, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assessmentAnomalyFlags,
  assessmentAttemptAnswers,
  assessmentAttempts,
  assessmentTestQuestions,
} from "../../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../../jobs/job-queue";

const SCAN_JOB = "assessment.integrity.scan";
const SCAN_INTERVAL_MS = 5 * 60 * 1000;
const SCAN_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const MIN_COHORT_SIZE = 3;
const TIMING_OUTLIER_RATIO = 0.3;
const TIMING_OUTLIER_MIN_SCORE_RATIO = 0.5;
const SUBMISSION_PATTERN_RATIO = 0.05;
const IDENTICAL_SEQUENCE_MAX_TOTAL_TIME_RATIO = 1.5;

type AnomalyKind = "TIMING_OUTLIER" | "IDENTICAL_SEQUENCE" | "SUBMISSION_PATTERN";

interface AttemptSummary {
  attemptId: string;
  userId: string;
  provisionalScore: string | null;
  maxScore: string | null;
}

interface AttemptAnswer {
  attemptId: string;
  placementId: string;
  order: number;
  response: unknown;
  elapsedSeconds: number;
}

interface AttemptProfile {
  attemptId: string;
  userId: string;
  scoreRatio: number;
  totalElapsed: number;
  responses: unknown[];
  perQuestionTiming: number[];
}

interface PendingFlag {
  attemptId: string;
  userId: string;
  kind: AnomalyKind;
  reason: string;
  detail: Record<string, unknown>;
}

@Injectable()
export class AnomalyDetectionService implements OnModuleInit {
  private readonly logger = new Logger(AnomalyDetectionService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      SCAN_JOB,
      async () => this.scanRecentTests(),
      SCAN_INTERVAL_MS,
      (err) => this.logger.error("anomaly scan schedule failed", String(err)),
    );
  }

  async scanRecentTests(): Promise<void> {
    const cutoff = new Date(this.clock.now().getTime() - SCAN_LOOKBACK_MS);
    const recent = await this.db
      .selectDistinct({ testId: assessmentAttempts.testId })
      .from(assessmentAttempts)
      .where(
        and(
          isNotNull(assessmentAttempts.submittedAt),
          gte(assessmentAttempts.submittedAt, cutoff),
        ),
      );
    for (const { testId } of recent) {
      await this.scanTest(testId);
    }
  }

  async scanTest(testId: string): Promise<{ flagged: number }> {
    const attempts = await this.loadSubmittedAttempts(testId);
    if (attempts.length < MIN_COHORT_SIZE) return { flagged: 0 };

    const answers = await this.loadAnswers(attempts.map((a) => a.attemptId));
    const profiles = this.buildProfiles(attempts, answers);

    const existingFlags = await this.loadExistingFlagKeys(testId);

    const pending: PendingFlag[] = [
      ...this.detectTimingOutliers(profiles),
      ...this.detectSubmissionPatterns(profiles),
      ...this.detectIdenticalSequences(profiles),
    ];

    let flagged = 0;
    for (const flag of pending) {
      const key = `${flag.attemptId}:${flag.kind}`;
      if (existingFlags.has(key)) continue;
      await this.db.insert(assessmentAnomalyFlags).values({
        attemptId: flag.attemptId,
        testId,
        userId: flag.userId,
        kind: flag.kind,
        reason: flag.reason,
        detail: flag.detail,
      });
      existingFlags.add(key);
      flagged += 1;
    }

    return { flagged };
  }

  async listFlags(
    testId?: string,
    userId?: string,
  ): Promise<(typeof assessmentAnomalyFlags.$inferSelect)[]> {
    const filters = [];
    if (testId) filters.push(eq(assessmentAnomalyFlags.testId, testId));
    if (userId) filters.push(eq(assessmentAnomalyFlags.userId, userId));

    if (filters.length === 0) {
      return this.db.select().from(assessmentAnomalyFlags);
    }
    return this.db
      .select()
      .from(assessmentAnomalyFlags)
      .where(and(...filters));
  }

  private async loadSubmittedAttempts(testId: string): Promise<AttemptSummary[]> {
    return this.db
      .select({
        attemptId: assessmentAttempts.attemptId,
        userId: assessmentAttempts.userId,
        provisionalScore: assessmentAttempts.provisionalScore,
        maxScore: assessmentAttempts.maxScore,
      })
      .from(assessmentAttempts)
      .where(
        and(
          eq(assessmentAttempts.testId, testId),
          isNotNull(assessmentAttempts.submittedAt),
        ),
      );
  }

  private async loadAnswers(attemptIds: string[]): Promise<AttemptAnswer[]> {
    if (attemptIds.length === 0) return [];
    return this.db
      .select({
        attemptId: assessmentAttemptAnswers.attemptId,
        placementId: assessmentAttemptAnswers.placementId,
        order: assessmentTestQuestions.order,
        response: assessmentAttemptAnswers.response,
        elapsedSeconds: assessmentAttemptAnswers.elapsedSeconds,
      })
      .from(assessmentAttemptAnswers)
      .innerJoin(
        assessmentTestQuestions,
        eq(assessmentTestQuestions.placementId, assessmentAttemptAnswers.placementId),
      )
      .where(inArray(assessmentAttemptAnswers.attemptId, attemptIds));
  }

  private buildProfiles(
    attempts: AttemptSummary[],
    answers: AttemptAnswer[],
  ): AttemptProfile[] {
    const byAttempt = new Map<string, AttemptAnswer[]>();
    for (const answer of answers) {
      const bucket = byAttempt.get(answer.attemptId) ?? [];
      bucket.push(answer);
      byAttempt.set(answer.attemptId, bucket);
    }

    return attempts.map((attempt) => {
      const sorted = (byAttempt.get(attempt.attemptId) ?? []).sort(
        (a, b) => a.order - b.order,
      );
      const provisionalScore = parseFloat(attempt.provisionalScore ?? "0");
      const maxScore = parseFloat(attempt.maxScore ?? "0");
      const scoreRatio = maxScore > 0 ? provisionalScore / maxScore : 0;
      const totalElapsed = sorted.reduce((sum, a) => sum + a.elapsedSeconds, 0);

      return {
        attemptId: attempt.attemptId,
        userId: attempt.userId,
        scoreRatio,
        totalElapsed,
        responses: sorted.map((a) => a.response),
        perQuestionTiming: sorted.map((a) => a.elapsedSeconds),
      };
    });
  }

  private detectTimingOutliers(profiles: AttemptProfile[]): PendingFlag[] {
    const times = profiles.map((p) => p.totalElapsed);
    const cohortMedian = this.median(times);
    if (cohortMedian === 0) return [];

    const threshold = cohortMedian * TIMING_OUTLIER_RATIO;
    const flags: PendingFlag[] = [];

    for (const profile of profiles) {
      if (
        profile.totalElapsed < threshold &&
        profile.scoreRatio >= TIMING_OUTLIER_MIN_SCORE_RATIO
      ) {
        flags.push({
          attemptId: profile.attemptId,
          userId: profile.userId,
          kind: "TIMING_OUTLIER",
          reason: `Completed in ${profile.totalElapsed}s, below ${Math.round(TIMING_OUTLIER_RATIO * 100)}% of cohort median (${Math.round(cohortMedian)}s), with score ${Math.round(profile.scoreRatio * 100)}%`,
          detail: {
            totalElapsedSeconds: profile.totalElapsed,
            cohortMedianSeconds: Math.round(cohortMedian),
            thresholdSeconds: Math.round(threshold),
            scorePercent: Math.round(profile.scoreRatio * 100),
            cohortSize: profiles.length,
          },
        });
      }
    }

    return flags;
  }

  private detectSubmissionPatterns(profiles: AttemptProfile[]): PendingFlag[] {
    const times = profiles.map((p) => p.totalElapsed);
    const cohortMedian = this.median(times);
    if (cohortMedian === 0) return [];

    const threshold = cohortMedian * SUBMISSION_PATTERN_RATIO;
    const flags: PendingFlag[] = [];

    for (const profile of profiles) {
      if (profile.totalElapsed < threshold) {
        flags.push({
          attemptId: profile.attemptId,
          userId: profile.userId,
          kind: "SUBMISSION_PATTERN",
          reason: `Submitted with ${profile.totalElapsed}s total engagement, below ${Math.round(SUBMISSION_PATTERN_RATIO * 100)}% of cohort median (${Math.round(cohortMedian)}s)`,
          detail: {
            totalElapsedSeconds: profile.totalElapsed,
            cohortMedianSeconds: Math.round(cohortMedian),
            thresholdSeconds: Math.round(threshold),
            cohortSize: profiles.length,
          },
        });
      }
    }

    return flags;
  }

  private detectIdenticalSequences(profiles: AttemptProfile[]): PendingFlag[] {
    if (profiles.length < 2) return [];

    const bySequence = new Map<string, AttemptProfile[]>();
    for (const profile of profiles) {
      if (profile.responses.length === 0) continue;
      const key = JSON.stringify(profile.responses);
      const bucket = bySequence.get(key) ?? [];
      bucket.push(profile);
      bySequence.set(key, bucket);
    }

    const flags: PendingFlag[] = [];

    for (const group of bySequence.values()) {
      if (group.length < 2) continue;

      const suspiciousIds = new Set<string>();
      const partnerMap = new Map<string, string[]>();

      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          if (this.nearIdenticalTimings(group[i], group[j])) {
            suspiciousIds.add(group[i].attemptId);
            suspiciousIds.add(group[j].attemptId);

            const partnersI = partnerMap.get(group[i].attemptId) ?? [];
            partnersI.push(group[j].userId);
            partnerMap.set(group[i].attemptId, partnersI);

            const partnersJ = partnerMap.get(group[j].attemptId) ?? [];
            partnersJ.push(group[i].userId);
            partnerMap.set(group[j].attemptId, partnersJ);
          }
        }
      }

      for (const profile of group) {
        if (!suspiciousIds.has(profile.attemptId)) continue;
        const partners = partnerMap.get(profile.attemptId) ?? [];
        flags.push({
          attemptId: profile.attemptId,
          userId: profile.userId,
          kind: "IDENTICAL_SEQUENCE",
          reason: `Identical answer sequence and near-identical total timing shared with ${partners.length} other student(s)`,
          detail: {
            matchedWithUsers: partners,
            questionCount: profile.responses.length,
            totalElapsedSeconds: profile.totalElapsed,
          },
        });
      }
    }

    return flags;
  }

  private nearIdenticalTimings(a: AttemptProfile, b: AttemptProfile): boolean {
    const totalA = Math.max(a.totalElapsed, 1);
    const totalB = Math.max(b.totalElapsed, 1);
    const ratio = Math.max(totalA, totalB) / Math.min(totalA, totalB);
    return ratio < IDENTICAL_SEQUENCE_MAX_TOTAL_TIME_RATIO;
  }

  private async loadExistingFlagKeys(testId: string): Promise<Set<string>> {
    const rows = await this.db
      .select({
        attemptId: assessmentAnomalyFlags.attemptId,
        kind: assessmentAnomalyFlags.kind,
      })
      .from(assessmentAnomalyFlags)
      .where(eq(assessmentAnomalyFlags.testId, testId));
    return new Set(rows.map((r) => `${r.attemptId}:${r.kind}`));
  }

  private median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
}
