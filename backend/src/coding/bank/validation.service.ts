import {
  BadRequestException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  EXECUTION_PROVIDER,
  ExecutionProvider,
} from "../execution/execution-provider";
import { judge, safeDetailFor } from "../execution/verdict";
import { ProblemService } from "./problem.service";

@Injectable()
export class ValidationService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(EXECUTION_PROVIDER)
    private readonly provider: ExecutionProvider,
    private readonly problems: ProblemService,
  ) {}

  async validate(problemId: string, language: string) {
    const problem = await this.problems.require(problemId);
    if (problem.kind !== "ALGORITHMIC") {
      throw new BadRequestException(
        "Only an algorithmic problem is validated by execution",
      );
    }

    const configured = await this.problems.languageFor(problemId, language);
    if (!configured.referenceSolution) {
      throw new BadRequestException(
        "Set a reference solution for that language before validating",
      );
    }

    const cases = await this.problems.casesFor(problemId, "ALL");
    if (cases.length === 0) {
      throw new BadRequestException("That problem has no test cases");
    }
    const hidden = cases.filter((c) => c.visibility === "HIDDEN");
    if (hidden.length === 0) {
      throw new BadRequestException(
        "A problem must carry at least one hidden case before it can be validated",
      );
    }

    let outcome;
    try {
      outcome = await this.provider.execute({
        language,
        sourceCode: configured.referenceSolution,
        timeLimitMs: configured.timeLimitMs,
        memoryLimitMb: configured.memoryLimitMb,
        cases: cases.map((testCase) => ({
          ordinal: testCase.ordinal,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
        })),
      });
    } catch {
      await this.problems.markValidated(problemId, false);
      return {
        problemId,
        language,
        validated: false,
        verdict: "INTERNAL_ERROR" as const,
        failedCaseOrdinal: null,
        detail: safeDetailFor("INTERNAL_ERROR"),
      };
    }

    const judged = judge(outcome.cases);
    const validated = judged.verdict === "ACCEPTED";
    await this.problems.markValidated(problemId, validated);

    return {
      problemId,
      language,
      validated,
      verdict: judged.verdict,
      failedCaseOrdinal: judged.failedOrdinal,
      detail: validated
        ? "Every case passes the reference solution"
        : safeDetailFor(judged.verdict),
    };
  }
}
