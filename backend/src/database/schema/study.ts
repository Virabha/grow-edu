import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  date,
  index,
  unique,
} from "drizzle-orm/pg-core";
import {
  reviewItemSourceEnum,
  reviewOutcomeEnum,
  reviewQueueEntryKindEnum,
} from "./enums";
import { organizationId } from "./organizations";

export const studentQuestionBookmarks = pgTable(
  "student_question_bookmarks",
  {
    organizationId: organizationId(),
    bookmarkId: text("bookmark_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    questionId: text("question_id").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    onePerQuestion: unique("student_question_bookmarks_user_question_unique").on(
      table.userId,
      table.questionId,
    ),
    userIdx: index("student_question_bookmarks_user_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const reviewItems = pgTable(
  "review_items",
  {
    organizationId: organizationId(),
    reviewItemId: text("review_item_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    questionId: text("question_id").notNull(),
    source: reviewItemSourceEnum("source").notNull(),
    sourceId: text("source_id"),
    intervalDays: integer("interval_days").notNull(),
    easeFactor: decimal("ease_factor", { precision: 4, scale: 2 }).notNull(),
    repetitionCount: integer("repetition_count").notNull().default(0),
    lapseCount: integer("lapse_count").notNull().default(0),
    dueAt: timestamp("due_at").notNull(),
    lastReviewedAt: timestamp("last_reviewed_at"),
    retiredAt: timestamp("retired_at"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerQuestion: unique("review_items_user_question_unique").on(
      table.userId,
      table.questionId,
    ),
    dueIdx: index("review_items_due_idx").on(
      table.userId,
      table.retiredAt,
      table.dueAt,
    ),
  }),
);

export const reviewLogs = pgTable(
  "review_logs",
  {
    organizationId: organizationId(),
    reviewLogId: text("review_log_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    reviewItemId: text("review_item_id").notNull(),
    userId: text("user_id").notNull(),
    outcome: reviewOutcomeEnum("outcome").notNull(),
    previousIntervalDays: integer("previous_interval_days").notNull(),
    nextIntervalDays: integer("next_interval_days").notNull(),
    reviewedAt: timestamp("reviewed_at").notNull(),
  },
  (table) => ({
    itemIdx: index("review_logs_item_idx").on(
      table.reviewItemId,
      table.reviewedAt,
    ),
    userIdx: index("review_logs_user_idx").on(table.userId, table.reviewedAt),
  }),
);

export const dailyReviewQueues = pgTable(
  "daily_review_queues",
  {
    organizationId: organizationId(),
    queueId: text("queue_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    queueDate: date("queue_date").notNull(),
    practiceSetId: text("practice_set_id"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    onePerDay: unique("daily_review_queues_user_date_unique").on(
      table.userId,
      table.queueDate,
    ),
  }),
);

export const dailyReviewQueueEntries = pgTable(
  "daily_review_queue_entries",
  {
    organizationId: organizationId(),
    entryId: text("entry_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    queueId: text("queue_id").notNull(),
    userId: text("user_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    kind: reviewQueueEntryKindEnum("kind").notNull(),
    referenceId: text("reference_id").notNull(),
    questionId: text("question_id").notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    queueOrdinal: unique("daily_review_queue_entries_ordinal_unique").on(
      table.queueId,
      table.ordinal,
    ),
    queueIdx: index("daily_review_queue_entries_queue_idx").on(
      table.queueId,
      table.completedAt,
    ),
  }),
);

export const studyTimeSessions = pgTable(
  "study_time_sessions",
  {
    organizationId: organizationId(),
    studySessionId: text("study_session_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    batchId: text("batch_id"),
    subjectId: text("subject_id"),
    lessonId: text("lesson_id"),
    startedAt: timestamp("started_at").notNull(),
    lastEventAt: timestamp("last_event_at").notNull(),
    accruedSeconds: integer("accrued_seconds").notNull().default(0),
    closedAt: timestamp("closed_at"),
  },
  (table) => ({
    openIdx: index("study_time_sessions_open_idx").on(
      table.userId,
      table.closedAt,
      table.lastEventAt,
    ),
    lessonIdx: index("study_time_sessions_lesson_idx").on(
      table.userId,
      table.lessonId,
    ),
  }),
);

export const studyTimeDailyTotals = pgTable(
  "study_time_daily_totals",
  {
    organizationId: organizationId(),
    totalId: text("total_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    day: date("day").notNull(),
    batchId: text("batch_id"),
    subjectId: text("subject_id"),
    seconds: integer("seconds").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerBucket: unique("study_time_daily_totals_bucket_unique").on(
      table.userId,
      table.day,
      table.batchId,
      table.subjectId,
    ),
    userDayIdx: index("study_time_daily_totals_user_day_idx").on(
      table.userId,
      table.day,
    ),
  }),
);

export const studentStudyGoals = pgTable(
  "student_study_goals",
  {
    organizationId: organizationId(),
    studyGoalId: text("study_goal_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    dailyGoalMinutes: integer("daily_goal_minutes").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerUser: unique("student_study_goals_user_unique").on(table.userId),
  }),
);

export const studyStreaks = pgTable(
  "study_streaks",
  {
    organizationId: organizationId(),
    streakId: text("streak_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    lastQualifyingDay: date("last_qualifying_day"),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerUser: unique("study_streaks_user_unique").on(table.userId),
  }),
);

export const studentBadges = pgTable(
  "student_badges",
  {
    organizationId: organizationId(),
    studentBadgeId: text("student_badge_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    badgeKey: text("badge_key").notNull(),
    awardedAt: timestamp("awarded_at").notNull(),
  },
  (table) => ({
    oneEach: unique("student_badges_user_badge_unique").on(
      table.userId,
      table.badgeKey,
    ),
    userIdx: index("student_badges_user_idx").on(table.userId, table.awardedAt),
  }),
);

export const weeklyReportCards = pgTable(
  "weekly_report_cards",
  {
    organizationId: organizationId(),
    reportId: text("report_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    weekStart: date("week_start").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    hadActivity: boolean("had_activity").notNull().default(false),
    generatedAt: timestamp("generated_at").notNull(),
    sentAt: timestamp("sent_at"),
    recipientCount: integer("recipient_count").notNull().default(0),
  },
  (table) => ({
    onePerWeek: unique("weekly_report_cards_user_week_unique").on(
      table.userId,
      table.weekStart,
    ),
    weekIdx: index("weekly_report_cards_week_idx").on(table.weekStart),
  }),
);
