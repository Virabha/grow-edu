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

import {
  assessmentPartialCreditRuleEnum,
  assessmentQuestionTypeEnum,
  assessmentTaxonomyKindEnum,
  assessmentToleranceKindEnum,
  questionReviewStatusEnum,
} from "./enums";
import { organizationId } from "./organizations";

export type ContentBlock =
  | { type: "TEXT"; text: string }
  | { type: "MATH"; latex: string }
  | { type: "CODE"; language: string; code: string }
  | { type: "IMAGE"; fileId: string; alt?: string };

export type QuestionOption = { id: string; content: ContentBlock[] };

export type QuestionAnswerKey =
  | { kind: "SINGLE"; optionId: string }
  | { kind: "MULTIPLE"; optionIds: string[] }
  | { kind: "NUMERIC"; value: number };

export const assessmentTaxonomyNodes = pgTable(
  "assessment_taxonomy_nodes",
  {
    organizationId: organizationId(),
    nodeId: text("node_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    kind: assessmentTaxonomyKindEnum("kind").notNull(),
    parentId: text("parent_id"),
    name: text("name").notNull(),
    isRetired: boolean("is_retired").notNull().default(false),
    retiredAt: timestamp("retired_at"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    parentIdx: index("assessment_taxonomy_nodes_parent_idx").on(table.parentId),
    kindIdx: index("assessment_taxonomy_nodes_kind_idx").on(table.kind),
  }),
);

export const assessmentDifficultyLevels = pgTable(
  "assessment_difficulty_levels",
  {
    organizationId: organizationId(),
    levelId: text("level_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ordinal: integer("ordinal").notNull(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    ordinalUnique: unique("assessment_difficulty_levels_ordinal_unique").on(
      table.organizationId,
      table.ordinal,
    ),
  }),
);

export const assessmentQuestionGroups = pgTable(
  "assessment_question_groups",
  {
    organizationId: organizationId(),
    groupId: text("group_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    stimulus: jsonb("stimulus").$type<ContentBlock[]>().notNull().default([]),
    isRetired: boolean("is_retired").notNull().default(false),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
);

export const assessmentQuestions = pgTable(
  "assessment_questions",
  {
    organizationId: organizationId(),
    questionId: text("question_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: assessmentQuestionTypeEnum("type").notNull(),
    subjectId: text("subject_id").notNull(),
    topicId: text("topic_id").notNull(),
    subTopicId: text("sub_topic_id"),
    authoredDifficulty: integer("authored_difficulty").notNull(),
    observedDifficulty: decimal("observed_difficulty", {
      precision: 6,
      scale: 3,
    }),
    observedAttemptCount: integer("observed_attempt_count")
      .notNull()
      .default(0),
    groupId: text("group_id"),
    groupOrder: integer("group_order"),
    currentVersion: integer("current_version").notNull().default(1),
    reviewStatus: questionReviewStatusEnum("review_status"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    isRetired: boolean("is_retired").notNull().default(false),
    retiredAt: timestamp("retired_at"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    subjectIdx: index("assessment_questions_subject_idx").on(table.subjectId),
    topicIdx: index("assessment_questions_topic_idx").on(table.topicId),
    subTopicIdx: index("assessment_questions_sub_topic_idx").on(
      table.subTopicId,
    ),
    groupIdx: index("assessment_questions_group_idx").on(table.groupId),
    difficultyIdx: index("assessment_questions_difficulty_idx").on(
      table.authoredDifficulty,
    ),
  }),
);

export const assessmentQuestionVersions = pgTable(
  "assessment_question_versions",
  {
    organizationId: organizationId(),
    questionVersionId: text("question_version_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    questionId: text("question_id").notNull(),
    version: integer("version").notNull(),
    prompt: jsonb("prompt").$type<ContentBlock[]>().notNull(),
    options: jsonb("options").$type<QuestionOption[]>().notNull().default([]),
    answerKey: jsonb("answer_key").$type<QuestionAnswerKey | null>(),
    explanation: jsonb("explanation")
      .$type<ContentBlock[]>()
      .notNull()
      .default([]),
    partialCreditRule: assessmentPartialCreditRuleEnum("partial_credit_rule"),
    toleranceKind: assessmentToleranceKindEnum("tolerance_kind"),
    tolerance: decimal("tolerance", { precision: 12, scale: 6 }),
    searchText: text("search_text").notNull().default(""),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    questionIdx: index("assessment_question_versions_question_idx").on(
      table.questionId,
    ),
    versionUnique: unique("assessment_question_versions_unique").on(
      table.questionId,
      table.version,
    ),
  }),
);
