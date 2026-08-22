import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AiService } from "../ai/ai.service";
import { HAIKU } from "../ai/model-provider";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  codingHintRequests,
  codingProblems,
  codingRuns,
  codingTestCases,
} from "../database/schema";

const MAX_HINTS = 3;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const MAX_HINTS_IN_WINDOW = 3;
const FEATURE = "coding-hint";
const MAX_TOKENS = 512;

const HINT_INSTRUCTIONS: Record<number, string> = {
  1: [
    "You provide the first hint to a stuck student.",
    "Give a high-level directional nudge — point toward the right algorithmic approach or data structure to consider.",
    "Do NOT give code, pseudocode, or any part of a solution.",
    "One to two short sentences only.",
  ].join("\n"),
  2: [
    "You provide the second hint to a student who is still stuck.",
    "Be more specific: describe a key step or insight without revealing the implementation.",
    "Do NOT give code, pseudocode, or the complete algorithm.",
    "Two to three short sentences.",
  ].join("\n"),
  3: [
    "You provide the final hint to a student who is still stuck after two previous hints.",
    "Describe the key steps in plain English but stop short of writing the code for them.",
    "Under no circumstances may you provide a working or near-complete solution.",
    "Three to four short sentences maximum.",
  ].join("\n"),
};

@Injectable()
export class AiHintService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly ai: AiService,
  ) {}

  async requestHint(runId: string, requestUserId: string) {
    const [run] = await this.db
      .select()
      .from(codingRuns)
      .where(eq(codingRuns.runId, runId))
      .limit(1);

    if (!run) throw new NotFoundException("No such run");

    if (run.userId !== requestUserId) {
      throw new ForbiddenException("Access denied");
    }

    if (run.kind !== "JUDGE_SUBMISSION") {
      throw new ForbiddenException("Hints are only available for judge submissions");
    }

    if (run.status !== "COMPLETE") {
      throw new ForbiddenException("Run must be complete before requesting a hint");
    }

    const existingHints = await this.db
      .select({ hintLevel: codingHintRequests.hintLevel })
      .from(codingHintRequests)
      .where(eq(codingHintRequests.runId, runId))
      .orderBy(asc(codingHintRequests.hintLevel));

    const nextLevel = existingHints.length + 1;

    if (nextLevel > MAX_HINTS) {
      throw new ForbiddenException(
        `You have reached the maximum of ${MAX_HINTS} hints for this submission.`,
      );
    }

    await this.assertWithinRateLimit(requestUserId);

    const [problem] = await this.db
      .select({ title: codingProblems.title, organizationId: codingProblems.organizationId })
      .from(codingProblems)
      .where(eq(codingProblems.problemId, run.problemId))
      .limit(1);

    const visibleCases = await this.db
      .select({
        input: codingTestCases.input,
        expectedOutput: codingTestCases.expectedOutput,
        ordinal: codingTestCases.ordinal,
      })
      .from(codingTestCases)
      .where(
        and(
          eq(codingTestCases.problemId, run.problemId),
          eq(codingTestCases.visibility, "VISIBLE"),
        ),
      )
      .orderBy(asc(codingTestCases.ordinal));

    const sources = [
      {
        sourceId: `problem:${run.problemId}`,
        kind: "problem",
        title: problem?.title ?? "Problem",
        body: visibleCases
          .map((c) => `Input: ${c.input}\nExpected: ${c.expectedOutput}`)
          .join("\n\n"),
      },
      {
        sourceId: `submission:${run.runId}`,
        kind: "submission",
        title: `Student submission (${run.language})`,
        body: run.sourceCode,
      },
    ];

    if (existingHints.length > 0) {
      const previousHintRecords = await this.db
        .select({ hintLevel: codingHintRequests.hintLevel, hintText: codingHintRequests.hintText })
        .from(codingHintRequests)
        .where(eq(codingHintRequests.runId, runId))
        .orderBy(asc(codingHintRequests.hintLevel));

      sources.push({
        sourceId: `previous-hints:${run.runId}`,
        kind: "context",
        title: "Previous hints given",
        body: previousHintRecords
          .map((h) => `Hint ${h.hintLevel}: ${h.hintText}`)
          .join("\n\n"),
      });
    }

    const instructions = HINT_INSTRUCTIONS[nextLevel] ?? HINT_INSTRUCTIONS[3];

    const outcome = await this.ai.completeText({
      feature: FEATURE,
      model: HAIKU,
      organizationId: run.organizationId,
      instructions,
      sources,
      question: `Provide hint ${nextLevel} of ${MAX_HINTS} for this student.`,
      maxTokens: MAX_TOKENS,
    });

    const now = this.clock.now();

    if (!outcome.ok) {
      throw new ForbiddenException(
        "Hint generation failed. Please try again shortly.",
      );
    }

    const [saved] = await this.db
      .insert(codingHintRequests)
      .values({
        runId,
        userId: requestUserId,
        hintLevel: nextLevel,
        hintText: outcome.value,
        createdAt: now,
      })
      .returning();

    return {
      runId,
      hintLevel: saved.hintLevel,
      hintText: saved.hintText,
      hintsRemaining: MAX_HINTS - nextLevel,
      createdAt: saved.createdAt,
    };
  }

  async listHints(runId: string, requestUserId: string, isStaff: boolean) {
    const [run] = await this.db
      .select({ userId: codingRuns.userId })
      .from(codingRuns)
      .where(eq(codingRuns.runId, runId))
      .limit(1);

    if (!run) throw new NotFoundException("No such run");

    if (!isStaff && run.userId !== requestUserId) {
      throw new ForbiddenException("Access denied");
    }

    const hints = await this.db
      .select({
        hintLevel: codingHintRequests.hintLevel,
        hintText: codingHintRequests.hintText,
        createdAt: codingHintRequests.createdAt,
      })
      .from(codingHintRequests)
      .where(eq(codingHintRequests.runId, runId))
      .orderBy(asc(codingHintRequests.hintLevel));

    return {
      runId,
      maxHints: MAX_HINTS,
      hintsUsed: hints.length,
      hints,
    };
  }

  private async assertWithinRateLimit(userId: string): Promise<void> {
    const now = this.clock.now();
    const windowStart = new Date(now.getTime() - RATE_WINDOW_MS);

    const [result] = await this.db
      .select({ cnt: sql<number>`count(*)::int` })
      .from(codingHintRequests)
      .where(
        and(
          eq(codingHintRequests.userId, userId),
          gte(codingHintRequests.createdAt, windowStart),
        ),
      );

    if ((result?.cnt ?? 0) >= MAX_HINTS_IN_WINDOW) {
      throw new ForbiddenException({
        code: "HINT_RATE_LIMIT",
        message: "You are requesting hints too quickly. Please wait a moment.",
      });
    }
  }
}
