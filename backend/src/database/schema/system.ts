import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { notificationTypeEnum, videoEncodingJobStatusEnum } from "./enums";
import { organizationId } from "./organizations";

// ─── Notifications ──────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    organizationId: organizationId(),
    notificationId: text("notification_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    batchId: text("batch_id"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("notifications_user_idx").on(table.userId),
    userReadIdx: index("notifications_user_read_idx").on(table.userId, table.read),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
  })
);

export const videoEncodingJobs = pgTable(
  "video_encoding_jobs",
  {
    organizationId: organizationId(),
    jobId: text("job_id").primaryKey(),
    lessonId: text("lesson_id").notNull(),
    batchId: text("batch_id").notNull(),
    status: videoEncodingJobStatusEnum("status").notNull().default("PENDING"),
    inputPath: text("input_path").notNull(),
    outputPath: text("output_path"),
    errorMessage: text("error_message"),
    duration: integer("duration"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    lessonIdx: index("video_encoding_jobs_lesson_idx").on(table.lessonId),
    batchIdx: index("video_encoding_jobs_batch_idx").on(table.batchId),
    statusIdx: index("video_encoding_jobs_status_idx").on(table.status),
  })
);
