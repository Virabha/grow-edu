import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";

import { aiDoubtAnswerStatusEnum, aiDoubtDraftStatusEnum } from "./enums";
import { organizationId } from "./organizations";

export interface DoubtCitation {
  lessonId: string;
  title: string;
}

export const aiDoubtAnswers = pgTable(
  "ai_doubt_answers",
  {
    organizationId: organizationId(),
    answerId: text("answer_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    doubtId: text("doubt_id").notNull(),
    batchId: text("batch_id").notNull(),
    askedBy: text("asked_by").notNull(),
    subjectId: text("subject_id"),
    topicId: text("topic_id"),
    source: text("source").notNull().default("AI"),
    status: aiDoubtAnswerStatusEnum("status").notNull().default("PENDING"),
    answerText: text("answer_text"),
    citations: jsonb("citations")
      .$type<DoubtCitation[]>()
      .notNull()
      .default([]),
    replyId: text("reply_id"),
    markedUnhelpfulAt: timestamp("marked_unhelpful_at"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    doubtUnique: unique("ai_doubt_answers_doubt_unique").on(table.doubtId),
    pendingIdx: index("ai_doubt_answers_pending_idx").on(
      table.status,
      table.createdAt,
    ),
    batchIdx: index("ai_doubt_answers_batch_idx").on(
      table.batchId,
      table.markedUnhelpfulAt,
    ),
  }),
);

export const aiDoubtDrafts = pgTable(
  "ai_doubt_drafts",
  {
    organizationId: organizationId(),
    draftId: text("draft_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    doubtId: text("doubt_id").notNull(),
    batchId: text("batch_id").notNull(),
    answerId: text("answer_id").notNull(),
    draftText: text("draft_text").notNull(),
    status: aiDoubtDraftStatusEnum("status").notNull().default("PENDING"),
    committedAt: timestamp("committed_at"),
    committedReplyId: text("committed_reply_id"),
    isDiscarded: boolean("is_discarded").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    doubtIdx: index("ai_doubt_drafts_doubt_idx").on(table.doubtId),
    answerIdx: index("ai_doubt_drafts_answer_idx").on(table.answerId),
    doubtUnique: unique("ai_doubt_drafts_doubt_unique").on(table.doubtId),
  }),
);
