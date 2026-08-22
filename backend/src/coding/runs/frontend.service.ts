import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  codingFrontendAssertions,
  codingFrontendResults,
} from "../../database/schema";
import { ProblemService } from "../bank/problem.service";

@Injectable()
export class FrontendService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly problems: ProblemService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async sampleBundle(problemId: string) {
    await this.requireFrontend(problemId);
    const assertions = await this.assertionsFor(problemId, "VISIBLE");
    return {
      problemId,
      assertions: assertions.map((assertion) => ({
        ordinal: assertion.ordinal,
        description: assertion.description,
        script: assertion.script,
      })),
    };
  }

  async judgeBundle(problemId: string) {
    await this.requireFrontend(problemId);
    const assertions = await this.assertionsFor(problemId, "ALL");
    return {
      problemId,
      assertions: assertions.map((assertion) => ({
        ordinal: assertion.ordinal,
        description: assertion.description,
        script: assertion.script,
      })),
    };
  }

  async record(problemId: string, userId: string, passedOrdinals: number[]) {
    await this.requireFrontend(problemId);
    const assertions = await this.assertionsFor(problemId, "VISIBLE");
    if (assertions.length === 0) {
      throw new BadRequestException("That problem has no assertions to run");
    }

    const known = new Set(assertions.map((assertion) => assertion.ordinal));
    const reported = [...new Set(passedOrdinals)].filter((ordinal) =>
      known.has(ordinal),
    );
    const passed = reported.length === assertions.length;
    const now = this.clock.now();

    const [result] = await this.db
      .insert(codingFrontendResults)
      .values({
        userId,
        problemId,
        passedOrdinals: reported.sort((a, b) => a - b),
        passed,
        createdAt: now,
      })
      .returning();

    return {
      resultId: result.frontendResultId,
      problemId,
      passed: result.passed,
      passedOrdinals: result.passedOrdinals,
      totalAssertions: assertions.length,
      createdAt: result.createdAt,
    };
  }

  async myResults(problemId: string, userId: string) {
    await this.requireFrontend(problemId);
    const rows = await this.db
      .select()
      .from(codingFrontendResults)
      .where(
        and(
          eq(codingFrontendResults.problemId, problemId),
          eq(codingFrontendResults.userId, userId),
        ),
      )
      .orderBy(desc(codingFrontendResults.createdAt));
    return rows.map((row) => ({
      resultId: row.frontendResultId,
      passed: row.passed,
      passedOrdinals: row.passedOrdinals,
      createdAt: row.createdAt,
    }));
  }

  private async requireFrontend(problemId: string) {
    const problem = await this.problems.requirePublished(problemId);
    if (problem.kind !== "FRONTEND") {
      throw new NotFoundException("That problem is not a front-end problem");
    }
    return problem;
  }

  private async assertionsFor(
    problemId: string,
    visibility: "VISIBLE" | "ALL",
  ) {
    const conditions = [eq(codingFrontendAssertions.problemId, problemId)];
    if (visibility !== "ALL") {
      conditions.push(eq(codingFrontendAssertions.visibility, visibility));
    }
    return this.db
      .select()
      .from(codingFrontendAssertions)
      .where(and(...conditions))
      .orderBy(asc(codingFrontendAssertions.ordinal));
  }
}
