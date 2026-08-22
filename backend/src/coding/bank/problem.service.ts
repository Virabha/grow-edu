import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { parseContent } from "../../assessment/bank/content";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  codingEditorials,
  codingFrontendAssertions,
  codingProblemLanguages,
  codingProblems,
  codingTestCases,
} from "../../database/schema";
import { EXECUTION_SETTINGS_GROUP } from "../../settings/settings.definitions";
import { SettingsService } from "../../settings/settings.service";
import {
  CreateProblemDto,
  UpdateProblemDto,
  UpsertLanguageDto,
  UpsertTestCaseDto,
  UpsertAssertionDto,
  UpsertEditorialDto,
} from "./dto/problem.dto";

type ProblemRow = typeof codingProblems.$inferSelect;

@Injectable()
export class ProblemService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly settings: SettingsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(dto: CreateProblemDto, createdBy: string, statement: unknown, constraintsText: unknown) {
    const now = this.clock.now();
    const [created] = await this.db
      .insert(codingProblems)
      .values({
        kind: dto.kind ?? "ALGORITHMIC",
        title: dto.title,
        slug: dto.slug,
        statement: parseContent(statement, "statement"),
        constraintsText: parseContent(constraintsText, "constraints", {
          allowEmpty: true,
        }),
        topicId: dto.topicId ?? null,
        difficulty: dto.difficulty ?? 1,
        createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return created;
  }

  async update(
    problemId: string,
    dto: UpdateProblemDto,
    statement: unknown,
    constraintsText: unknown,
  ) {
    const existing = await this.require(problemId);
    const now = this.clock.now();
    const [updated] = await this.db
      .update(codingProblems)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.topicId !== undefined && { topicId: dto.topicId }),
        ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
        ...(statement !== undefined && {
          statement: parseContent(statement, "statement"),
        }),
        ...(constraintsText !== undefined && {
          constraintsText: parseContent(constraintsText, "constraints", {
            allowEmpty: true,
          }),
        }),
        ...this.reopenGate(existing),
        updatedAt: now,
      })
      .where(eq(codingProblems.problemId, problemId))
      .returning();
    return updated;
  }

  async list(viewerIsStaff: boolean) {
    const rows = await this.db
      .select()
      .from(codingProblems)
      .where(
        viewerIsStaff
          ? eq(codingProblems.isDeleted, false)
          : and(
              eq(codingProblems.isDeleted, false),
              eq(codingProblems.status, "PUBLISHED"),
            ),
      )
      .orderBy(asc(codingProblems.difficulty), asc(codingProblems.title));
    return rows.map((row) => this.summarise(row));
  }

  async read(problemId: string, viewerIsStaff: boolean) {
    const problem = await this.require(problemId);
    if (!viewerIsStaff && problem.status !== "PUBLISHED") {
      throw new NotFoundException("No such problem");
    }

    const [languages, cases, assertions] = await Promise.all([
      this.db
        .select()
        .from(codingProblemLanguages)
        .where(eq(codingProblemLanguages.problemId, problemId))
        .orderBy(asc(codingProblemLanguages.language)),
      this.db
        .select()
        .from(codingTestCases)
        .where(eq(codingTestCases.problemId, problemId))
        .orderBy(asc(codingTestCases.ordinal)),
      this.db
        .select()
        .from(codingFrontendAssertions)
        .where(eq(codingFrontendAssertions.problemId, problemId))
        .orderBy(asc(codingFrontendAssertions.ordinal)),
    ]);

    return {
      ...this.summarise(problem),
      statement: problem.statement,
      constraints: problem.constraintsText,
      languages: languages.map((language) => ({
        language: language.language,
        starterCode: language.starterCode,
        timeLimitMs: language.timeLimitMs,
        memoryLimitMb: language.memoryLimitMb,
        ...(viewerIsStaff
          ? { referenceSolution: language.referenceSolution }
          : {}),
      })),
      cases: cases
        .filter((testCase) => viewerIsStaff || testCase.visibility === "VISIBLE")
        .map((testCase) =>
          viewerIsStaff
            ? testCase
            : {
                ordinal: testCase.ordinal,
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                explanation: testCase.explanation,
              },
        ),
      hiddenCaseCount: cases.filter((c) => c.visibility === "HIDDEN").length,
      assertions: assertions
        .filter((a) => viewerIsStaff || a.visibility === "VISIBLE")
        .map((a) =>
          viewerIsStaff
            ? a
            : { ordinal: a.ordinal, description: a.description },
        ),
    };
  }

  async upsertLanguage(problemId: string, dto: UpsertLanguageDto) {
    const existing = await this.require(problemId);
    await this.assertLanguageSupported(dto.language);
    const defaults = await this.executionDefaults();
    const now = this.clock.now();

    const [saved] = await this.db
      .insert(codingProblemLanguages)
      .values({
        problemId,
        language: dto.language,
        starterCode: dto.starterCode ?? "",
        referenceSolution: dto.referenceSolution ?? null,
        timeLimitMs: dto.timeLimitMs ?? defaults.timeLimitMs,
        memoryLimitMb: dto.memoryLimitMb ?? defaults.memoryLimitMb,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          codingProblemLanguages.problemId,
          codingProblemLanguages.language,
        ],
        set: {
          ...(dto.starterCode !== undefined && { starterCode: dto.starterCode }),
          ...(dto.referenceSolution !== undefined && {
            referenceSolution: dto.referenceSolution,
          }),
          ...(dto.timeLimitMs !== undefined && { timeLimitMs: dto.timeLimitMs }),
          ...(dto.memoryLimitMb !== undefined && {
            memoryLimitMb: dto.memoryLimitMb,
          }),
          updatedAt: now,
        },
      })
      .returning();

    await this.reopenGateFor(existing);
    return saved;
  }

  async upsertCase(problemId: string, dto: UpsertTestCaseDto) {
    const existing = await this.require(problemId);
    if (existing.kind !== "ALGORITHMIC") {
      throw new BadRequestException(
        "Only an algorithmic problem carries input and output test cases",
      );
    }
    const now = this.clock.now();
    const [saved] = await this.db
      .insert(codingTestCases)
      .values({
        problemId,
        ordinal: dto.ordinal,
        visibility: dto.visibility,
        input: dto.input,
        expectedOutput: dto.expectedOutput,
        explanation: dto.explanation ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [codingTestCases.problemId, codingTestCases.ordinal],
        set: {
          visibility: dto.visibility,
          input: dto.input,
          expectedOutput: dto.expectedOutput,
          explanation: dto.explanation ?? null,
          updatedAt: now,
        },
      })
      .returning();

    await this.reopenGateFor(existing);
    return saved;
  }

  async upsertAssertion(problemId: string, dto: UpsertAssertionDto) {
    const existing = await this.require(problemId);
    if (existing.kind !== "FRONTEND") {
      throw new BadRequestException(
        "Only a front-end problem carries assertions",
      );
    }
    const now = this.clock.now();
    const [saved] = await this.db
      .insert(codingFrontendAssertions)
      .values({
        problemId,
        ordinal: dto.ordinal,
        visibility: dto.visibility,
        description: dto.description,
        script: dto.script,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          codingFrontendAssertions.problemId,
          codingFrontendAssertions.ordinal,
        ],
        set: {
          visibility: dto.visibility,
          description: dto.description,
          script: dto.script,
          updatedAt: now,
        },
      })
      .returning();
    return saved;
  }

  async upsertEditorial(
    problemId: string,
    dto: UpsertEditorialDto,
    body: unknown,
  ) {
    await this.require(problemId);
    const now = this.clock.now();
    const [saved] = await this.db
      .insert(codingEditorials)
      .values({
        problemId,
        body: parseContent(body, "editorial"),
        modelSolution: dto.modelSolution,
        modelSolutionLanguage: dto.modelSolutionLanguage,
        timeComplexity: dto.timeComplexity,
        spaceComplexity: dto.spaceComplexity,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: codingEditorials.problemId,
        set: {
          body: parseContent(body, "editorial"),
          modelSolution: dto.modelSolution,
          modelSolutionLanguage: dto.modelSolutionLanguage,
          timeComplexity: dto.timeComplexity,
          spaceComplexity: dto.spaceComplexity,
          updatedAt: now,
        },
      })
      .returning();
    return saved;
  }

  async casesFor(
    problemId: string,
    visibility: "VISIBLE" | "HIDDEN" | "ALL",
  ) {
    const conditions = [eq(codingTestCases.problemId, problemId)];
    if (visibility !== "ALL") {
      conditions.push(eq(codingTestCases.visibility, visibility));
    }
    return this.db
      .select()
      .from(codingTestCases)
      .where(and(...conditions))
      .orderBy(asc(codingTestCases.ordinal));
  }

  async languageFor(problemId: string, language: string) {
    const [row] = await this.db
      .select()
      .from(codingProblemLanguages)
      .where(
        and(
          eq(codingProblemLanguages.problemId, problemId),
          eq(codingProblemLanguages.language, language),
        ),
      );
    if (!row) {
      throw new BadRequestException("That problem does not support that language");
    }
    return row;
  }

  async require(problemId: string): Promise<ProblemRow> {
    const [problem] = await this.db
      .select()
      .from(codingProblems)
      .where(
        and(
          eq(codingProblems.problemId, problemId),
          eq(codingProblems.isDeleted, false),
        ),
      );
    if (!problem) throw new NotFoundException("No such problem");
    return problem;
  }

  async requirePublished(problemId: string): Promise<ProblemRow> {
    const problem = await this.require(problemId);
    if (problem.status !== "PUBLISHED") {
      throw new NotFoundException("No such problem");
    }
    return problem;
  }

  async assertLanguageSupported(language: string): Promise<void> {
    const supported = await this.supportedLanguages();
    if (!supported.some((entry) => entry.key === language)) {
      throw new BadRequestException("That language is not supported");
    }
  }

  async supportedLanguages(): Promise<{ key: string; label: string }[]> {
    const group = await this.settings.getGroup(EXECUTION_SETTINGS_GROUP);
    const configured = group.values.supportedLanguages;
    if (typeof configured !== "string") return [];
    return configured
      .split("\n")
      .map((line) => line.split("|").map((part) => part.trim()))
      .filter((parts) => parts[0])
      .map((parts) => ({ key: parts[0], label: parts[1] ?? parts[0] }));
  }

  async executionDefaults(): Promise<{
    timeLimitMs: number;
    memoryLimitMb: number;
  }> {
    const group = await this.settings.getGroup(EXECUTION_SETTINGS_GROUP);
    const time = Number(group.values.defaultTimeLimitMs);
    const memory = Number(group.values.defaultMemoryLimitMb);
    return {
      timeLimitMs: Number.isFinite(time) && time > 0 ? time : 2000,
      memoryLimitMb: Number.isFinite(memory) && memory > 0 ? memory : 256,
    };
  }

  async markValidated(problemId: string, validated: boolean): Promise<void> {
    const now = this.clock.now();
    await this.db
      .update(codingProblems)
      .set({
        status: validated ? "VALIDATED" : "DRAFT",
        validatedAt: validated ? now : null,
        updatedAt: now,
      })
      .where(eq(codingProblems.problemId, problemId));
  }

  async publish(problemId: string) {
    const problem = await this.require(problemId);
    if (problem.status === "PUBLISHED") return problem;

    if (problem.kind === "FRONTEND") {
      const assertions = await this.db
        .select({ assertionId: codingFrontendAssertions.assertionId })
        .from(codingFrontendAssertions)
        .where(eq(codingFrontendAssertions.problemId, problemId));
      if (assertions.length === 0) {
        throw new ConflictException(
          "A front-end problem must carry at least one assertion",
        );
      }
    } else if (problem.validatedAt === null || problem.status !== "VALIDATED") {
      throw new ConflictException(
        "Validate the problem against its reference solution before publishing",
      );
    }
    const editorial = await this.db
      .select({ editorialId: codingEditorials.editorialId })
      .from(codingEditorials)
      .where(eq(codingEditorials.problemId, problemId));
    if (editorial.length === 0) {
      throw new ConflictException(
        "A published problem must carry an editorial",
      );
    }
    const now = this.clock.now();
    const [published] = await this.db
      .update(codingProblems)
      .set({ status: "PUBLISHED", publishedAt: now, updatedAt: now })
      .where(eq(codingProblems.problemId, problemId))
      .returning();
    return published;
  }

  async editorialFor(problemId: string) {
    const [editorial] = await this.db
      .select()
      .from(codingEditorials)
      .where(eq(codingEditorials.problemId, problemId));
    return editorial ?? null;
  }

  async problemsByIds(problemIds: string[]) {
    if (problemIds.length === 0) return [];
    return this.db
      .select()
      .from(codingProblems)
      .where(inArray(codingProblems.problemId, problemIds));
  }

  private reopenGate(problem: ProblemRow) {
    if (problem.status === "DRAFT") return {};
    return { status: "DRAFT" as const, validatedAt: null, publishedAt: null };
  }

  private async reopenGateFor(problem: ProblemRow): Promise<void> {
    if (problem.status === "DRAFT") return;
    await this.db
      .update(codingProblems)
      .set({
        status: "DRAFT",
        validatedAt: null,
        publishedAt: null,
        updatedAt: this.clock.now(),
      })
      .where(eq(codingProblems.problemId, problem.problemId));
  }

  private summarise(problem: ProblemRow) {
    return {
      problemId: problem.problemId,
      kind: problem.kind,
      title: problem.title,
      slug: problem.slug,
      topicId: problem.topicId,
      difficulty: problem.difficulty,
      status: problem.status,
      publishedAt: problem.publishedAt,
    };
  }
}
