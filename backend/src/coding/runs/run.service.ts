import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { and, asc, desc, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  codingEditorDrafts,
  codingExecutionUsage,
  codingGiveUps,
  codingRunCaseResults,
  codingRuns,
} from "../../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../../jobs/job-queue";
import { NotificationsService } from "../../notifications/notifications.service";
import { EXECUTION_SETTINGS_GROUP } from "../../settings/settings.definitions";
import { SettingsService } from "../../settings/settings.service";
import { ProblemService } from "../bank/problem.service";
import {
  EXECUTION_PROVIDER,
  ExecutionCase,
  ExecutionProvider,
} from "../execution/execution-provider";
import { judge, safeDetailFor, scrubCompilerOutput } from "../execution/verdict";

export const CODING_DRAIN_JOB = "coding.runs.drain";
const DRAIN_INTERVAL_MS = 5_000;

type RunRow = typeof codingRuns.$inferSelect;
type RunKind = RunRow["kind"];

interface Limits {
  sampleRunsPerMinute: number;
  sampleRunsPerDay: number;
  submissionsPerMinute: number;
  submissionsPerDay: number;
}

@Injectable()
export class RunService implements OnModuleInit {
  private readonly logger = new Logger(RunService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(EXECUTION_PROVIDER)
    private readonly provider: ExecutionProvider,
    private readonly problems: ProblemService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      CODING_DRAIN_JOB,
      async () => {
        await this.drain();
      },
      DRAIN_INTERVAL_MS,
      (err) => this.logger.error("Could not schedule the code run drain", err),
    );
  }

  async queue(
    problemId: string,
    userId: string,
    kind: RunKind,
    language: string,
    sourceCode: string,
  ) {
    const problem =
      kind === "REFERENCE_VALIDATION"
        ? await this.problems.require(problemId)
        : await this.problems.requirePublished(problemId);

    if (problem.kind !== "ALGORITHMIC") {
      throw new NotFoundException("That problem is not judged by execution");
    }

    await this.problems.languageFor(problemId, language);
    if (kind !== "REFERENCE_VALIDATION") {
      await this.assertWithinLimits(userId, kind);
    }

    const now = this.clock.now();
    const [run] = await this.db
      .insert(codingRuns)
      .values({
        problemId,
        userId,
        kind,
        language,
        sourceCode,
        status: "PENDING",
        queuedAt: now,
      })
      .returning();

    return this.present(run, []);
  }

  async drain(): Promise<void> {
    const pending = await this.db
      .select()
      .from(codingRuns)
      .where(eq(codingRuns.status, "PENDING"))
      .orderBy(asc(codingRuns.queuedAt))
      .limit(25);

    for (const run of pending) {
      await this.execute(run);
    }
  }

  async execute(run: RunRow): Promise<void> {
    const now = this.clock.now();
    const claimed = await this.db
      .update(codingRuns)
      .set({ status: "RUNNING" })
      .where(and(eq(codingRuns.runId, run.runId), eq(codingRuns.status, "PENDING")))
      .returning({ runId: codingRuns.runId });

    if (claimed.length === 0) return;

    try {
      const visibility =
        run.kind === "SAMPLE_RUN"
          ? "VISIBLE"
          : run.kind === "JUDGE_SUBMISSION"
            ? "HIDDEN"
            : "ALL";
      const cases = await this.problems.casesFor(run.problemId, visibility);
      const language = await this.problems.languageFor(run.problemId, run.language);

      const payloadCases: ExecutionCase[] = cases.map((testCase) => ({
        ordinal: testCase.ordinal,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
      }));

      const visibleByOrdinal = new Map(
        cases
          .filter((testCase) => testCase.visibility === "VISIBLE")
          .map((testCase) => [testCase.ordinal, testCase]),
      );
      const secrets = cases
        .filter((testCase) => testCase.visibility === "HIDDEN")
        .flatMap((testCase) => [testCase.input, testCase.expectedOutput]);
      if (payloadCases.length === 0) {
        throw new Error("That problem has no test cases to run");
      }

      const result = await this.provider.execute({
        language: run.language,
        sourceCode: run.sourceCode,
        timeLimitMs: language.timeLimitMs,
        memoryLimitMb: language.memoryLimitMb,
        cases: payloadCases,
      });

      const judged = judge(result.cases);
      const detail =
        judged.verdict === "COMPILATION_ERROR"
          ? scrubCompilerOutput(
              result.cases.find((c) => c.message)?.message ?? "",
              secrets,
            )
          : safeDetailFor(judged.verdict);

      await this.db.transaction(async (tx) => {
        await tx
          .update(codingRuns)
          .set({
            status: "COMPLETE",
            verdict: judged.verdict,
            providerRef: result.reference,
            failedCaseOrdinal: judged.failedOrdinal,
            failureDetail: detail,
            runtimeMs: judged.runtimeMs,
            memoryKb: judged.memoryKb,
            completedAt: now,
          })
          .where(eq(codingRuns.runId, run.runId));

        if (result.cases.length > 0) {
          await tx
            .insert(codingRunCaseResults)
            .values(
              result.cases.map((outcome) => {
                const visible = visibleByOrdinal.has(outcome.ordinal);
                return {
                  runId: run.runId,
                  caseOrdinal: outcome.ordinal,
                  visibility: visible
                    ? ("VISIBLE" as const)
                    : ("HIDDEN" as const),
                  passed: outcome.outcome === "OK",
                  actualOutput: outcome.actualOutput,
                  runtimeMs: outcome.runtimeMs,
                  createdAt: now,
                };
              }),
            )
            .onConflictDoNothing();
        }

        if (judged.verdict !== "INTERNAL_ERROR") {
          await tx
            .insert(codingExecutionUsage)
            .values({
              userId: run.userId,
              runId: run.runId,
              kind: run.kind,
              caseCount: payloadCases.length,
              billedMs: judged.runtimeMs,
              createdAt: now,
            })
            .onConflictDoNothing();
        }
      });

      if (run.kind === "JUDGE_SUBMISSION") {
        await this.announce(run, judged.verdict);
      }
    } catch (err) {
      await this.db
        .update(codingRuns)
        .set({
          status: "COMPLETE",
          verdict: "INTERNAL_ERROR",
          failureDetail: safeDetailFor("INTERNAL_ERROR"),
          completedAt: now,
        })
        .where(eq(codingRuns.runId, run.runId));
      this.logger.error(
        `Code execution failed for run ${run.runId}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async readRun(runId: string, userId: string, isStaff: boolean) {
    const [run] = await this.db
      .select()
      .from(codingRuns)
      .where(eq(codingRuns.runId, runId));
    if (!run) throw new NotFoundException("No such run");
    if (!isStaff && run.userId !== userId) {
      throw new NotFoundException("No such run");
    }
    const results = await this.db
      .select()
      .from(codingRunCaseResults)
      .where(eq(codingRunCaseResults.runId, runId))
      .orderBy(asc(codingRunCaseResults.caseOrdinal));
    const cases = await this.problems.casesFor(run.problemId, isStaff ? "ALL" : "VISIBLE");
    return this.present(run, results, isStaff, cases);
  }

  async history(problemId: string, userId: string) {
    const runs = await this.db
      .select()
      .from(codingRuns)
      .where(
        and(
          eq(codingRuns.problemId, problemId),
          eq(codingRuns.userId, userId),
          eq(codingRuns.kind, "JUDGE_SUBMISSION"),
        ),
      )
      .orderBy(desc(codingRuns.queuedAt), desc(codingRuns.runId));
    return runs.map((run) => ({
      runId: run.runId,
      language: run.language,
      sourceCode: run.sourceCode,
      status: run.status,
      verdict: run.verdict,
      queuedAt: run.queuedAt,
      completedAt: run.completedAt,
    }));
  }

  async historyFor(problemId: string, studentId: string) {
    return this.history(problemId, studentId);
  }

  async saveDraft(
    problemId: string,
    userId: string,
    language: string,
    sourceCode: string,
  ) {
    await this.problems.requirePublished(problemId);
    const now = this.clock.now();
    const [draft] = await this.db
      .insert(codingEditorDrafts)
      .values({ userId, problemId, language, sourceCode, updatedAt: now })
      .onConflictDoUpdate({
        target: [
          codingEditorDrafts.userId,
          codingEditorDrafts.problemId,
          codingEditorDrafts.language,
        ],
        set: { sourceCode, updatedAt: now },
      })
      .returning();
    return draft;
  }

  async readDraft(problemId: string, userId: string, language: string) {
    const [draft] = await this.db
      .select()
      .from(codingEditorDrafts)
      .where(
        and(
          eq(codingEditorDrafts.userId, userId),
          eq(codingEditorDrafts.problemId, problemId),
          eq(codingEditorDrafts.language, language),
        ),
      );
    if (draft) {
      return { problemId, language, sourceCode: draft.sourceCode };
    }
    const configured = await this.problems.languageFor(problemId, language);
    return { problemId, language, sourceCode: configured.starterCode };
  }

  async giveUp(problemId: string, userId: string) {
    await this.problems.requirePublished(problemId);
    const now = this.clock.now();
    await this.db
      .insert(codingGiveUps)
      .values({ userId, problemId, givenUpAt: now })
      .onConflictDoNothing();
    return { problemId, givenUpAt: now };
  }

  async editorial(problemId: string, userId: string, isStaff: boolean) {
    await this.problems.requirePublished(problemId);
    const editorial = await this.problems.editorialFor(problemId);
    if (!editorial) throw new NotFoundException("No editorial yet");
    if (isStaff) return this.presentEditorial(editorial);

    const solved = await this.hasSolved(problemId, userId);
    if (!solved) {
      const [gaveUp] = await this.db
        .select({ giveUpId: codingGiveUps.giveUpId })
        .from(codingGiveUps)
        .where(
          and(
            eq(codingGiveUps.userId, userId),
            eq(codingGiveUps.problemId, problemId),
          ),
        );
      if (!gaveUp) {
        throw new ForbiddenException(
          "Solve the problem or give up to read the editorial",
        );
      }
    }
    return this.presentEditorial(editorial);
  }

  async hasSolved(problemId: string, userId: string): Promise<boolean> {
    const [solved] = await this.db
      .select({ runId: codingRuns.runId })
      .from(codingRuns)
      .where(
        and(
          eq(codingRuns.problemId, problemId),
          eq(codingRuns.userId, userId),
          eq(codingRuns.kind, "JUDGE_SUBMISSION"),
          eq(codingRuns.verdict, "ACCEPTED"),
        ),
      )
      .limit(1);
    return solved !== undefined;
  }

  async usageFor(userId: string) {
    const [row] = await this.db
      .select({
        runs: sql<number>`count(*)::int`,
        cases: sql<number>`coalesce(sum(${codingExecutionUsage.caseCount}), 0)::int`,
        billedMs: sql<number>`coalesce(sum(${codingExecutionUsage.billedMs}), 0)::int`,
      })
      .from(codingExecutionUsage)
      .where(eq(codingExecutionUsage.userId, userId));
    return { userId, ...row };
  }

  private async assertWithinLimits(
    userId: string,
    kind: RunKind,
  ): Promise<void> {
    const limits = await this.limits();
    const perMinute =
      kind === "SAMPLE_RUN"
        ? limits.sampleRunsPerMinute
        : limits.submissionsPerMinute;
    const perDay =
      kind === "SAMPLE_RUN" ? limits.sampleRunsPerDay : limits.submissionsPerDay;

    const now = this.clock.now();
    const minuteAgo = new Date(now.getTime() - 60_000);
    const dayAgo = new Date(now.getTime() - 86_400_000);

    const [counts] = await this.db
      .select({
        inMinute: sql<number>`count(*) filter (where ${codingRuns.queuedAt} >= ${minuteAgo})::int`,
        inDay: sql<number>`count(*)::int`,
      })
      .from(codingRuns)
      .where(
        and(
          eq(codingRuns.userId, userId),
          eq(codingRuns.kind, kind),
          gte(codingRuns.queuedAt, dayAgo),
          or(
            ne(codingRuns.verdict, "INTERNAL_ERROR"),
            sql`${codingRuns.verdict} is null`,
          ),
        ),
      );

    if (counts.inMinute >= perMinute) {
      throw new ForbiddenException({
        code: "EXECUTION_RATE_LIMIT",
        message: "You are running code too quickly. Wait a moment and retry.",
      });
    }
    if (counts.inDay >= perDay) {
      throw new ForbiddenException({
        code: "EXECUTION_RATE_LIMIT",
        message: "You have reached today's limit for running code.",
      });
    }
  }

  private async limits(): Promise<Limits> {
    const group = await this.settings.getGroup(EXECUTION_SETTINGS_GROUP);
    const read = (key: keyof Limits, fallback: number): number => {
      const value = Number(group.values[key]);
      return Number.isFinite(value) && value > 0 ? value : fallback;
    };
    return {
      sampleRunsPerMinute: read("sampleRunsPerMinute", 10),
      sampleRunsPerDay: read("sampleRunsPerDay", 300),
      submissionsPerMinute: read("submissionsPerMinute", 5),
      submissionsPerDay: read("submissionsPerDay", 100),
    };
  }

  private async announce(run: RunRow, verdict: string): Promise<void> {
    const problem = await this.problems.require(run.problemId);
    await this.notifications.notify({
      userId: run.userId,
      type: "CODE_VERDICT",
      vars: {
        problemTitle: problem.title,
        verdict,
        body: `Your submission to ${problem.title} was judged: ${verdict}.`,
      },
      link: `/practice/problems/${problem.slug}`,
      dedupeKey: `code-verdict:${run.runId}`,
    });
  }

  private presentEditorial(
    editorial: NonNullable<Awaited<ReturnType<ProblemService["editorialFor"]>>>,
  ) {
    return {
      problemId: editorial.problemId,
      body: editorial.body,
      modelSolution: editorial.modelSolution,
      modelSolutionLanguage: editorial.modelSolutionLanguage,
      timeComplexity: editorial.timeComplexity,
      spaceComplexity: editorial.spaceComplexity,
    };
  }

  private present(
    run: RunRow,
    results: (typeof codingRunCaseResults.$inferSelect)[],
    isStaff = false,
    cases: { ordinal: number; input: string; expectedOutput: string; visibility?: string }[] = [],
  ) {
    const caseByOrdinal = new Map(cases.map((tc) => [tc.ordinal, tc]));
    return {
      runId: run.runId,
      problemId: run.problemId,
      kind: run.kind,
      language: run.language,
      status: run.status,
      verdict: run.verdict,
      failedCaseOrdinal: run.failedCaseOrdinal,
      failureDetail: run.failureDetail,
      runtimeMs: run.runtimeMs,
      memoryKb: run.memoryKb,
      queuedAt: run.queuedAt,
      completedAt: run.completedAt,
      cases: results.map((result) => {
        const shown =
          isStaff || result.visibility === "VISIBLE"
            ? caseByOrdinal.get(result.caseOrdinal)
            : undefined;
        return {
          ordinal: result.caseOrdinal,
          visibility: result.visibility,
          passed: result.passed,
          input: shown?.input ?? null,
          expectedOutput: shown?.expectedOutput ?? null,
          actualOutput:
            isStaff || result.visibility === "VISIBLE"
              ? result.actualOutput
              : null,
          runtimeMs: result.runtimeMs,
        };
      }),
    };
  }

  async runsByIds(runIds: string[]) {
    if (runIds.length === 0) return [];
    return this.db
      .select()
      .from(codingRuns)
      .where(inArray(codingRuns.runId, runIds));
  }
}
