import {
  pgTable,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  courseStatusEnum,
  courseReviewStatusEnum,
  studentReviewStatusEnum,
  courseLevelEnum,
  sectionPriceTypeEnum,
  lessonTypeEnum,
  lessonStatusEnum,
} from "./enums";

export const categories = pgTable(
  "categories",
  {
    categoryId: text("category_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    parentCategoryId: text("parent_category_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    isDeleted: boolean("is_deleted").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index("categories_slug_idx").on(table.slug),
    isActiveIdx: index("categories_is_active_idx").on(table.isActive),
    parentIdx: index("categories_parent_idx").on(table.parentCategoryId),
  })
);

export const courses = pgTable(
  "courses",
  {
    courseId: text("course_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    shortDescription: text("short_description"),
    thumbnail: text("thumbnail"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
    compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
    currency: text("currency").notNull().default("INR"),
    status: courseStatusEnum("status").notNull().default("DRAFT"),
    reviewStatus: courseReviewStatusEnum("review_status")
      .notNull()
      .default("DRAFT"),
    reviewNotes: text("review_notes"),
    rejectionReason: text("rejection_reason"),
    categoryId: text("category_id").notNull(),
    instructorId: text("instructor_id").notNull(),
    level: courseLevelEnum("level").default("BEGINNER"),
    language: text("language").default("English"),
    learningOutcomes: jsonb("learning_outcomes").$type<string[]>(),
    requirements: jsonb("requirements").$type<string[]>(),
    targetAudience: jsonb("target_audience").$type<string[]>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    submittedAt: timestamp("submitted_at"),
    reviewedAt: timestamp("reviewed_at"),
    publishedAt: timestamp("published_at"),
  },
  (table) => ({
    slugIdx: index("courses_slug_idx").on(table.slug),
    categoryIdx: index("courses_category_idx").on(table.categoryId),
    instructorIdx: index("courses_instructor_idx").on(table.instructorId),
    statusIdx: index("courses_status_idx").on(table.status),
    statusReviewIdx: index("courses_status_review_idx").on(table.status, table.reviewStatus),
  })
);

export const courseSections = pgTable(
  "course_sections",
  {
    sectionId: text("section_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    courseId: text("course_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    order: integer("order").notNull(),
    priceType: sectionPriceTypeEnum("price_type").notNull().default("INCLUDED"),
    sectionPrice: decimal("section_price", { precision: 10, scale: 2 }),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    courseIdx: index("course_sections_course_idx").on(table.courseId),
  })
);

export const lessons = pgTable(
  "lessons",
  {
    lessonId: text("lesson_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sectionId: text("section_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    type: lessonTypeEnum("type").notNull().default("VIDEO"),
    videoUrl: text("video_url"),
    textContent: text("text_content"),
    resources: jsonb("resources").$type<{ label: string; url: string }[]>(),
    quizSettings: jsonb("quiz_settings").$type<{
      passingPercentage?: number;
      timeLimitMinutes?: number;
      attemptsAllowed?: number;
      shuffleQuestions?: boolean;
      mandatory?: boolean;
    }>(),
    quizVersion: integer("quiz_version").notNull().default(1),
    duration: integer("duration"),
    isFreePreview: boolean("is_free_preview").default(false),
    status: lessonStatusEnum("status").default("DRAFT"),
    order: integer("order").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    sectionIdx: index("lessons_section_idx").on(table.sectionId),
  })
);

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    quizQuestionId: text("quiz_question_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    lessonId: text("lesson_id").notNull(),
    question: text("question").notNull(),
    answers: jsonb("answers").$type<{ text: string; isCorrect: boolean }[]>(),
    explanation: text("explanation"),
    order: integer("order").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    lessonIdx: index("quiz_questions_lesson_idx").on(table.lessonId),
  })
);

export const courseAnnouncements = pgTable(
  "course_announcements",
  {
    announcementId: text("announcement_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    courseId: text("course_id").notNull(),
    /** The author. Kept separate from the course's instructor so history
     *  survives a course changing hands. */
    instructorId: text("instructor_id").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    courseIdx: index("course_announcements_course_idx").on(table.courseId),
    instructorIdx: index("course_announcements_instructor_idx").on(table.instructorId),
    courseCreatedIdx: index("course_announcements_course_created_idx").on(
      table.courseId,
      table.createdAt,
    ),
  }),
);

/** Languages a course can be taught in (the /course-languages screen).
 *  Separate from siteLanguages: a course may be taught in a language the site
 *  UI is not translated into. */
export const courseLanguages = pgTable(
  "course_languages",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: index("course_languages_code_idx").on(table.code),
  }),
);

export const courseReviews = pgTable(
  "course_reviews",
  {
    reviewId: text("review_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    courseId: text("course_id").notNull(),
    userId: text("user_id").notNull(),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    status: studentReviewStatusEnum("status").notNull().default("PENDING"),
    moderatedBy: text("moderated_by"),
    moderatedAt: timestamp("moderated_at"),
    instructorReply: text("instructor_reply"),
    instructorRepliedAt: timestamp("instructor_replied_at"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    courseStatusIdx: index("course_reviews_course_status_idx").on(
      table.courseId,
      table.status,
      table.createdAt,
    ),
    userIdx: index("course_reviews_user_idx").on(table.userId, table.createdAt),
    statusIdx: index("course_reviews_status_idx").on(table.status, table.createdAt),
    onePerUserCourse: uniqueIndex("course_reviews_course_user_key").on(
      table.courseId,
      table.userId,
    ),
  }),
);
