import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { ContentBlock, QuestionAnswerKey } from "./assessment";
import {
  assessmentAnomalyKindEnum,
  assessmentAnswerStatusEnum,
  assessmentAttemptStatusEnum,
  assessmentImportStatusEnum,
  assessmentPracticeKindEnum,
  assessmentRegradeStatusEnum,
} from "./enums";
import { organizationId } from "./organizations";

export const assessmentTests = pgTable(
  "assessment_tests",
  {
    organizationId: organizationId(),
    testId: text("test_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id"),
    title: text("title").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    maxAttempts: integer("max_attempts").notNull().default(1),
    negativeMarkPercent: decimal("negative_mark_percent", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),
    scoreFloor: decimal("score_floor", { precision: 8, scale: 2 })
      .notNull()
      .default("0"),
    passingPercent: decimal("passing_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("40"),
    showLeaderboard: boolean("show_leaderboard").notNull().default(true),
    showSolutions: boolean("show_solutions").notNull().default(true),
    examLabel: text("exam_label"),
    examYear: integer("exam_year"),
    paperLabel: text("paper_label"),
    opensAt: timestamp("opens_at"),
    closesAt: timestamp("closes_at"),
    publishedAt: timestamp("published_at"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    batchIdx: index("assessment_tests_batch_idx").on(table.batchId),
    examIdx: index("assessment_tests_exam_idx").on(
      table.examLabel,
      table.examYear,
    ),
  }),
);

export const assessmentTestQuestions = pgTable(
  "assessment_test_questions",
  {
    organizationId: organizationId(),
    placementId: text("placement_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    testId: text("test_id").notNull(),
    questionId: text("question_id").notNull(),
    groupId: text("group_id"),
    order: integer("order").notNull(),
    sectionName: text("section_name"),
    marks: decimal("marks", { precision: 6, scale: 2 }).notNull().default("1"),
    negativeMarkPercent: decimal("negative_mark_percent", {
      precision: 5,
      scale: 2,
    }),
    rubricId: text("rubric_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    testIdx: index("assessment_test_questions_test_idx").on(table.testId),
    questionIdx: index("assessment_test_questions_question_idx").on(
      table.questionId,
    ),
    placementUnique: unique("assessment_test_questions_unique").on(
      table.testId,
      table.questionId,
    ),
  }),
);

export const assessmentAttempts = pgTable(
  "assessment_attempts",
  {
    organizationId: organizationId(),
    attemptId: text("attempt_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    testId: text("test_id").notNull(),
    userId: text("user_id").notNull(),
    attemptNo: integer("attempt_no").notNull().default(1),
    status: assessmentAttemptStatusEnum("status")
      .notNull()
      .default("IN_PROGRESS"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    submittedAt: timestamp("submitted_at"),
    expiresAt: timestamp("expires_at").notNull(),
    gradedAt: timestamp("graded_at"),
    provisionalScore: decimal("provisional_score", { precision: 8, scale: 2 }),
    finalScore: decimal("final_score", { precision: 8, scale: 2 }),
    pendingMarks: decimal("pending_marks", { precision: 8, scale: 2 }),
    maxScore: decimal("max_score", { precision: 8, scale: 2 }),
    correctCount: integer("correct_count").notNull().default(0),
    wrongCount: integer("wrong_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    testIdx: index("assessment_attempts_test_idx").on(table.testId),
    userIdx: index("assessment_attempts_user_idx").on(table.userId),
    attemptUnique: unique("assessment_attempts_unique").on(
      table.testId,
      table.userId,
      table.attemptNo,
    ),
  }),
);

export const assessmentAttemptAnswers = pgTable(
  "assessment_attempt_answers",
  {
    organizationId: organizationId(),
    answerId: text("answer_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    attemptId: text("attempt_id").notNull(),
    placementId: text("placement_id").notNull(),
    questionId: text("question_id").notNull(),
    questionVersion: integer("question_version").notNull(),
    response: jsonb("response").$type<unknown>(),
    elapsedSeconds: integer("elapsed_seconds").notNull().default(0),
    isSkipped: boolean("is_skipped").notNull().default(true),
    isCorrect: boolean("is_correct"),
    awardedMarks: decimal("awarded_marks", { precision: 8, scale: 2 }),
    status: assessmentAnswerStatusEnum("status")
      .notNull()
      .default("AUTO_SCORED"),
    graderComment: text("grader_comment"),
    gradedBy: text("graded_by"),
    gradedAt: timestamp("graded_at"),
    feedbackMediaId: text("feedback_media_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    attemptIdx: index("assessment_attempt_answers_attempt_idx").on(
      table.attemptId,
    ),
    questionIdx: index("assessment_attempt_answers_question_idx").on(
      table.questionId,
    ),
    statusIdx: index("assessment_attempt_answers_status_idx").on(table.status),
    answerUnique: unique("assessment_attempt_answers_unique").on(
      table.attemptId,
      table.placementId,
    ),
  }),
);

export const assessmentRubrics = pgTable("assessment_rubrics", {
  organizationId: organizationId(),
  rubricId: text("rubric_id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  scaleMax: integer("scale_max").notNull().default(5),
  isRetired: boolean("is_retired").notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const assessmentRubricCriteria = pgTable(
  "assessment_rubric_criteria",
  {
    organizationId: organizationId(),
    criterionId: text("criterion_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    rubricId: text("rubric_id").notNull(),
    label: text("label").notNull(),
    weight: decimal("weight", { precision: 6, scale: 3 })
      .notNull()
      .default("1"),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    rubricIdx: index("assessment_rubric_criteria_rubric_idx").on(
      table.rubricId,
    ),
  }),
);

export const assessmentCriterionScores = pgTable(
  "assessment_criterion_scores",
  {
    organizationId: organizationId(),
    scoreId: text("score_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    answerId: text("answer_id").notNull(),
    criterionId: text("criterion_id").notNull(),
    value: decimal("value", { precision: 6, scale: 2 }).notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    answerIdx: index("assessment_criterion_scores_answer_idx").on(
      table.answerId,
    ),
    scoreUnique: unique("assessment_criterion_scores_unique").on(
      table.answerId,
      table.criterionId,
    ),
  }),
);

export const assessmentRegradeRequests = pgTable(
  "assessment_regrade_requests",
  {
    organizationId: organizationId(),
    requestId: text("request_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    answerId: text("answer_id").notNull(),
    attemptId: text("attempt_id").notNull(),
    studentId: text("student_id").notNull(),
    reason: text("reason").notNull(),
    status: assessmentRegradeStatusEnum("status").notNull().default("OPEN"),
    originalMarks: decimal("original_marks", { precision: 8, scale: 2 }),
    resolvedMarks: decimal("resolved_marks", { precision: 8, scale: 2 }),
    justification: text("justification"),
    resolvedBy: text("resolved_by"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    answerIdx: index("assessment_regrade_requests_answer_idx").on(
      table.answerId,
    ),
    statusIdx: index("assessment_regrade_requests_status_idx").on(table.status),
  }),
);

export const assessmentErrorNotebook = pgTable(
  "assessment_error_notebook",
  {
    organizationId: organizationId(),
    entryId: text("entry_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    questionId: text("question_id").notNull(),
    questionVersion: integer("question_version").notNull(),
    attemptId: text("attempt_id").notNull(),
    answerId: text("answer_id").notNull(),
    topicId: text("topic_id").notNull(),
    givenAnswer: jsonb("given_answer").$type<unknown>(),
    correctAnswer: jsonb("correct_answer").$type<QuestionAnswerKey | null>(),
    explanation: jsonb("explanation")
      .$type<ContentBlock[]>()
      .notNull()
      .default([]),
    isResolved: boolean("is_resolved").notNull().default(false),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("assessment_error_notebook_user_idx").on(table.userId),
    entryUnique: unique("assessment_error_notebook_unique").on(table.answerId),
  }),
);

export const assessmentImports = pgTable("assessment_imports", {
  organizationId: organizationId(),
  importId: text("import_id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  status: assessmentImportStatusEnum("status").notNull().default("PARSED"),
  rowCount: integer("row_count").notNull().default(0),
  validCount: integer("valid_count").notNull().default(0),
  invalidCount: integer("invalid_count").notNull().default(0),
  processedCount: integer("processed_count").notNull().default(0),
  failureReason: text("failure_reason"),
  committedAt: timestamp("committed_at"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const assessmentImportRows = pgTable(
  "assessment_import_rows",
  {
    organizationId: organizationId(),
    rowId: text("row_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    importId: text("import_id").notNull(),
    rowNumber: integer("row_number").notNull(),
    raw: jsonb("raw").$type<Record<string, unknown>>().notNull(),
    parsed: jsonb("parsed").$type<Record<string, unknown> | null>(),
    isValid: boolean("is_valid").notNull().default(false),
    errors: jsonb("errors").$type<string[]>().notNull().default([]),
    questionId: text("question_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    importIdx: index("assessment_import_rows_import_idx").on(table.importId),
    rowUnique: unique("assessment_import_rows_unique").on(
      table.importId,
      table.rowNumber,
    ),
  }),
);

export const assessmentTestStats = pgTable("assessment_test_stats", {
  organizationId: organizationId(),
  testId: text("test_id").primaryKey(),
  figures: jsonb("figures").$type<Record<string, unknown>>().notNull(),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
});

export const assessmentQuestionStats = pgTable("assessment_question_stats", {
  organizationId: organizationId(),
  questionId: text("question_id").primaryKey(),
  attemptCount: integer("attempt_count").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  meanSeconds: decimal("mean_seconds", { precision: 10, scale: 2 }),
  optionDistribution: jsonb("option_distribution")
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
});

export const assessmentWeakTopics = pgTable(
  "assessment_weak_topics",
  {
    organizationId: organizationId(),
    entryId: text("entry_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    topicId: text("topic_id").notNull(),
    attempted: integer("attempted").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    accuracy: decimal("accuracy", { precision: 6, scale: 4 }).notNull(),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("assessment_weak_topics_user_idx").on(table.userId),
    weakUnique: unique("assessment_weak_topics_unique").on(
      table.userId,
      table.topicId,
    ),
  }),
);

export const assessmentPracticeSets = pgTable(
  "assessment_practice_sets",
  {
    organizationId: organizationId(),
    setId: text("set_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    kind: assessmentPracticeKindEnum("kind").notNull(),
    batchId: text("batch_id"),
    topicId: text("topic_id"),
    forDate: text("for_date"),
    testId: text("test_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("assessment_practice_sets_user_idx").on(table.userId),
    dailyUnique: unique("assessment_practice_sets_daily_unique").on(
      table.userId,
      table.kind,
      table.forDate,
    ),
  }),
);

export const assessmentQuestionsServed = pgTable(
  "assessment_questions_served",
  {
    organizationId: organizationId(),
    servedId: text("served_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    questionId: text("question_id").notNull(),
    topicId: text("topic_id").notNull(),
    difficulty: integer("difficulty").notNull(),
    wasCorrect: boolean("was_correct"),
    servedAt: timestamp("served_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("assessment_questions_served_user_idx").on(table.userId),
    userQuestionIdx: index("assessment_questions_served_user_question_idx").on(
      table.userId,
      table.questionId,
    ),
  }),
);

export const assessmentAnomalyFlags = pgTable(
  "assessment_anomaly_flags",
  {
    organizationId: organizationId(),
    flagId: text("flag_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    attemptId: text("attempt_id").notNull(),
    testId: text("test_id").notNull(),
    userId: text("user_id").notNull(),
    kind: assessmentAnomalyKindEnum("kind").notNull(),
    reason: text("reason").notNull(),
    detail: jsonb("detail")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    attemptIdx: index("assessment_anomaly_flags_attempt_idx").on(
      table.attemptId,
    ),
    testIdx: index("assessment_anomaly_flags_test_idx").on(table.testId),
  }),
);
