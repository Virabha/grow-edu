import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { notificationTypeEnum, videoEncodingJobStatusEnum } from "./enums";

// ─── Notifications ──────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
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

export const contactSubmissions = pgTable(
  "contact_submissions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    email: text("email").notNull(),
    mobile: text("mobile"),
    subject: text("subject").notNull(),
    courseInterested: text("course_interested"),
    role: text("role"),
    message: text("message").notNull(),
    documentUrl: text("document_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("contact_submissions_email_idx").on(table.email),
    createdAtIdx: index("contact_submissions_created_at_idx").on(table.createdAt),
  })
);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull().unique(),
    subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => ({
    emailIdx: index("newsletter_subscribers_email_idx").on(table.email),
    isActiveIdx: index("newsletter_subscribers_is_active_idx").on(table.isActive),
  })
);

export const videoEncodingJobs = pgTable(
  "video_encoding_jobs",
  {
    jobId: text("job_id").primaryKey(),
    lessonId: text("lesson_id").notNull(),
    courseId: text("course_id").notNull(),
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
    courseIdx: index("video_encoding_jobs_course_idx").on(table.courseId),
    statusIdx: index("video_encoding_jobs_status_idx").on(table.status),
  })
);
