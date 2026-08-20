import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";
import {
  assignmentSubmissionTypeEnum,
  assignmentSubmissionStatusEnum,
} from "./enums";
import { organizationId } from "./organizations";

export const assignments = pgTable(
  "assignments",
  {
    organizationId: organizationId(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull(),
    instructorId: text("instructor_id").notNull(),
    title: text("title").notNull(),
    instructions: text("instructions"),
    submissionType: assignmentSubmissionTypeEnum("submission_type")
      .notNull()
      .default("FILE"),
    maxMarks: integer("max_marks").notNull().default(100),
    passMarks: integer("pass_marks").notNull().default(40),
    dueAt: timestamp("due_at"),
    allowResubmission: boolean("allow_resubmission").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(false),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    batchIdx: index("assignments_batch_idx").on(table.batchId),
    instructorIdx: index("assignments_instructor_idx").on(table.instructorId, table.createdAt),
    publishedIdx: index("assignments_published_idx").on(table.isPublished, table.dueAt),
  }),
);

export const assignmentSubmissions = pgTable(
  "assignment_submissions",
  {
    organizationId: organizationId(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    assignmentId: text("assignment_id").notNull(),
    userId: text("user_id").notNull(),
    attemptNo: integer("attempt_no").notNull().default(1),
    fileKey: text("file_key"),
    textAnswer: text("text_answer"),
    linkUrl: text("link_url"),
    status: assignmentSubmissionStatusEnum("status").notNull().default("SUBMITTED"),
    marks: integer("marks"),
    feedback: text("feedback"),
    gradedBy: text("graded_by"),
    gradedAt: timestamp("graded_at"),
    submittedAt: timestamp("submitted_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    assignmentIdx: index("assignment_submissions_assignment_idx").on(table.assignmentId, table.submittedAt),
    userIdx: index("assignment_submissions_user_idx").on(table.userId, table.submittedAt),
    statusIdx: index("assignment_submissions_status_idx").on(table.status),
    oneAttempt: unique("assignment_submissions_assignment_user_attempt_unique").on(
      table.assignmentId,
      table.userId,
      table.attemptNo,
    ),
  }),
);
