import {
  pgTable,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { enrollmentStatusEnum, accessSourceEnum } from "./enums";

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
