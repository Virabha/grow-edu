import {
  pgTable,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  index,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import {
  enrollmentStatusEnum,
  enrollmentSourceEnum,
  accessSourceEnum,
  assignmentSubmissionTypeEnum,
  assignmentSubmissionStatusEnum,
  batchLiveProviderEnum,
  batchSessionStatusEnum,
} from "./enums";

export const enrollments = pgTable(
  "enrollments",
  {
    enrollmentId: text("enrollment_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    courseId: text("course_id").notNull(),
    companyId: text("company_id"),
    status: enrollmentStatusEnum("status").notNull().default("ACTIVE"),
    source: enrollmentSourceEnum("source").notNull().default("SELF_PURCHASE"),
    grantedBy: text("granted_by"),
    enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    userCourseUnique: unique("enrollments_user_course_unique").on(
      table.userId,
      table.courseId
    ),
    userIdx: index("enrollments_user_idx").on(table.userId),
    courseIdx: index("enrollments_course_idx").on(table.courseId),
    companyIdx: index("enrollments_company_idx").on(table.companyId),
    sourceIdx: index("enrollments_source_idx").on(table.source, table.enrolledAt),
  })
);

export const courseProgress = pgTable(
  "course_progress",
  {
    courseProgressId: text("course_progress_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    courseId: text("course_id").notNull(),
    progress: decimal("progress", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    timeSpent: integer("time_spent").notNull().default(0),
    lastAccessed: timestamp("last_accessed").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userCourseUnique: unique("course_progress_user_course_unique").on(
      table.userId,
      table.courseId
    ),
    userIdx: index("course_progress_user_idx").on(table.userId),
    courseIdx: index("course_progress_course_idx").on(table.courseId),
  })
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    lessonProgressId: text("lesson_progress_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    progressId: text("course_progress_id").notNull(),
    lessonId: text("lesson_id").notNull(),
    completed: boolean("completed").notNull().default(false),
    timeSpent: integer("time_spent").notNull().default(0),
    lastPosition: integer("last_position"),
    lastAccessed: timestamp("last_accessed").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    progressLessonUnique: unique("lesson_progress_progress_lesson_unique").on(
      table.progressId,
      table.lessonId
    ),
    progressIdx: index("lesson_progress_progress_idx").on(table.progressId),
    lessonIdx: index("lesson_progress_lesson_idx").on(table.lessonId),
  })
);

export const sectionAccess = pgTable(
  "section_access",
  {
    sectionAccessId: text("section_access_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    courseId: text("course_id").notNull(),
    sectionId: text("section_id").notNull(),
    source: accessSourceEnum("source").notNull().default("SECTION_PURCHASE"),
    paymentId: text("payment_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userSectionUnique: unique("section_access_user_section_unique").on(
      table.userId,
      table.sectionId
    ),
    userIdx: index("section_access_user_idx").on(table.userId),
    courseIdx: index("section_access_course_idx").on(table.courseId),
    sectionIdx: index("section_access_section_idx").on(table.sectionId),
    paymentIdx: index("section_access_payment_idx").on(table.paymentId),
  })
);

export interface LessonQuizAnswerSnapshot {
  questionId: string;
  question: string;
  options: string[];
  correctIndex: number;
  chosenIndex: number | null;
  explanation: string;
}

export const lessonQuizAttempts = pgTable(
  "lesson_quiz_attempts",
  {
    attemptId: text("attempt_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    courseId: text("course_id").notNull(),
    lessonId: text("lesson_id").notNull(),
    quizVersion: integer("quiz_version").notNull().default(1),
    attemptNo: integer("attempt_no").notNull().default(1),
    totalQuestions: integer("total_questions").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    scorePercent: decimal("score_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    passMark: integer("pass_mark").notNull().default(0),
    passed: boolean("passed").notNull().default(false),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    answers: jsonb("answers")
      .$type<LessonQuizAnswerSnapshot[]>()
      .notNull()
      .default([]),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    submittedAt: timestamp("submitted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userSubmittedIdx: index("lesson_quiz_attempts_user_submitted_idx").on(
      table.userId,
      table.submittedAt,
    ),
    userLessonIdx: index("lesson_quiz_attempts_user_lesson_idx").on(
      table.userId,
      table.lessonId,
    ),
    lessonIdx: index("lesson_quiz_attempts_lesson_idx").on(table.lessonId),
    courseIdx: index("lesson_quiz_attempts_course_idx").on(table.courseId),
    attemptNoKey: unique("lesson_quiz_attempts_user_lesson_no_unique").on(
      table.userId,
      table.lessonId,
      table.attemptNo,
    ),
  }),
);

export const assignments = pgTable(
  "assignments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    courseId: text("course_id").notNull(),
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
    courseIdx: index("assignments_course_idx").on(table.courseId),
    instructorIdx: index("assignments_instructor_idx").on(table.instructorId, table.createdAt),
    publishedIdx: index("assignments_published_idx").on(table.isPublished, table.dueAt),
  }),
);

export const assignmentSubmissions = pgTable(
  "assignment_submissions",
  {
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

export const liveSessions = pgTable(
  "live_sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    courseId: text("course_id"),
    instructorId: text("instructor_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    provider: batchLiveProviderEnum("provider").notNull().default("ZOOM"),
    joinUrl: text("join_url"),
    meetingId: text("meeting_id"),
    meetingPasscode: text("meeting_passcode"),
    startsAt: timestamp("starts_at").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    status: batchSessionStatusEnum("status").notNull().default("SCHEDULED"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    courseIdx: index("live_sessions_course_idx").on(table.courseId),
    instructorIdx: index("live_sessions_instructor_idx").on(table.instructorId, table.startsAt),
    startsAtIdx: index("live_sessions_starts_at_idx").on(table.startsAt),
  }),
);

export const liveSessionRegistrations = pgTable(
  "live_session_registrations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id").notNull(),
    userId: text("user_id").notNull(),
    attended: boolean("attended").notNull().default(false),
    registeredAt: timestamp("registered_at").notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index("live_session_registrations_session_idx").on(table.sessionId),
    userIdx: index("live_session_registrations_user_idx").on(table.userId),
    onePerUser: unique("live_session_registrations_session_user_unique").on(
      table.sessionId,
      table.userId,
    ),
  }),
);
