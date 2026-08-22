import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";

import {
  aiBatchItemStateEnum,
  aiBatchStatusEnum,
  aiCallOutcomeEnum,
} from "./enums";
import { organizationId } from "./organizations";

export const aiModelCalls = pgTable(
  "ai_model_calls",
  {
    organizationId: organizationId(),
    callId: text("call_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    feature: text("feature").notNull(),
    model: text("model").notNull(),
    outcome: aiCallOutcomeEnum("outcome").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
    batched: text("batched").notNull().default("NO"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    featureIdx: index("ai_model_calls_feature_idx").on(
      table.organizationId,
      table.feature,
      table.createdAt,
    ),
    createdIdx: index("ai_model_calls_created_idx").on(table.createdAt),
  }),
);

export const aiBatches = pgTable(
  "ai_batches",
  {
    organizationId: organizationId(),
    batchId: text("batch_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    feature: text("feature").notNull(),
    model: text("model").notNull(),
    providerReference: text("provider_reference"),
    status: aiBatchStatusEnum("status").notNull().default("SUBMITTED"),
    requestedBy: text("requested_by"),
    failureReason: text("failure_reason"),
    submittedAt: timestamp("submitted_at").notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    statusIdx: index("ai_batches_status_idx").on(table.status),
  }),
);

export const aiBatchItems = pgTable(
  "ai_batch_items",
  {
    itemId: text("item_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull(),
    reference: text("reference").notNull(),
    state: aiBatchItemStateEnum("state").notNull().default("PENDING"),
    context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}),
    resultText: text("result_text"),
    resultStructured: jsonb("result_structured").$type<unknown>(),
    failureReason: text("failure_reason"),
    reconciledAt: timestamp("reconciled_at"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    referencePerBatch: unique("ai_batch_items_reference_unique").on(
      table.batchId,
      table.reference,
    ),
    stateIdx: index("ai_batch_items_state_idx").on(table.batchId, table.state),
  }),
);
