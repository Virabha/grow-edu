import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";

import { aiCodeReviewStatusEnum } from "./enums";
import { organizationId } from "./organizations";

export const aiCodeReviews = pgTable(
  "ai_code_reviews",
  {
    organizationId: organizationId(),
    reviewId: text("review_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    runId: text("run_id").notNull(),
    status: aiCodeReviewStatusEnum("status").notNull().default("PENDING"),
    approach: text("approach"),
    complexity: text("complexity"),
    naming: text("naming"),
    structure: text("structure"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    runUnique: unique("ai_code_reviews_run_unique").on(table.runId),
    statusIdx: index("ai_code_reviews_status_idx").on(
      table.status,
      table.createdAt,
    ),
  }),
);

export const codingHintRequests = pgTable(
  "coding_hint_requests",
  {
    organizationId: organizationId(),
    requestId: text("request_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    runId: text("run_id").notNull(),
    userId: text("user_id").notNull(),
    hintLevel: integer("hint_level").notNull(),
    hintText: text("hint_text").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    levelPerRun: unique("coding_hint_requests_level_unique").on(
      table.runId,
      table.hintLevel,
    ),
    userIdx: index("coding_hint_requests_user_idx").on(
      table.userId,
      table.createdAt,
    ),
    runIdx: index("coding_hint_requests_run_idx").on(table.runId),
  }),
);
