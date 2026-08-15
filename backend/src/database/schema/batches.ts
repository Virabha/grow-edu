import {
  pgTable,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import {
  batchStatusEnum,
  batchEnrollmentStatusEnum,
  batchSessionTypeEnum,
  batchLiveProviderEnum,
  batchSessionStatusEnum,
  batchResourceTypeEnum,
  batchDoubtStatusEnum,
  batchQuizQuestionTypeEnum,
  batchQuizAttemptStatusEnum,
} from "./enums";

// ─── Batches (PW-style cohorts) ──────────────────────────────────────────────

export const batches = pgTable(
  "batches",
  {
    batchId: text("batch_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    shortDescription: text("short_description"),
    targetExam: text("target_exam"),
    language: text("language").notNull().default("English"),
    thumbnail: text("thumbnail"),
    bannerImage: text("banner_image"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
    compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
    currency: text("currency").notNull().default("INR"),
    capacity: integer("capacity"),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    teacherIds: jsonb("teacher_ids").$type<string[]>().notNull().default([]),
    categoryId: text("category_id"),
    status: batchStatusEnum("status").notNull().default("DRAFT"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    publishedAt: timestamp("published_at"),
  },
  (table) => ({
    slugIdx: index("batches_slug_idx").on(table.slug),
    statusIdx: index("batches_status_idx").on(table.status),
    startDateIdx: index("batches_start_date_idx").on(table.startDate),
  })
);

export const batchSubjects = pgTable(
  "batch_subjects",
  {
    subjectId: text("subject_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull(),
    name: text("name").notNull(),
    color: text("color"),
    displayOrder: integer("display_order").notNull().default(0),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    batchIdx: index("batch_subjects_batch_idx").on(table.batchId),
  })
);

export const batchEnrollments = pgTable(
  "batch_enrollments",
  {
    enrollmentId: text("enrollment_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull(),
    userId: text("user_id").notNull(),
    status: batchEnrollmentStatusEnum("status").notNull().default("ACTIVE"),
    accessStartsAt: timestamp("access_starts_at").notNull().defaultNow(),
    accessEndsAt: timestamp("access_ends_at"),
    grantedBy: text("granted_by"),
    paymentId: text("payment_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    batchIdx: index("batch_enrollments_batch_idx").on(table.batchId),
    userIdx: index("batch_enrollments_user_idx").on(table.userId),
    uniqueBatchUser: unique("batch_enrollments_batch_user_unique").on(
      table.batchId,
      table.userId
    ),
  })
);

export const batchSessions = pgTable(
  "batch_sessions",
  {
    sessionId: text("session_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull(),
    subjectId: text("subject_id"),
    teacherId: text("teacher_id"),
    title: text("title").notNull(),
    description: text("description"),
    type: batchSessionTypeEnum("type").notNull(),
    // For LIVE sessions
    liveProvider: batchLiveProviderEnum("live_provider"),
    joinUrl: text("join_url"),
    meetingId: text("meeting_id"),
    meetingPasscode: text("meeting_passcode"),
    scheduledStartAt: timestamp("scheduled_start_at"),
    scheduledEndAt: timestamp("scheduled_end_at"),
    actualStartAt: timestamp("actual_start_at"),
    actualEndAt: timestamp("actual_end_at"),
    status: batchSessionStatusEnum("status").notNull().default("SCHEDULED"),
    // For RECORDING sessions (or live → archived)
    recordingVideoId: text("recording_video_id"),
    recordingDurationSeconds: integer("recording_duration_seconds"),
    recordingThumbnail: text("recording_thumbnail"),
    resources: jsonb("resources").$type<{ label: string; url: string }[]>(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    batchIdx: index("batch_sessions_batch_idx").on(table.batchId),
    subjectIdx: index("batch_sessions_subject_idx").on(table.subjectId),
    scheduledStartIdx: index("batch_sessions_scheduled_start_idx").on(
      table.scheduledStartAt
    ),
    typeIdx: index("batch_sessions_type_idx").on(table.type),
  })
);

export const batchAnnouncements = pgTable(
  "batch_announcements",
  {
    announcementId: text("announcement_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull(),
    authorId: text("author_id").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    batchIdx: index("batch_announcements_batch_idx").on(table.batchId),
    createdAtIdx: index("batch_announcements_created_at_idx").on(table.createdAt),
  })
);

// ─── Batch resources (DPP / Notes / Reference) ──────────────────────────────

export const batchResources = pgTable(
  "batch_resources",
  {
    resourceId: text("resource_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull(),
    subjectId: text("subject_id"),
    title: text("title").notNull(),
    description: text("description"),
    type: batchResourceTypeEnum("type").notNull(),
    fileKey: text("file_key").notNull(),
    fileSize: integer("file_size"),
    pageCount: integer("page_count"),
    dayNumber: integer("day_number"), // For DPP: day 1, 2, 3…
    publishAt: timestamp("publish_at"), // Optional scheduled publish
    uploadedBy: text("uploaded_by").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    batchIdx: index("batch_resources_batch_idx").on(table.batchId),
    typeIdx: index("batch_resources_type_idx").on(table.type),
    subjectIdx: index("batch_resources_subject_idx").on(table.subjectId),
  })
);

// ─── Doubts ─────────────────────────────────────────────────────────────────

export const batchDoubts = pgTable(
  "batch_doubts",
  {
    doubtId: text("doubt_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull(),
    subjectId: text("subject_id"),
    askedBy: text("asked_by").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    attachments: jsonb("attachments").$type<string[]>().default([]),
    status: batchDoubtStatusEnum("status").notNull().default("OPEN"),
    replyCount: integer("reply_count").notNull().default(0),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    batchIdx: index("batch_doubts_batch_idx").on(table.batchId),
    statusIdx: index("batch_doubts_status_idx").on(table.status),
    askedByIdx: index("batch_doubts_asked_by_idx").on(table.askedBy),
  })
);

export const batchDoubtReplies = pgTable(
  "batch_doubt_replies",
  {
    replyId: text("reply_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    doubtId: text("doubt_id").notNull(),
    authorId: text("author_id").notNull(),
    body: text("body").notNull(),
    attachments: jsonb("attachments").$type<string[]>().default([]),
    isOfficial: boolean("is_official").notNull().default(false), // teacher/admin answer
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    doubtIdx: index("batch_doubt_replies_doubt_idx").on(table.doubtId),
  })
);

// ─── Attendance ─────────────────────────────────────────────────────────────

export const batchAttendance = pgTable(
  "batch_attendance",
  {
    attendanceId: text("attendance_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull(),
    sessionId: text("session_id").notNull(),
    userId: text("user_id").notNull(),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index("batch_attendance_session_idx").on(table.sessionId),
    userIdx: index("batch_attendance_user_idx").on(table.userId),
    uniqueSessionUser: unique("batch_attendance_session_user_unique").on(
      table.sessionId,
      table.userId
    ),
  })
);

// ─── Quizzes ────────────────────────────────────────────────────────────────

export const batchQuizzes = pgTable(
  "batch_quizzes",
  {
    quizId: text("quiz_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull(),
    subjectId: text("subject_id"),
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
    passingPercent: decimal("passing_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("40"),
    showLeaderboard: boolean("show_leaderboard").notNull().default(true),
    showSolutions: boolean("show_solutions").notNull().default(true),
    opensAt: timestamp("opens_at"),
    closesAt: timestamp("closes_at"),
    publishedAt: timestamp("published_at"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    batchIdx: index("batch_quizzes_batch_idx").on(table.batchId),
    subjectIdx: index("batch_quizzes_subject_idx").on(table.subjectId),
  })
);

export type QuizCorrectAnswer =
  | string
  | string[]
  | { value: number; tolerance?: number };

export const batchQuizQuestions = pgTable(
  "batch_quiz_questions",
  {
    questionId: text("question_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    quizId: text("quiz_id").notNull(),
    order: integer("order").notNull(),
    type: batchQuizQuestionTypeEnum("type").notNull(),
    prompt: text("prompt").notNull(),
    // For MCQ: array of {id, text}; for NUMERICAL: empty
    options: jsonb("options")
      .$type<Array<{ id: string; text: string }>>()
      .default([]),
    correctAnswer: jsonb("correct_answer").$type<QuizCorrectAnswer>().notNull(),
    marks: decimal("marks", { precision: 6, scale: 2 }).notNull().default("1"),
    explanation: text("explanation"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    quizIdx: index("batch_quiz_questions_quiz_idx").on(table.quizId),
  })
);

export const batchQuizAttempts = pgTable(
  "batch_quiz_attempts",
  {
    attemptId: text("attempt_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    quizId: text("quiz_id").notNull(),
    userId: text("user_id").notNull(),
    status: batchQuizAttemptStatusEnum("status")
      .notNull()
      .default("IN_PROGRESS"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    submittedAt: timestamp("submitted_at"),
    expiresAt: timestamp("expires_at").notNull(),
    score: decimal("score", { precision: 8, scale: 2 }),
    maxScore: decimal("max_score", { precision: 8, scale: 2 }),
    correctCount: integer("correct_count").default(0),
    wrongCount: integer("wrong_count").default(0),
    skippedCount: integer("skipped_count").default(0),
    answers: jsonb("answers")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    quizIdx: index("batch_quiz_attempts_quiz_idx").on(table.quizId),
    userIdx: index("batch_quiz_attempts_user_idx").on(table.userId),
    quizUserIdx: index("batch_quiz_attempts_quiz_user_idx").on(
      table.quizId,
      table.userId
    ),
  })
);

// ─── Batch certificates ─────────────────────────────────────────────────────

export const batchCertificates = pgTable(
  "batch_certificates",
  {
    certificateId: text("certificate_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull(),
    userId: text("user_id").notNull(),
    certificateNumber: text("certificate_number").notNull().unique(),
    issuedAt: timestamp("issued_at").notNull().defaultNow(),
    revokedAt: timestamp("revoked_at"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  },
  (table) => ({
    batchIdx: index("batch_certificates_batch_idx").on(table.batchId),
    userIdx: index("batch_certificates_user_idx").on(table.userId),
    uniqueBatchUser: unique("batch_certificates_batch_user_unique").on(
      table.batchId,
      table.userId
    ),
  })
);
