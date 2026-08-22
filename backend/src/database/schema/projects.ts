import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import type { ContentBlock } from "./assessment";
import {
  projectCheckStatusEnum,
  projectMilestoneStateEnum,
  projectSimilaritySourceEnum,
} from "./enums";
import { organizationId } from "./organizations";

export const projects = pgTable(
  "projects",
  {
    organizationId: organizationId(),
    projectId: text("project_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    brief: jsonb("brief").$type<ContentBlock[]>().notNull().default([]),
    requirements: jsonb("requirements").$type<string[]>().notNull().default([]),
    rubricId: text("rubric_id").notNull(),
    starterRepositoryUrl: text("starter_repository_url"),
    createdBy: text("created_by").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    rubricIdx: index("projects_rubric_idx").on(table.rubricId),
  }),
);

export const projectMilestones = pgTable(
  "project_milestones",
  {
    organizationId: organizationId(),
    milestoneId: text("milestone_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    title: text("title").notNull(),
    description: jsonb("description").$type<ContentBlock[]>().notNull().default([]),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    ordinalPerProject: unique("project_milestones_ordinal_unique").on(
      table.projectId,
      table.ordinal,
    ),
    projectIdx: index("project_milestones_project_idx").on(
      table.projectId,
      table.ordinal,
    ),
  }),
);

export const projectMilestoneProgress = pgTable(
  "project_milestone_progress",
  {
    organizationId: organizationId(),
    progressId: text("progress_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id").notNull(),
    milestoneId: text("milestone_id").notNull(),
    userId: text("user_id").notNull(),
    state: projectMilestoneStateEnum("state").notNull().default("LOCKED"),
    cycle: integer("cycle").notNull().default(0),
    openedAt: timestamp("opened_at"),
    passedAt: timestamp("passed_at"),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerMilestone: unique("project_milestone_progress_unique").on(
      table.milestoneId,
      table.userId,
    ),
    userProjectIdx: index("project_milestone_progress_user_idx").on(
      table.userId,
      table.projectId,
    ),
  }),
);

export const projectSubmissions = pgTable(
  "project_submissions",
  {
    organizationId: organizationId(),
    submissionId: text("submission_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id").notNull(),
    milestoneId: text("milestone_id").notNull(),
    userId: text("user_id").notNull(),
    cycle: integer("cycle").notNull(),
    repositoryUrl: text("repository_url").notNull(),
    deploymentUrl: text("deployment_url"),
    submittedAt: timestamp("submitted_at").notNull(),
    screenedAt: timestamp("screened_at"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedBy: text("reviewed_by"),
    outcome: projectMilestoneStateEnum("outcome"),
  },
  (table) => ({
    oneCycle: unique("project_submissions_cycle_unique").on(
      table.milestoneId,
      table.userId,
      table.cycle,
    ),
    queueIdx: index("project_submissions_queue_idx").on(
      table.reviewedAt,
      table.submittedAt,
    ),
    userIdx: index("project_submissions_user_idx").on(
      table.userId,
      table.submittedAt,
    ),
  }),
);

export const projectCheckRuns = pgTable(
  "project_check_runs",
  {
    organizationId: organizationId(),
    checkRunId: text("check_run_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    submissionId: text("submission_id").notNull(),
    buildStatus: projectCheckStatusEnum("build_status")
      .notNull()
      .default("PENDING"),
    lintStatus: projectCheckStatusEnum("lint_status")
      .notNull()
      .default("PENDING"),
    testStatus: projectCheckStatusEnum("test_status")
      .notNull()
      .default("PENDING"),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    harnessError: text("harness_error"),
    startedAt: timestamp("started_at").notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    onePerSubmission: unique("project_check_runs_submission_unique").on(
      table.submissionId,
    ),
  }),
);

export const projectSimilarityFlags = pgTable(
  "project_similarity_flags",
  {
    organizationId: organizationId(),
    flagId: text("flag_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    submissionId: text("submission_id").notNull(),
    source: projectSimilaritySourceEnum("source").notNull(),
    comparedSubmissionId: text("compared_submission_id"),
    comparedSourceLabel: text("compared_source_label"),
    score: decimal("score", { precision: 5, scale: 2 }).notNull(),
    matchedRegions: jsonb("matched_regions")
      .$type<{ path: string; startLine: number; endLine: number }[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    submissionIdx: index("project_similarity_flags_submission_idx").on(
      table.submissionId,
      table.score,
    ),
  }),
);

export const projectReviews = pgTable(
  "project_reviews",
  {
    organizationId: organizationId(),
    reviewId: text("review_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    submissionId: text("submission_id").notNull(),
    reviewerId: text("reviewer_id").notNull(),
    outcome: projectMilestoneStateEnum("outcome").notNull(),
    summary: text("summary"),
    feedbackMediaId: text("feedback_media_id"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    onePerSubmission: unique("project_reviews_submission_unique").on(
      table.submissionId,
    ),
  }),
);

export const projectCriterionScores = pgTable(
  "project_criterion_scores",
  {
    organizationId: organizationId(),
    scoreId: text("score_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    submissionId: text("submission_id").notNull(),
    criterionId: text("criterion_id").notNull(),
    value: decimal("value", { precision: 6, scale: 2 }).notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    oneScore: unique("project_criterion_scores_unique").on(
      table.submissionId,
      table.criterionId,
    ),
    submissionIdx: index("project_criterion_scores_submission_idx").on(
      table.submissionId,
    ),
  }),
);
