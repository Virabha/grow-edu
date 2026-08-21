import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "LEARNER",
  "INSTRUCTOR",
  "CORPORATE_ADMIN",
  "PLATFORM_ADMIN",
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

export const lessonTypeEnum = pgEnum("lesson_type", ["VIDEO", "TEXT", "QUIZ"]);

export const lessonStatusEnum = pgEnum("lesson_status", [
  "DRAFT",
  "PENDING_APPROVAL",
  "PROCESSING",
  "SCHEDULED",
  "READY",
]);

export const itemTypeEnum = pgEnum("item_type", [
  "BATCH",
  "CORPORATE_CONTRACT",
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


export const applicationStatusEnum = pgEnum("application_status", [
  "NEW",
  "REVIEWED",
  "CONTACTED",
  "ACCEPTED",
  "REJECTED",
]);


export const batchStatusEnum = pgEnum("batch_status", [
  "DRAFT",
  "UPCOMING",
  "ONGOING",
  "COMPLETED",
  "ARCHIVED",
]);

export const batchDeliveryModeEnum = pgEnum("batch_delivery_mode", [
  "LIVE",
  "RECORDED",
  "HYBRID",
]);

export const batchInstructorRoleEnum = pgEnum("batch_instructor_role", [
  "LEAD",
  "SUBJECT",
  "ASSISTANT",
]);

export const batchEnrollmentSourceEnum = pgEnum("batch_enrollment_source", [
  "SELF_PURCHASE",
  "ADMIN_GRANT",
  "CORPORATE_SEAT",
  "FREE",
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

export const batchDoubtAnchorTypeEnum = pgEnum("batch_doubt_anchor_type", [
  "BATCH",
  "LESSON",
  "QUESTION",
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


export const badgeCriteriaEnum = pgEnum("badge_criteria_type", [
  "RATING",
  "ENROLMENTS",
  "COURSES",
  "MANUAL",
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

export const batchWaitlistStatusEnum = pgEnum("batch_waitlist_status", [
  "WAITING",
  "PROMOTED",
  "WITHDRAWN",
]);

export const broadcastAudienceEnum = pgEnum("broadcast_audience", [
  "BATCH",
  "CORPORATE",
  "SUB_GROUP",
  "SEGMENT",
]);

export const invoiceKindEnum = pgEnum("invoice_kind", [
  "INVOICE",
  "CREDIT_NOTE",
]);

export const corporateContractStatusEnum = pgEnum("corporate_contract_status", [
  "DRAFT",
  "AWAITING_PAYMENT",
  "ACTIVE",
  "EXPIRING",
  "EXPIRED",
  "CANCELLED",
]);

export const assignmentSubmissionTypeEnum = pgEnum(
  "assignment_submission_type",
  ["FILE", "TEXT", "LINK"],
);

export const assignmentSubmissionStatusEnum = pgEnum(
  "assignment_submission_status",
  ["SUBMITTED", "GRADED", "RETURNED"],
);

export const assessmentTaxonomyKindEnum = pgEnum("assessment_taxonomy_kind", [
  "SUBJECT",
  "TOPIC",
  "SUB_TOPIC",
]);

export const assessmentQuestionTypeEnum = pgEnum("assessment_question_type", [
  "SINGLE_CORRECT",
  "MULTIPLE_CORRECT",
  "NUMERIC",
  "WRITTEN",
  "IMAGE_UPLOAD",
]);

export const assessmentPartialCreditRuleEnum = pgEnum(
  "assessment_partial_credit_rule",
  ["ALL_OR_NOTHING", "PROPORTIONAL"],
);

export const assessmentToleranceKindEnum = pgEnum(
  "assessment_tolerance_kind",
  ["ABSOLUTE", "RELATIVE"],
);

export const assessmentAttemptStatusEnum = pgEnum("assessment_attempt_status", [
  "IN_PROGRESS",
  "AWAITING_GRADING",
  "GRADED",
  "EXPIRED",
]);

export const assessmentAnswerStatusEnum = pgEnum("assessment_answer_status", [
  "AUTO_SCORED",
  "PENDING_GRADING",
  "GRADED",
]);

export const assessmentRegradeStatusEnum = pgEnum(
  "assessment_regrade_status",
  ["OPEN", "UPHELD", "CHANGED"],
);

export const assessmentImportStatusEnum = pgEnum("assessment_import_status", [
  "PARSED",
  "COMMITTING",
  "COMMITTED",
  "FAILED",
]);

export const assessmentPracticeKindEnum = pgEnum("assessment_practice_kind", [
  "DAILY",
  "TOPIC",
]);

export const assessmentAnomalyKindEnum = pgEnum("assessment_anomaly_kind", [
  "TIMING_OUTLIER",
  "IDENTICAL_SEQUENCE",
  "SUBMISSION_PATTERN",
]);
