import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { and, asc, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AiService } from "../ai/ai.service";
import { OPUS } from "../ai/model-provider";
import { FieldSpec } from "../ai/structured";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  aiCodeReviews,
  codingEditorials,
  codingRuns,
  codingTestCases,
} from "../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../jobs/job-queue";
import { scrubCompilerOutput } from "./execution/verdict";

export const AI_CODE_REVIEW_DRAIN = "ai.code-review.drain";
const DRAIN_INTERVAL_MS = 10_000;
const MAX_TOKENS = 1024;
const FEATURE = "code-review";

const REVIEW_SPEC: FieldSpec = {
  type: "object",
  fields: {
    approach: { type: "string", minLength: 20 },
    complexity: { type: "string", minLength: 20 },
    naming: { type: "string", minLength: 10 },
    structure: { type: "string", minLength: 10 },
  },
};

interface ReviewOutput {
  approach: string;
  complexity: string;
  naming: string;
  structure: string;
}

@Injectable()
export class AiCodeReviewService implements OnModuleInit {
  private readonly logger = new Logger(AiCodeReviewService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    private readonly ai: AiService,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      AI_CODE_REVIEW_DRAIN,
      async () => {
        await this.drain();
      },
      DRAIN_INTERVAL_MS,
      (err) => this.logger.error("Failed to schedule code review drain", err),
    );
  }

  async drain(): Promise<void> {
    const pending = await this.db
      .select({
        runId: codingRuns.runId,
        problemId: codingRuns.problemId,
        userId: codingRuns.userId,
        language: codingRuns.language,
        sourceCode: codingRuns.sourceCode,
        organizationId: codingRuns.organizationId,
      })
      .from(codingRuns)
      .leftJoin(aiCodeReviews, eq(aiCodeReviews.runId, codingRuns.runId))
      .where(
        and(
          eq(codingRuns.kind, "JUDGE_SUBMISSION"),
          eq(codingRuns.status, "COMPLETE"),
          isNull(aiCodeReviews.reviewId),
        ),
      )
      .orderBy(asc(codingRuns.completedAt))
      .limit(10);

    for (const run of pending) {
      await this.reviewRun(run);
    }
  }

  private async reviewRun(run: {
    runId: string;
    problemId: string;
    userId: string;
    language: string;
    sourceCode: string;
    organizationId: string;
  }): Promise<void> {
    const now = this.clock.now();

    const inserted = await this.db
      .insert(aiCodeReviews)
      .values({
        runId: run.runId,
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({ reviewId: aiCodeReviews.reviewId });

    if (inserted.length === 0) return;

    const [editorial] = await this.db
      .select()
      .from(codingEditorials)
      .where(eq(codingEditorials.problemId, run.problemId));

    const visibleCases = await this.db
      .select({ input: codingTestCases.input, expectedOutput: codingTestCases.expectedOutput, ordinal: codingTestCases.ordinal })
      .from(codingTestCases)
      .where(
        and(
          eq(codingTestCases.problemId, run.problemId),
          eq(codingTestCases.visibility, "VISIBLE"),
        ),
      )
      .orderBy(asc(codingTestCases.ordinal));

    const hiddenCases = await this.db
      .select({ input: codingTestCases.input, expectedOutput: codingTestCases.expectedOutput })
      .from(codingTestCases)
      .where(
        and(
          eq(codingTestCases.problemId, run.problemId),
          eq(codingTestCases.visibility, "HIDDEN"),
        ),
      );

    const hiddenSecrets = hiddenCases.flatMap((c) => [c.input, c.expectedOutput]);

    const sources = [
      {
        sourceId: `problem:${run.problemId}`,
        kind: "problem",
        title: "Visible test cases",
        body: visibleCases
          .map((c) => `Input: ${c.input}\nExpected: ${c.expectedOutput}`)
          .join("\n\n"),
      },
    ];

    if (editorial) {
      sources.push({
        sourceId: `editorial:${run.problemId}`,
        kind: "editorial",
        title: "Model solution and complexity",
        body: [
          `Model solution (${editorial.modelSolutionLanguage}):\n${editorial.modelSolution}`,
          `Time complexity: ${editorial.timeComplexity}`,
          `Space complexity: ${editorial.spaceComplexity}`,
        ].join("\n\n"),
      });
    }

    sources.push({
      sourceId: `submission:${run.runId}`,
      kind: "submission",
      title: `Student submission (${run.language})`,
      body: run.sourceCode,
    });

    const instructions = [
      "You review a student's code submission against a model solution.",
      "Provide concise feedback on:",
      "- approach: the algorithmic strategy chosen compared to the model solution",
      "- complexity: the time and space complexity of the submitted code",
      "- naming: variable and function naming clarity and conventions",
      "- structure: code organisation, readability and maintainability",
      "Do not reveal any hidden test case inputs or expected outputs.",
      "Do not repeat the student's code verbatim in your response.",
      "Each field must be a short paragraph of one to three sentences.",
    ].join("\n");

    const outcome = await this.ai.completeStructured<ReviewOutput>(
      {
        feature: FEATURE,
        model: OPUS,
        organizationId: run.organizationId,
        instructions,
        sources,
        question: "Review this submission.",
        maxTokens: MAX_TOKENS,
      },
      REVIEW_SPEC,
    );

    const updateNow = this.clock.now();

    if (!outcome.ok) {
      await this.db
        .update(aiCodeReviews)
        .set({
          status: "FAILED",
          failureReason: outcome.reason.slice(0, 400),
          updatedAt: updateNow,
        })
        .where(eq(aiCodeReviews.runId, run.runId));
      return;
    }

    const scrubbed = {
      approach: scrubCompilerOutput(outcome.value.approach, hiddenSecrets),
      complexity: scrubCompilerOutput(outcome.value.complexity, hiddenSecrets),
      naming: scrubCompilerOutput(outcome.value.naming, hiddenSecrets),
      structure: scrubCompilerOutput(outcome.value.structure, hiddenSecrets),
    };

    await this.db
      .update(aiCodeReviews)
      .set({
        status: "READY",
        approach: scrubbed.approach,
        complexity: scrubbed.complexity,
        naming: scrubbed.naming,
        structure: scrubbed.structure,
        updatedAt: updateNow,
      })
      .where(eq(aiCodeReviews.runId, run.runId));
  }

  async getReview(runId: string, requestUserId: string, isStaff: boolean) {
    const [run] = await this.db
      .select({ userId: codingRuns.userId })
      .from(codingRuns)
      .where(eq(codingRuns.runId, runId))
      .limit(1);

    if (!run) throw new NotFoundException("No such run");

    if (!isStaff && run.userId !== requestUserId) {
      throw new ForbiddenException("Access denied");
    }

    const [review] = await this.db
      .select()
      .from(aiCodeReviews)
      .where(eq(aiCodeReviews.runId, runId))
      .limit(1);

    if (!review) return { runId, status: "PENDING" as const };

    return {
      runId,
      status: review.status,
      approach: review.approach,
      complexity: review.complexity,
      naming: review.naming,
      structure: review.structure,
    };
  }
}
