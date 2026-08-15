import { pgEnum } from "drizzle-orm/pg-core";

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

export const bookStatusEnum = pgEnum("book_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

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

export const batchResourceTypeEnum = pgEnum("batch_resource_type", [
  "DPP",
  "NOTES",
  "REFERENCE",
]);

export const batchDoubtStatusEnum = pgEnum("batch_doubt_status", [
  "OPEN",
  "ANSWERED",
  "CLOSED",
]);

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

export const payoutStatusEnum = pgEnum("payout_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PAID",
]);

export const badgeCriteriaEnum = pgEnum("badge_criteria_type", [
  "RATING",
  "ENROLMENTS",
  "COURSES",
  "MANUAL",
]);

export const currencyPositionEnum = pgEnum("currency_symbol_position", [
  "before",
  "after",
]);

export const studentReviewStatusEnum = pgEnum("student_review_status", [
  "PENDING",
  "PUBLISHED",
  "REJECTED",
]);

export const blogPostStatusEnum = pgEnum("blog_post_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const refundStatusEnum = pgEnum("refund_status", [
  "NONE",
  "REQUESTED",
  "APPROVED",
  "DECLINED",
]);

export const enrollmentSourceEnum = pgEnum("enrollment_source", [
  "SELF_PURCHASE",
  "ADMIN_GRANT",
  "COMPANY_ASSIGNMENT",
  "FREE_COURSE",
]);
