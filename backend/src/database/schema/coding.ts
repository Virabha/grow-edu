import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import type { ContentBlock } from "./assessment";
import {
  codingCaseVisibilityEnum,
  codingProblemKindEnum,
  codingProblemStatusEnum,
  codingRunKindEnum,
  codingRunStatusEnum,
  codingVerdictEnum,
} from "./enums";
import { organizationId } from "./organizations";

export const codingProblems = pgTable(
  "coding_problems",
  {
    organizationId: organizationId(),
    problemId: text("problem_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    kind: codingProblemKindEnum("kind").notNull().default("ALGORITHMIC"),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    statement: jsonb("statement").$type<ContentBlock[]>().notNull().default([]),
    constraintsText: jsonb("constraints_text")
      .$type<ContentBlock[]>()
      .notNull()
      .default([]),
    topicId: text("topic_id"),
    difficulty: integer("difficulty").notNull().default(1),
    status: codingProblemStatusEnum("status").notNull().default("DRAFT"),
    validatedAt: timestamp("validated_at"),
    publishedAt: timestamp("published_at"),
    createdBy: text("created_by").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    slugPerOrg: unique("coding_problems_organization_slug_unique").on(
      table.organizationId,
      table.slug,
    ),
    statusIdx: index("coding_problems_status_idx").on(
      table.status,
      table.difficulty,
    ),
    topicIdx: index("coding_problems_topic_idx").on(table.topicId),
  }),
);

export const codingProblemLanguages = pgTable(
  "coding_problem_languages",
  {
    organizationId: organizationId(),
    problemLanguageId: text("problem_language_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    problemId: text("problem_id").notNull(),
    language: text("language").notNull(),
    starterCode: text("starter_code").notNull().default(""),
    referenceSolution: text("reference_solution"),
    timeLimitMs: integer("time_limit_ms").notNull(),
    memoryLimitMb: integer("memory_limit_mb").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerLanguage: unique("coding_problem_languages_unique").on(
      table.problemId,
      table.language,
    ),
  }),
);

export const codingTestCases = pgTable(
  "coding_test_cases",
  {
    organizationId: organizationId(),
    caseId: text("case_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    problemId: text("problem_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    visibility: codingCaseVisibilityEnum("visibility").notNull(),
    input: text("input").notNull(),
    expectedOutput: text("expected_output").notNull(),
    explanation: text("explanation"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    ordinalPerProblem: unique("coding_test_cases_ordinal_unique").on(
      table.problemId,
      table.ordinal,
    ),
    visibilityIdx: index("coding_test_cases_visibility_idx").on(
      table.problemId,
      table.visibility,
    ),
  }),
);

export const codingFrontendAssertions = pgTable(
  "coding_frontend_assertions",
  {
    organizationId: organizationId(),
    assertionId: text("assertion_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    problemId: text("problem_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    visibility: codingCaseVisibilityEnum("visibility").notNull(),
    description: text("description").notNull(),
    script: text("script").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    ordinalPerProblem: unique("coding_frontend_assertions_ordinal_unique").on(
      table.problemId,
      table.ordinal,
    ),
  }),
);

export const codingEditorials = pgTable(
  "coding_editorials",
  {
    organizationId: organizationId(),
    editorialId: text("editorial_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    problemId: text("problem_id").notNull(),
    body: jsonb("body").$type<ContentBlock[]>().notNull().default([]),
    modelSolution: text("model_solution").notNull(),
    modelSolutionLanguage: text("model_solution_language").notNull(),
    timeComplexity: text("time_complexity").notNull(),
    spaceComplexity: text("space_complexity").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerProblem: unique("coding_editorials_problem_unique").on(
      table.problemId,
    ),
  }),
);

export const codingRuns = pgTable(
  "coding_runs",
  {
    organizationId: organizationId(),
    runId: text("run_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    problemId: text("problem_id").notNull(),
    userId: text("user_id").notNull(),
    kind: codingRunKindEnum("kind").notNull(),
    language: text("language").notNull(),
    sourceCode: text("source_code").notNull(),
    status: codingRunStatusEnum("status").notNull().default("PENDING"),
    verdict: codingVerdictEnum("verdict"),
    providerRef: text("provider_ref"),
    failedCaseOrdinal: integer("failed_case_ordinal"),
    failureDetail: text("failure_detail"),
    runtimeMs: integer("runtime_ms"),
    memoryKb: integer("memory_kb"),
    queuedAt: timestamp("queued_at").notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    historyIdx: index("coding_runs_history_idx").on(
      table.userId,
      table.problemId,
      table.queuedAt,
    ),
    providerIdx: index("coding_runs_provider_idx").on(table.providerRef),
    pendingIdx: index("coding_runs_pending_idx").on(table.status, table.queuedAt),
  }),
);

export const codingRunCaseResults = pgTable(
  "coding_run_case_results",
  {
    organizationId: organizationId(),
    resultId: text("result_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    runId: text("run_id").notNull(),
    caseOrdinal: integer("case_ordinal").notNull(),
    visibility: codingCaseVisibilityEnum("visibility").notNull(),
    passed: boolean("passed").notNull(),
    actualOutput: text("actual_output"),
    runtimeMs: integer("runtime_ms"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    onePerCase: unique("coding_run_case_results_unique").on(
      table.runId,
      table.caseOrdinal,
    ),
  }),
);

export const codingEditorDrafts = pgTable(
  "coding_editor_drafts",
  {
    organizationId: organizationId(),
    draftId: text("draft_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    problemId: text("problem_id").notNull(),
    language: text("language").notNull(),
    sourceCode: text("source_code").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerLanguage: unique("coding_editor_drafts_unique").on(
      table.userId,
      table.problemId,
      table.language,
    ),
  }),
);

export const codingGiveUps = pgTable(
  "coding_give_ups",
  {
    organizationId: organizationId(),
    giveUpId: text("give_up_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    problemId: text("problem_id").notNull(),
    givenUpAt: timestamp("given_up_at").notNull(),
  },
  (table) => ({
    onePerProblem: unique("coding_give_ups_unique").on(
      table.userId,
      table.problemId,
    ),
  }),
);

export const codingFrontendResults = pgTable(
  "coding_frontend_results",
  {
    organizationId: organizationId(),
    frontendResultId: text("frontend_result_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    problemId: text("problem_id").notNull(),
    passedOrdinals: jsonb("passed_ordinals").$type<number[]>().notNull(),
    passed: boolean("passed").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    userProblemIdx: index("coding_frontend_results_user_problem_idx").on(
      table.userId,
      table.problemId,
      table.createdAt,
    ),
  }),
);

export const codingExecutionUsage = pgTable(
  "coding_execution_usage",
  {
    organizationId: organizationId(),
    usageId: text("usage_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    runId: text("run_id").notNull(),
    kind: codingRunKindEnum("kind").notNull(),
    caseCount: integer("case_count").notNull().default(0),
    billedMs: integer("billed_ms").notNull().default(0),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    onePerRun: unique("coding_execution_usage_run_unique").on(table.runId),
    userIdx: index("coding_execution_usage_user_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const problemSets = pgTable(
  "problem_sets",
  {
    organizationId: organizationId(),
    setId: text("set_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description"),
    createdBy: text("created_by").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
);

export const problemSetItems = pgTable(
  "problem_set_items",
  {
    organizationId: organizationId(),
    itemId: text("item_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    setId: text("set_id").notNull(),
    problemId: text("problem_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
  },
  (table) => ({
    onePerProblem: unique("problem_set_items_unique").on(
      table.setId,
      table.problemId,
    ),
    ordinalIdx: index("problem_set_items_ordinal_idx").on(
      table.setId,
      table.ordinal,
    ),
  }),
);
