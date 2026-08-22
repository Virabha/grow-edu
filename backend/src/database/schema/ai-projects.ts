import {
  pgTable,
  text,
  timestamp,
  decimal,
  index,
  unique,
} from "drizzle-orm/pg-core";

import { aiProjectFeedbackStatusEnum } from "./enums";
import { organizationId } from "./organizations";

export const aiProjectFeedbackDrafts = pgTable(
  "ai_project_feedback_drafts",
  {
    organizationId: organizationId(),
    draftId: text("draft_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    submissionId: text("submission_id").notNull(),
    status: aiProjectFeedbackStatusEnum("status").notNull().default("PENDING"),
    readabilitySummary: text("readability_summary"),
    structureSummary: text("structure_summary"),
    failureReason: text("failure_reason"),
    discardedAt: timestamp("discarded_at"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    submissionUnique: unique("ai_project_feedback_drafts_submission_unique").on(
      table.submissionId,
    ),
    statusIdx: index("ai_project_feedback_drafts_status_idx").on(
      table.status,
      table.createdAt,
    ),
  }),
);

export const aiProjectSuggestedScores = pgTable(
  "ai_project_suggested_scores",
  {
    suggestId: text("suggest_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    draftId: text("draft_id").notNull(),
    criterionId: text("criterion_id").notNull(),
    suggestedValue: decimal("suggested_value", {
      precision: 6,
      scale: 2,
    }).notNull(),
    rationale: text("rationale"),
  },
  (table) => ({
    onePerCriterion: unique("ai_project_suggested_scores_unique").on(
      table.draftId,
      table.criterionId,
    ),
    draftIdx: index("ai_project_suggested_scores_draft_idx").on(table.draftId),
  }),
);
