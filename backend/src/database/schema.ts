import {
  pgTable,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  jsonb,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", [
  "LEARNER",
  "INSTRUCTOR",
  "CORPORATE_ADMIN",
  "PLATFORM_ADMIN",
]);
export const courseStatusEnum = pgEnum("course_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "ACTIVE",
  "COMPLETED",
  "REVOKED",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "PROOF_UPLOADED",
  "COMPLETED",
  "FAILED",
  "REJECTED",
  "REFUNDED",
]);
export const paymentGatewayEnum = pgEnum("payment_gateway", [
  "RAZORPAY",
  "MANUAL_QR",
  "FREE",
]);
export const courseLevelEnum = pgEnum("course_level", [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "ALL_LEVELS",
]);
export const lessonTypeEnum = pgEnum("lesson_type", ["VIDEO", "TEXT", "QUIZ"]);
export const lessonStatusEnum = pgEnum("lesson_status", [
  "DRAFT",
  "PENDING_APPROVAL",
  "PROCESSING",
  "READY",
]);
export const sectionPriceTypeEnum = pgEnum("section_price_type", [
  "INCLUDED",
  "INDIVIDUAL",
  "BOTH",
]);
export const courseReviewStatusEnum = pgEnum("course_review_status", [
  "DRAFT",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
]);
export const itemTypeEnum = pgEnum("item_type", ["COURSE", "SECTION"]);
export const accessSourceEnum = pgEnum("access_source", [
  "SECTION_PURCHASE",
  "COURSE_PURCHASE",
  "ADMIN_GRANT",
]);
export const emailTokenTypeEnum = pgEnum("email_token_type", [
  "EMAIL_VERIFICATION",
  "PASSWORD_RESET",
]);
export const videoEncodingJobStatusEnum = pgEnum("video_encoding_job_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

// Coupon discount type enum
export const discountTypeEnum = pgEnum("discount_type", [
  "PERCENTAGE",
  "FIXED_AMOUNT",
]);

// Coupon usage status enum (for reservation/consumption lifecycle)
export const couponUsageStatusEnum = pgEnum("coupon_usage_status", [
  "RESERVED",
  "CONSUMED",
  "CANCELLED",
]);

export const teacherApplicationStatusEnum = pgEnum("teacher_application_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "NEW",
  "REVIEWED",
  "CONTACTED",
  "ACCEPTED",
  "REJECTED",
]);

export const users = pgTable(
  "users",
  {
    userId: text("user_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    role: userRoleEnum("role").notNull().default("LEARNER"),
    emailVerified: boolean("email_verified").notNull().default(false),
    profileImage: text("profile_image"),
    companyId: text("company_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
  })
);

export const emailTokens = pgTable(
  "email_tokens",
  {
    tokenId: text("token_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    tokenType: emailTokenTypeEnum("token_type").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    used: boolean("used").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("email_tokens_user_id_idx").on(table.userId),
    tokenHashIdx: index("email_tokens_token_hash_idx").on(table.tokenHash),
    expiresAtIdx: index("email_tokens_expires_at_idx").on(table.expiresAt),
  })
);

export const companies = pgTable(
  "companies",
  {
    companyId: text("company_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("companies_name_idx").on(table.name),
  })
);

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

export const cartItems = pgTable(
  "cart_items",
  {
    cartItemId: text("cart_item_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    courseId: text("course_id"),
    sectionId: text("section_id"),
    itemType: itemTypeEnum("item_type").notNull().default("COURSE"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
    currency: text("currency").notNull().default("INR"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userItemUnique: unique("cart_items_user_item_unique").on(
      table.userId,
      table.courseId,
      table.sectionId,
      table.itemType
    ),
    userIdx: index("cart_items_user_idx").on(table.userId),
    courseIdx: index("cart_items_course_idx").on(table.courseId),
    sectionIdx: index("cart_items_section_idx").on(table.sectionId),
  })
);

export const payments = pgTable(
  "payments",
  {
    paymentId: text("payment_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    enrollmentId: text("enrollment_id").unique(),
    courseId: text("course_id"),
    sectionId: text("section_id"),
    itemType: itemTypeEnum("item_type").notNull().default("COURSE"),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    originalAmount: decimal("original_amount", { precision: 10, scale: 2 }),
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
    couponId: text("coupon_id"),
    currency: text("currency").notNull(),
    gateway: paymentGatewayEnum("gateway").notNull(),
    gatewayId: text("gateway_id"),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    paymentProofUrl: text("payment_proof_url"),
    transactionId: text("transaction_id"),
    payerName: text("payer_name"),
    proofUploadedAt: timestamp("proof_uploaded_at"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedBy: text("reviewed_by"),
    reviewNotes: text("review_notes"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("payments_user_idx").on(table.userId),
    gatewayIdx: index("payments_gateway_idx").on(table.gatewayId),
    statusIdx: index("payments_status_idx").on(table.status),
    courseIdx: index("payments_course_idx").on(table.courseId),
    sectionIdx: index("payments_section_idx").on(table.sectionId),
    couponIdx: index("payments_coupon_idx").on(table.couponId),
    txnIdx: index("payments_transaction_id_idx").on(table.transactionId),
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

// =============================================
// COUPON SYSTEM TABLES
// =============================================

export const coupons = pgTable(
  "coupons",
  {
    couponId: text("coupon_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    couponCode: text("coupon_code").notNull(),
    discountType: discountTypeEnum("discount_type").notNull().default("PERCENTAGE"),
    discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
    maxDiscountAmount: decimal("max_discount_amount", { precision: 10, scale: 2 }),
    minPurchaseAmount: decimal("min_purchase_amount", { precision: 10, scale: 2 }),
    validFrom: timestamp("valid_from").notNull().defaultNow(),
    validTill: timestamp("valid_till").notNull(),
    usageLimit: integer("usage_limit"),
    usageLimitPerUser: integer("usage_limit_per_user").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    codeActiveIdx: index("coupons_code_lookup_idx").on(
      table.couponCode,
      table.isActive,
      table.isDeleted
    ),
    isActiveIdx: index("coupons_is_active_idx").on(table.isActive),
    validTillIdx: index("coupons_valid_till_idx").on(table.validTill),
  })
);

// Coupon-Category junction table (many-to-many)
export const couponCategories = pgTable(
  "coupon_categories",
  {
    couponCategoryId: text("coupon_category_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    couponId: text("coupon_id").notNull(),
    categoryId: text("category_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    couponCategoryUnique: unique("coupon_categories_unique").on(
      table.couponId,
      table.categoryId
    ),
    couponIdx: index("coupon_categories_coupon_idx").on(table.couponId),
    categoryIdx: index("coupon_categories_category_idx").on(table.categoryId),
  })
);

// Coupon-Course junction table (many-to-many)
export const couponCourses = pgTable(
  "coupon_courses",
  {
    couponCourseId: text("coupon_course_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    couponId: text("coupon_id").notNull(),
    courseId: text("course_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    couponCourseUnique: unique("coupon_courses_unique").on(
      table.couponId,
      table.courseId
    ),
    couponIdx: index("coupon_courses_coupon_idx").on(table.couponId),
    courseIdx: index("coupon_courses_course_idx").on(table.courseId),
  })
);

// Coupon usage tracking table
export const couponUsages = pgTable(
  "coupon_usages",
  {
    usageId: text("usage_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    couponId: text("coupon_id").notNull(),
    userId: text("user_id").notNull(),
    paymentId: text("payment_id"),
    courseId: text("course_id"),
    status: couponUsageStatusEnum("status").notNull().default("CONSUMED"),
    reservedExpiresAt: timestamp("reserved_expires_at"),
    consumedAt: timestamp("consumed_at"),
    cancelledAt: timestamp("cancelled_at"),
    discountApplied: decimal("discount_applied", { precision: 10, scale: 2 }).notNull(),
    originalAmount: decimal("original_amount", { precision: 10, scale: 2 }).notNull(),
    finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    couponIdx: index("coupon_usages_coupon_idx").on(table.couponId),
    userIdx: index("coupon_usages_user_idx").on(table.userId),
    couponUserIdx: index("coupon_usages_coupon_user_idx").on(
      table.couponId,
      table.userId
    ),
    paymentIdx: index("coupon_usages_payment_idx").on(table.paymentId),
    couponStatusIdx: index("coupon_usages_coupon_status_idx").on(
      table.couponId,
      table.status,
      table.reservedExpiresAt
    ),
    couponUserStatusIdx: index("coupon_usages_coupon_user_status_idx").on(
      table.couponId,
      table.userId,
      table.status,
      table.reservedExpiresAt
    ),
  })
);

// =============================================
// CMS / LANDING PAGE TABLES
// =============================================

export const banners = pgTable(
  "banners",
  {
    bannerId: text("banner_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    description: text("description"),
    imageUrl: text("image_url").notNull(),
    overlayColor: text("overlay_color").default("rgba(0,0,0,0.4)"),
    overlayOpacity: integer("overlay_opacity").default(40),
    textColor: text("text_color").default("#ffffff"),
    textAlign: text("text_align").default("left"),
    ctaText: text("cta_text"),
    ctaLink: text("cta_link"),
    ctaStyle: text("cta_style").default("primary"),
    secondaryCtaText: text("secondary_cta_text"),
    secondaryCtaLink: text("secondary_cta_link"),
    badgeText: text("badge_text"),
    badgeColor: text("badge_color"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    displayOrderIdx: index("banners_display_order_idx").on(table.displayOrder),
    isActiveIdx: index("banners_is_active_idx").on(table.isActive),
  })
);

export const faqs = pgTable(
  "faqs",
  {
    faqId: text("faq_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    displayOrderIdx: index("faqs_display_order_idx").on(table.displayOrder),
    isActiveIdx: index("faqs_is_active_idx").on(table.isActive),
  })
);

export const whyChooseUs = pgTable(
  "why_choose_us",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    iconName: text("icon_name").notNull(),
    iconColor: text("icon_color"),
    iconBg: text("icon_bg"),
    title: text("title").notNull(),
    description: text("description"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    displayOrderIdx: index("why_choose_us_display_order_idx").on(table.displayOrder),
    isActiveIdx: index("why_choose_us_is_active_idx").on(table.isActive),
  })
);

export const testimonials = pgTable(
  "testimonials",
  {
    testimonialId: text("testimonial_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    role: text("role"),
    company: text("company"),
    rating: integer("rating").notNull().default(5),
    text: text("text").notNull(),
    course: text("course"),
    avatarUrl: text("avatar_url"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    displayOrderIdx: index("testimonials_display_order_idx").on(table.displayOrder),
    isActiveIdx: index("testimonials_is_active_idx").on(table.isActive),
  })
);

export const siteSettings = pgTable(
  "site_settings",
  {
    settingId: text("setting_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    key: text("key").notNull().unique(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    keyIdx: index("site_settings_key_idx").on(table.key),
  })
);

export const services = pgTable(
  "services",
  {
    serviceId: text("service_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    imageUrl: text("image_url"),
    screenshots: jsonb("screenshots").$type<string[]>().default([]),
    iconName: text("icon_name"),
    formSchema: jsonb("form_schema"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index("services_slug_idx").on(table.slug),
    displayOrderIdx: index("services_display_order_idx").on(table.displayOrder),
    isActiveIdx: index("services_is_active_idx").on(table.isActive),
  })
);

export const serviceApplications = pgTable(
  "service_applications",
  {
    applicationId: text("application_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    serviceId: text("service_id").notNull(),
    formData: jsonb("form_data").notNull(),
    applicantName: text("applicant_name").notNull(),
    applicantEmail: text("applicant_email").notNull(),
    applicantPhone: text("applicant_phone"),
    status: applicationStatusEnum("status").notNull().default("NEW"),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    serviceIdx: index("service_applications_service_idx").on(table.serviceId),
    statusIdx: index("service_applications_status_idx").on(table.status),
    emailIdx: index("service_applications_email_idx").on(table.applicantEmail),
    createdAtIdx: index("service_applications_created_at_idx").on(table.createdAt),
  })
);

export const bookStatusEnum = pgEnum("book_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const books = pgTable(
  "books",
  {
    bookId: text("book_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    author: text("author").notNull(),
    description: text("description"),
    shortDescription: text("short_description"),
    coverImage: text("cover_image"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
    compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
    currency: text("currency").notNull().default("INR"),
    categoryId: text("category_id"),
    isbn: text("isbn"),
    pages: integer("pages"),
    language: text("language").default("English"),
    publisher: text("publisher"),
    publishedYear: integer("published_year"),
    format: text("format").default("PHYSICAL"),
    downloadUrl: text("download_url"),
    status: bookStatusEnum("status").notNull().default("DRAFT"),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index("books_slug_idx").on(table.slug),
    categoryIdx: index("books_category_idx").on(table.categoryId),
    statusIdx: index("books_status_idx").on(table.status),
    isActiveIdx: index("books_is_active_idx").on(table.isActive),
    displayOrderIdx: index("books_display_order_idx").on(table.displayOrder),
  })
);

export const bookPurchases = pgTable(
  "book_purchases",
  {
    purchaseId: text("purchase_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    bookId: text("book_id").notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("INR"),
    gateway: paymentGatewayEnum("gateway").notNull(),
    gatewayId: text("gateway_id"),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("book_purchases_user_idx").on(table.userId),
    bookIdx: index("book_purchases_book_idx").on(table.bookId),
    statusIdx: index("book_purchases_status_idx").on(table.status),
    userBookUnique: unique("book_purchases_user_book_unique").on(
      table.userId,
      table.bookId
    ),
  })
);

export const teacherApplications = pgTable(
  "teacher_applications",
  {
    applicationId: text("application_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    experienceYears: integer("experience_years"),
    skills: jsonb("skills").$type<string[]>(),
    categories: jsonb("categories").$type<string[]>(),
    cvUrl: text("cv_url"),
    whyJoin: text("why_join"),
    status: teacherApplicationStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("teacher_applications_status_idx").on(table.status),
    emailIdx: index("teacher_applications_email_idx").on(table.email),
    createdAtIdx: index("teacher_applications_created_at_idx").on(table.createdAt),
  })
);

export const instructorProfiles = pgTable(
  "instructor_profiles",
  {
    profileId: text("profile_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().unique(),
    bio: text("bio"),
    expertise: jsonb("expertise").$type<string[]>(),
    experience: text("experience"),
    education: text("education"),
    avatarUrl: text("avatar_url"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("instructor_profiles_user_id_idx").on(table.userId),
    displayOrderIdx: index("instructor_profiles_display_order_idx").on(table.displayOrder),
    isActiveIdx: index("instructor_profiles_is_active_idx").on(table.isActive),
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

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.companyId],
  }),
  enrollments: many(enrollments),
  createdCourses: many(courses),
  payments: many(payments),
  progress: many(courseProgress),
  cartItems: many(cartItems),
  sectionAccess: many(sectionAccess),
  emailTokens: many(emailTokens),
  couponUsages: many(couponUsages),
  instructorProfile: one(instructorProfiles),
}));

export const instructorProfilesRelations = relations(instructorProfiles, ({ one }) => ({
  user: one(users, {
    fields: [instructorProfiles.userId],
    references: [users.userId],
  }),
}));

export const emailTokensRelations = relations(emailTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailTokens.userId],
    references: [users.userId],
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  admins: many(users),
  enrollments: many(enrollments),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentCategoryId],
    references: [categories.categoryId],
    relationName: "categoryChildren",
  }),
  children: many(categories, { relationName: "categoryChildren" }),
  courses: many(courses),
  couponCategories: many(couponCategories),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  category: one(categories, {
    fields: [courses.categoryId],
    references: [categories.categoryId],
  }),
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.userId],
  }),
  sections: many(courseSections),
  enrollments: many(enrollments),
  progress: many(courseProgress),
  cartItems: many(cartItems),
  sectionAccess: many(sectionAccess),
  payments: many(payments),
  encodingJobs: many(videoEncodingJobs),
  couponCourses: many(couponCourses),
}));

export const courseSectionsRelations = relations(
  courseSections,
  ({ one, many }) => ({
    course: one(courses, {
      fields: [courseSections.courseId],
      references: [courses.courseId],
    }),
    lessons: many(lessons),
    sectionAccess: many(sectionAccess),
    cartItems: many(cartItems),
  })
);

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  section: one(courseSections, {
    fields: [lessons.sectionId],
    references: [courseSections.sectionId],
  }),
  progress: many(lessonProgress),
  questions: many(quizQuestions),
  encodingJobs: many(videoEncodingJobs),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  lesson: one(lessons, {
    fields: [quizQuestions.lessonId],
    references: [lessons.lessonId],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.userId],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.courseId],
  }),
  company: one(companies, {
    fields: [enrollments.companyId],
    references: [companies.companyId],
  }),
  payment: one(payments, {
    fields: [enrollments.enrollmentId],
    references: [payments.enrollmentId],
  }),
}));

export const courseProgressRelations = relations(
  courseProgress,
  ({ one, many }) => ({
    user: one(users, {
      fields: [courseProgress.userId],
      references: [users.userId],
    }),
    course: one(courses, {
      fields: [courseProgress.courseId],
      references: [courses.courseId],
    }),
    lessonProgress: many(lessonProgress),
  })
);

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  progress: one(courseProgress, {
    fields: [lessonProgress.progressId],
    references: [courseProgress.courseProgressId],
  }),
  lesson: one(lessons, {
    fields: [lessonProgress.lessonId],
    references: [lessons.lessonId],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.userId],
  }),
  enrollment: one(enrollments, {
    fields: [payments.enrollmentId],
    references: [enrollments.enrollmentId],
  }),
  course: one(courses, {
    fields: [payments.courseId],
    references: [courses.courseId],
  }),
  section: one(courseSections, {
    fields: [payments.sectionId],
    references: [courseSections.sectionId],
  }),
  coupon: one(coupons, {
    fields: [payments.couponId],
    references: [coupons.couponId],
  }),
}));

export const sectionAccessRelations = relations(sectionAccess, ({ one }) => ({
  user: one(users, {
    fields: [sectionAccess.userId],
    references: [users.userId],
  }),
  course: one(courses, {
    fields: [sectionAccess.courseId],
    references: [courses.courseId],
  }),
  section: one(courseSections, {
    fields: [sectionAccess.sectionId],
    references: [courseSections.sectionId],
  }),
  payment: one(payments, {
    fields: [sectionAccess.paymentId],
    references: [payments.paymentId],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.userId],
  }),
  course: one(courses, {
    fields: [cartItems.courseId],
    references: [courses.courseId],
  }),
  section: one(courseSections, {
    fields: [cartItems.sectionId],
    references: [courseSections.sectionId],
  }),
}));

export const videoEncodingJobsRelations = relations(videoEncodingJobs, ({ one }) => ({
  lesson: one(lessons, {
    fields: [videoEncodingJobs.lessonId],
    references: [lessons.lessonId],
  }),
  course: one(courses, {
    fields: [videoEncodingJobs.courseId],
    references: [courses.courseId],
  }),
}));

// =============================================
// COUPON SYSTEM RELATIONS
// =============================================

export const couponsRelations = relations(coupons, ({ many }) => ({
  categories: many(couponCategories),
  courses: many(couponCourses),
  usages: many(couponUsages),
  payments: many(payments),
}));

export const couponCategoriesRelations = relations(couponCategories, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponCategories.couponId],
    references: [coupons.couponId],
  }),
  category: one(categories, {
    fields: [couponCategories.categoryId],
    references: [categories.categoryId],
  }),
}));

export const couponCoursesRelations = relations(couponCourses, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponCourses.couponId],
    references: [coupons.couponId],
  }),
  course: one(courses, {
    fields: [couponCourses.courseId],
    references: [courses.courseId],
  }),
}));

export const couponUsagesRelations = relations(couponUsages, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponUsages.couponId],
    references: [coupons.couponId],
  }),
  user: one(users, {
    fields: [couponUsages.userId],
    references: [users.userId],
  }),
  payment: one(payments, {
    fields: [couponUsages.paymentId],
    references: [payments.paymentId],
  }),
  course: one(courses, {
    fields: [couponUsages.courseId],
    references: [courses.courseId],
  }),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  category: one(categories, {
    fields: [books.categoryId],
    references: [categories.categoryId],
  }),
  purchases: many(bookPurchases),
}));

export const bookPurchasesRelations = relations(bookPurchases, ({ one }) => ({
  user: one(users, {
    fields: [bookPurchases.userId],
    references: [users.userId],
  }),
  book: one(books, {
    fields: [bookPurchases.bookId],
    references: [books.bookId],
  }),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  applications: many(serviceApplications),
}));

export const serviceApplicationsRelations = relations(serviceApplications, ({ one }) => ({
  service: one(services, {
    fields: [serviceApplications.serviceId],
    references: [services.serviceId],
  }),
}));
