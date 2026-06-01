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
  "PHONEPE",
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
export const itemTypeEnum = pgEnum("item_type", ["COURSE", "SECTION", "BATCH"]);
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

export const payments = pgTable(
  "payments",
  {
    paymentId: text("payment_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    enrollmentId: text("enrollment_id").unique(),
    idempotencyKey: text("idempotency_key").unique(),
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
    userStatusIdx: index("payments_user_status_idx").on(table.userId, table.status),
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

// ─── Batches (PW-style cohorts) ──────────────────────────────────────────────

export const batchStatusEnum = pgEnum("batch_status", [
  "DRAFT",
  "UPCOMING",
  "ONGOING",
  "COMPLETED",
  "ARCHIVED",
]);

export const batchEnrollmentStatusEnum = pgEnum("batch_enrollment_status", [
  "ACTIVE",
  "REVOKED",
  "COMPLETED",
]);

export const batchSessionTypeEnum = pgEnum("batch_session_type", [
  "LIVE",
  "RECORDING",
]);

export const batchLiveProviderEnum = pgEnum("batch_live_provider", [
  "GOOGLE_MEET",
  "ZOOM",
  "JITSI",
  "YOUTUBE_LIVE",
  "CUSTOM_URL",
]);

export const batchSessionStatusEnum = pgEnum("batch_session_status", [
  "SCHEDULED",
  "LIVE",
  "ENDED",
  "CANCELLED",
]);

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

export const batchesRelations = relations(batches, ({ many, one }) => ({
  subjects: many(batchSubjects),
  enrollments: many(batchEnrollments),
  sessions: many(batchSessions),
  announcements: many(batchAnnouncements),
  creator: one(users, {
    fields: [batches.createdBy],
    references: [users.userId],
  }),
  category: one(categories, {
    fields: [batches.categoryId],
    references: [categories.categoryId],
  }),
}));

export const batchSubjectsRelations = relations(batchSubjects, ({ one, many }) => ({
  batch: one(batches, {
    fields: [batchSubjects.batchId],
    references: [batches.batchId],
  }),
  sessions: many(batchSessions),
}));

export const batchEnrollmentsRelations = relations(batchEnrollments, ({ one }) => ({
  batch: one(batches, {
    fields: [batchEnrollments.batchId],
    references: [batches.batchId],
  }),
  user: one(users, {
    fields: [batchEnrollments.userId],
    references: [users.userId],
  }),
  payment: one(payments, {
    fields: [batchEnrollments.paymentId],
    references: [payments.paymentId],
  }),
}));

export const batchSessionsRelations = relations(batchSessions, ({ one }) => ({
  batch: one(batches, {
    fields: [batchSessions.batchId],
    references: [batches.batchId],
  }),
  subject: one(batchSubjects, {
    fields: [batchSessions.subjectId],
    references: [batchSubjects.subjectId],
  }),
  teacher: one(users, {
    fields: [batchSessions.teacherId],
    references: [users.userId],
  }),
}));

export const batchAnnouncementsRelations = relations(batchAnnouncements, ({ one }) => ({
  batch: one(batches, {
    fields: [batchAnnouncements.batchId],
    references: [batches.batchId],
  }),
  author: one(users, {
    fields: [batchAnnouncements.authorId],
    references: [users.userId],
  }),
}));

// ─── Batch resources (DPP / Notes / Reference) ──────────────────────────────

export const batchResourceTypeEnum = pgEnum("batch_resource_type", [
  "DPP",
  "NOTES",
  "REFERENCE",
]);

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

export const batchResourcesRelations = relations(batchResources, ({ one }) => ({
  batch: one(batches, {
    fields: [batchResources.batchId],
    references: [batches.batchId],
  }),
  subject: one(batchSubjects, {
    fields: [batchResources.subjectId],
    references: [batchSubjects.subjectId],
  }),
  uploader: one(users, {
    fields: [batchResources.uploadedBy],
    references: [users.userId],
  }),
}));

// ─── Doubts ─────────────────────────────────────────────────────────────────

export const batchDoubtStatusEnum = pgEnum("batch_doubt_status", [
  "OPEN",
  "ANSWERED",
  "CLOSED",
]);

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

export const batchDoubtsRelations = relations(batchDoubts, ({ one, many }) => ({
  batch: one(batches, {
    fields: [batchDoubts.batchId],
    references: [batches.batchId],
  }),
  subject: one(batchSubjects, {
    fields: [batchDoubts.subjectId],
    references: [batchSubjects.subjectId],
  }),
  author: one(users, {
    fields: [batchDoubts.askedBy],
    references: [users.userId],
  }),
  replies: many(batchDoubtReplies),
}));

export const batchDoubtRepliesRelations = relations(batchDoubtReplies, ({ one }) => ({
  doubt: one(batchDoubts, {
    fields: [batchDoubtReplies.doubtId],
    references: [batchDoubts.doubtId],
  }),
  author: one(users, {
    fields: [batchDoubtReplies.authorId],
    references: [users.userId],
  }),
}));

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

export const batchAttendanceRelations = relations(batchAttendance, ({ one }) => ({
  session: one(batchSessions, {
    fields: [batchAttendance.sessionId],
    references: [batchSessions.sessionId],
  }),
  user: one(users, {
    fields: [batchAttendance.userId],
    references: [users.userId],
  }),
}));

// ─── Quizzes ────────────────────────────────────────────────────────────────

export const batchQuizQuestionTypeEnum = pgEnum("batch_quiz_question_type", [
  "MCQ_SINGLE",
  "MCQ_MULTI",
  "NUMERICAL",
]);

export const batchQuizAttemptStatusEnum = pgEnum("batch_quiz_attempt_status", [
  "IN_PROGRESS",
  "SUBMITTED",
  "EXPIRED",
]);

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
    // For MCQ_SINGLE: string id; MCQ_MULTI: string[]; NUMERICAL: { value, tolerance }
    correctAnswer: jsonb("correct_answer").notNull(),
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

export const batchQuizzesRelations = relations(batchQuizzes, ({ one, many }) => ({
  batch: one(batches, {
    fields: [batchQuizzes.batchId],
    references: [batches.batchId],
  }),
  subject: one(batchSubjects, {
    fields: [batchQuizzes.subjectId],
    references: [batchSubjects.subjectId],
  }),
  questions: many(batchQuizQuestions),
  attempts: many(batchQuizAttempts),
}));

export const batchQuizQuestionsRelations = relations(
  batchQuizQuestions,
  ({ one }) => ({
    quiz: one(batchQuizzes, {
      fields: [batchQuizQuestions.quizId],
      references: [batchQuizzes.quizId],
    }),
  })
);

export const batchQuizAttemptsRelations = relations(
  batchQuizAttempts,
  ({ one }) => ({
    quiz: one(batchQuizzes, {
      fields: [batchQuizAttempts.quizId],
      references: [batchQuizzes.quizId],
    }),
    user: one(users, {
      fields: [batchQuizAttempts.userId],
      references: [users.userId],
    }),
  })
);

// ─── Notifications ──────────────────────────────────────────────────────────

export const notificationTypeEnum = pgEnum("notification_type", [
  "BATCH_ANNOUNCEMENT",
  "BATCH_DOUBT_REPLY",
  "BATCH_SESSION_SCHEDULED",
  "BATCH_QUIZ_PUBLISHED",
  "BATCH_RESOURCE_ADDED",
  "BATCH_ENROLLMENT",
  "BATCH_CERTIFICATE",
  "PAYMENT_APPROVED",
  "PAYMENT_REJECTED",
  "GENERIC",
]);

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

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.userId],
  }),
}));

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

export const batchCertificatesRelations = relations(batchCertificates, ({ one }) => ({
  batch: one(batches, {
    fields: [batchCertificates.batchId],
    references: [batches.batchId],
  }),
  user: one(users, {
    fields: [batchCertificates.userId],
    references: [users.userId],
  }),
}));
