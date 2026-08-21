import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
  unique,
  customType,
} from "drizzle-orm/pg-core";
import { searchDocumentKindEnum } from "./enums";
import { organizationId } from "./organizations";

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});

export const studentProfiles = pgTable(
  "student_profiles",
  {
    organizationId: organizationId(),
    studentProfileId: text("student_profile_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    goalKey: text("goal_key"),
    goalSetAt: timestamp("goal_set_at"),
    level: text("level"),
    levelSetAt: timestamp("level_set_at"),
    lowBandwidth: boolean("low_bandwidth").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerUser: unique("student_profiles_user_unique").on(table.userId),
    goalIdx: index("student_profiles_goal_idx").on(table.goalKey),
  }),
);

export const batchWishlist = pgTable(
  "batch_wishlist",
  {
    organizationId: organizationId(),
    wishlistId: text("wishlist_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    batchId: text("batch_id").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    onePerBatch: unique("batch_wishlist_user_batch_unique").on(
      table.userId,
      table.batchId,
    ),
    userIdx: index("batch_wishlist_user_idx").on(table.userId, table.createdAt),
  }),
);

export const diagnosticResults = pgTable(
  "diagnostic_results",
  {
    organizationId: organizationId(),
    diagnosticResultId: text("diagnostic_result_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    testId: text("test_id").notNull(),
    attemptId: text("attempt_id").notNull(),
    goalKey: text("goal_key"),
    level: text("level").notNull(),
    recommendation: text("recommendation").notNull(),
    scoredPercent: integer("scored_percent").notNull(),
    supersededAt: timestamp("superseded_at"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    oneAttempt: unique("diagnostic_results_attempt_unique").on(table.attemptId),
    currentIdx: index("diagnostic_results_current_idx").on(
      table.userId,
      table.supersededAt,
    ),
  }),
);

export const searchDocuments = pgTable(
  "search_documents",
  {
    organizationId: organizationId(),
    searchDocumentId: text("search_document_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    kind: searchDocumentKindEnum("kind").notNull(),
    referenceId: text("reference_id").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    searchVector: tsvector("search_vector"),
    isListed: boolean("is_listed").notNull().default(true),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    oneDocPerReference: unique("search_documents_kind_reference_unique").on(
      table.kind,
      table.referenceId,
    ),
    listedIdx: index("search_documents_listed_idx").on(
      table.isListed,
      table.kind,
    ),
  }),
);

export const batchCompletionCriteria = pgTable(
  "batch_completion_criteria",
  {
    organizationId: organizationId(),
    criteriaId: text("criteria_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull(),
    minLessonCompletionPercent: integer("min_lesson_completion_percent")
      .notNull()
      .default(0),
    minAttendancePercent: integer("min_attendance_percent")
      .notNull()
      .default(0),
    minTestAveragePercent: integer("min_test_average_percent")
      .notNull()
      .default(0),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerBatch: unique("batch_completion_criteria_batch_unique").on(
      table.batchId,
    ),
  }),
);
