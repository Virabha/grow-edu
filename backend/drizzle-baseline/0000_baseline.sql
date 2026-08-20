DO $$ BEGIN
 CREATE TYPE "access_source" AS ENUM('SECTION_PURCHASE', 'COURSE_PURCHASE', 'ADMIN_GRANT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "application_status" AS ENUM('NEW', 'REVIEWED', 'CONTACTED', 'ACCEPTED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "assignment_submission_status" AS ENUM('SUBMITTED', 'GRADED', 'RETURNED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "assignment_submission_type" AS ENUM('FILE', 'TEXT', 'LINK');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "badge_criteria_type" AS ENUM('RATING', 'ENROLMENTS', 'COURSES', 'MANUAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "batch_doubt_status" AS ENUM('OPEN', 'ANSWERED', 'CLOSED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "batch_enrollment_status" AS ENUM('ACTIVE', 'REVOKED', 'COMPLETED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "batch_live_provider" AS ENUM('GOOGLE_MEET', 'ZOOM', 'JITSI', 'YOUTUBE_LIVE', 'CUSTOM_URL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "batch_quiz_attempt_status" AS ENUM('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "batch_quiz_question_type" AS ENUM('MCQ_SINGLE', 'MCQ_MULTI', 'NUMERICAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "batch_resource_type" AS ENUM('DPP', 'NOTES', 'REFERENCE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "batch_session_status" AS ENUM('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "batch_session_type" AS ENUM('LIVE', 'RECORDING');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "batch_status" AS ENUM('DRAFT', 'UPCOMING', 'ONGOING', 'COMPLETED', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "blog_post_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "course_level" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "course_review_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "course_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "email_token_type" AS ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "enrollment_source" AS ENUM('SELF_PURCHASE', 'ADMIN_GRANT', 'COMPANY_ASSIGNMENT', 'FREE_COURSE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "enrollment_status" AS ENUM('ACTIVE', 'COMPLETED', 'REVOKED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "item_type" AS ENUM('COURSE', 'SECTION', 'BATCH');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "lesson_status" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'PROCESSING', 'READY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "lesson_type" AS ENUM('VIDEO', 'TEXT', 'QUIZ');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notification_type" AS ENUM('BATCH_ANNOUNCEMENT', 'BATCH_DOUBT_REPLY', 'BATCH_SESSION_SCHEDULED', 'BATCH_QUIZ_PUBLISHED', 'BATCH_RESOURCE_ADDED', 'BATCH_ENROLLMENT', 'BATCH_CERTIFICATE', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'GENERIC');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "payment_gateway" AS ENUM('RAZORPAY', 'MANUAL_QR', 'PHONEPE', 'FREE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "payment_status" AS ENUM('PENDING', 'PROOF_UPLOADED', 'COMPLETED', 'FAILED', 'REJECTED', 'REFUNDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "refund_status" AS ENUM('NONE', 'REQUESTED', 'APPROVED', 'DECLINED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "section_price_type" AS ENUM('INCLUDED', 'INDIVIDUAL', 'BOTH');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('LEARNER', 'INSTRUCTOR', 'CORPORATE_ADMIN', 'PLATFORM_ADMIN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "video_encoding_job_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_tokens" (
	"token_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_type" "email_token_type" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "instructor_meeting_credentials" (
	"credential_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"zoom_client_id" text,
	"zoom_client_secret" text,
	"jitsi_app_id" text,
	"jitsi_secret" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "instructor_meeting_credentials_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "instructor_profiles" (
	"profile_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bio" text,
	"expertise" jsonb,
	"experience" text,
	"education" text,
	"avatar_url" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "instructor_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_devices" (
	"device_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"label" text,
	"user_agent" text,
	"ip_address" text,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" "user_role" DEFAULT 'LEARNER' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"profile_image" text,
	"headline" text,
	"bio" text,
	"phone" text,
	"address_line" text,
	"city" text,
	"state" text,
	"country" text,
	"postal_code" text,
	"social" jsonb DEFAULT '{}'::jsonb,
	"company_id" text,
	"suspended_at" timestamp,
	"suspension_reason" text,
	"suspended_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "companies" (
	"company_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"category_id" text PRIMARY KEY NOT NULL,
	"parent_category_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "course_announcements" (
	"announcement_id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"instructor_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "course_sections" (
	"section_id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order" integer NOT NULL,
	"price_type" "section_price_type" DEFAULT 'INCLUDED' NOT NULL,
	"section_price" numeric(10, 2),
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courses" (
	"course_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"short_description" text,
	"thumbnail" text,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"compare_at_price" numeric(10, 2),
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "course_status" DEFAULT 'DRAFT' NOT NULL,
	"review_status" "course_review_status" DEFAULT 'DRAFT' NOT NULL,
	"review_notes" text,
	"rejection_reason" text,
	"category_id" text NOT NULL,
	"instructor_id" text NOT NULL,
	"level" "course_level" DEFAULT 'BEGINNER',
	"language" text DEFAULT 'English',
	"learning_outcomes" jsonb,
	"requirements" jsonb,
	"target_audience" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"published_at" timestamp,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lessons" (
	"lesson_id" text PRIMARY KEY NOT NULL,
	"section_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "lesson_type" DEFAULT 'VIDEO' NOT NULL,
	"video_url" text,
	"text_content" text,
	"resources" jsonb,
	"quiz_settings" jsonb,
	"quiz_version" integer DEFAULT 1 NOT NULL,
	"duration" integer,
	"is_free_preview" boolean DEFAULT false,
	"status" "lesson_status" DEFAULT 'DRAFT',
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quiz_questions" (
	"quiz_question_id" text PRIMARY KEY NOT NULL,
	"lesson_id" text NOT NULL,
	"question" text NOT NULL,
	"answers" jsonb,
	"explanation" text,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assignment_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"attempt_no" integer DEFAULT 1 NOT NULL,
	"file_key" text,
	"text_answer" text,
	"link_url" text,
	"status" "assignment_submission_status" DEFAULT 'SUBMITTED' NOT NULL,
	"marks" integer,
	"feedback" text,
	"graded_by" text,
	"graded_at" timestamp,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assignment_submissions_assignment_user_attempt_unique" UNIQUE("assignment_id","user_id","attempt_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"instructor_id" text NOT NULL,
	"title" text NOT NULL,
	"instructions" text,
	"submission_type" "assignment_submission_type" DEFAULT 'FILE' NOT NULL,
	"max_marks" integer DEFAULT 100 NOT NULL,
	"pass_marks" integer DEFAULT 40 NOT NULL,
	"due_at" timestamp,
	"allow_resubmission" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "course_progress" (
	"course_progress_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"course_id" text NOT NULL,
	"progress" numeric(5, 2) DEFAULT '0' NOT NULL,
	"time_spent" integer DEFAULT 0 NOT NULL,
	"last_accessed" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "course_progress_user_course_unique" UNIQUE("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrollments" (
	"enrollment_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"course_id" text NOT NULL,
	"company_id" text,
	"status" "enrollment_status" DEFAULT 'ACTIVE' NOT NULL,
	"source" "enrollment_source" DEFAULT 'SELF_PURCHASE' NOT NULL,
	"granted_by" text,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "enrollments_user_course_unique" UNIQUE("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_progress" (
	"lesson_progress_id" text PRIMARY KEY NOT NULL,
	"course_progress_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"time_spent" integer DEFAULT 0 NOT NULL,
	"last_position" integer,
	"last_accessed" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_progress_lesson_unique" UNIQUE("course_progress_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_quiz_attempts" (
	"attempt_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"course_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"quiz_version" integer DEFAULT 1 NOT NULL,
	"attempt_no" integer DEFAULT 1 NOT NULL,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"score_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"pass_mark" integer DEFAULT 0 NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_quiz_attempts_user_lesson_no_unique" UNIQUE("user_id","lesson_id","attempt_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "live_session_registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"attended" boolean DEFAULT false NOT NULL,
	"registered_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "live_session_registrations_session_user_unique" UNIQUE("session_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "live_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text,
	"instructor_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"provider" "batch_live_provider" DEFAULT 'ZOOM' NOT NULL,
	"join_url" text,
	"meeting_id" text,
	"meeting_passcode" text,
	"starts_at" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"status" "batch_session_status" DEFAULT 'SCHEDULED' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "section_access" (
	"section_access_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"course_id" text NOT NULL,
	"section_id" text NOT NULL,
	"source" "access_source" DEFAULT 'SECTION_PURCHASE' NOT NULL,
	"payment_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "section_access_user_section_unique" UNIQUE("user_id","section_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"payment_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"enrollment_id" text,
	"idempotency_key" text,
	"course_id" text,
	"section_id" text,
	"item_type" "item_type" DEFAULT 'COURSE' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"original_amount" numeric(10, 2),
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"currency" text NOT NULL,
	"gateway" "payment_gateway" NOT NULL,
	"gateway_id" text,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"payment_proof_url" text,
	"transaction_id" text,
	"payer_name" text,
	"invoice_no" text,
	"tax_amount" numeric(10, 2) DEFAULT '0',
	"refund_status" "refund_status" DEFAULT 'NONE' NOT NULL,
	"refund_reason" text,
	"refund_requested_at" timestamp,
	"refund_resolved_at" timestamp,
	"refund_resolved_by" text,
	"proof_uploaded_at" timestamp,
	"reviewed_at" timestamp,
	"reviewed_by" text,
	"review_notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_enrollment_id_unique" UNIQUE("enrollment_id"),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payments_invoice_no_unique" UNIQUE("invoice_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_announcements" (
	"announcement_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_attendance" (
	"attendance_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"duration_seconds" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "batch_attendance_session_user_unique" UNIQUE("session_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_certificates" (
	"certificate_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"user_id" text NOT NULL,
	"certificate_number" text NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "batch_certificates_certificate_number_unique" UNIQUE("certificate_number"),
	CONSTRAINT "batch_certificates_batch_user_unique" UNIQUE("batch_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_doubt_replies" (
	"reply_id" text PRIMARY KEY NOT NULL,
	"doubt_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"is_official" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_doubts" (
	"doubt_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"subject_id" text,
	"asked_by" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"status" "batch_doubt_status" DEFAULT 'OPEN' NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_enrollments" (
	"enrollment_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "batch_enrollment_status" DEFAULT 'ACTIVE' NOT NULL,
	"access_starts_at" timestamp DEFAULT now() NOT NULL,
	"access_ends_at" timestamp,
	"granted_by" text,
	"payment_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "batch_enrollments_batch_user_unique" UNIQUE("batch_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_quiz_attempts" (
	"attempt_id" text PRIMARY KEY NOT NULL,
	"quiz_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "batch_quiz_attempt_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"score" numeric(8, 2),
	"max_score" numeric(8, 2),
	"correct_count" integer DEFAULT 0,
	"wrong_count" integer DEFAULT 0,
	"skipped_count" integer DEFAULT 0,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_quiz_questions" (
	"question_id" text PRIMARY KEY NOT NULL,
	"quiz_id" text NOT NULL,
	"order" integer NOT NULL,
	"type" "batch_quiz_question_type" NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb,
	"correct_answer" jsonb NOT NULL,
	"marks" numeric(6, 2) DEFAULT '1' NOT NULL,
	"explanation" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_quizzes" (
	"quiz_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"subject_id" text,
	"title" text NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"negative_mark_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"passing_percent" numeric(5, 2) DEFAULT '40' NOT NULL,
	"show_leaderboard" boolean DEFAULT true NOT NULL,
	"show_solutions" boolean DEFAULT true NOT NULL,
	"opens_at" timestamp,
	"closes_at" timestamp,
	"published_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_resources" (
	"resource_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"subject_id" text,
	"title" text NOT NULL,
	"description" text,
	"type" "batch_resource_type" NOT NULL,
	"file_key" text NOT NULL,
	"file_size" integer,
	"page_count" integer,
	"day_number" integer,
	"publish_at" timestamp,
	"uploaded_by" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"subject_id" text,
	"teacher_id" text,
	"title" text NOT NULL,
	"description" text,
	"type" "batch_session_type" NOT NULL,
	"live_provider" "batch_live_provider",
	"join_url" text,
	"meeting_id" text,
	"meeting_passcode" text,
	"scheduled_start_at" timestamp,
	"scheduled_end_at" timestamp,
	"actual_start_at" timestamp,
	"actual_end_at" timestamp,
	"status" "batch_session_status" DEFAULT 'SCHEDULED' NOT NULL,
	"recording_video_id" text,
	"recording_duration_seconds" integer,
	"recording_thumbnail" text,
	"resources" jsonb,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_subjects" (
	"subject_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batches" (
	"batch_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"short_description" text,
	"target_exam" text,
	"language" text DEFAULT 'English' NOT NULL,
	"thumbnail" text,
	"banner_image" text,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"compare_at_price" numeric(10, 2),
	"currency" text DEFAULT 'INR' NOT NULL,
	"capacity" integer,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"teacher_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category_id" text,
	"status" "batch_status" DEFAULT 'DRAFT' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	CONSTRAINT "batches_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_applications" (
	"application_id" text PRIMARY KEY NOT NULL,
	"service_id" text NOT NULL,
	"form_data" jsonb NOT NULL,
	"applicant_name" text NOT NULL,
	"applicant_email" text NOT NULL,
	"applicant_phone" text,
	"status" "application_status" DEFAULT 'NEW' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "services" (
	"service_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_url" text,
	"screenshots" jsonb DEFAULT '[]'::jsonb,
	"icon_name" text,
	"form_schema" jsonb,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "banners" (
	"banner_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"image_url" text NOT NULL,
	"overlay_color" text DEFAULT 'rgba(0,0,0,0.4)',
	"overlay_opacity" integer DEFAULT 40,
	"text_color" text DEFAULT '#ffffff',
	"text_align" text DEFAULT 'left',
	"cta_text" text,
	"cta_link" text,
	"cta_style" text DEFAULT 'primary',
	"secondary_cta_text" text,
	"secondary_cta_link" text,
	"badge_text" text,
	"badge_color" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"cover_image_url" text,
	"author_name" text,
	"author_user_id" text,
	"status" "blog_post_status" DEFAULT 'DRAFT' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"view_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "brands" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"website_url" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "certificate_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text DEFAULT 'default' NOT NULL,
	"background_url" text DEFAULT '' NOT NULL,
	"signature_url" text DEFAULT '' NOT NULL,
	"signatory_name" text DEFAULT '' NOT NULL,
	"signatory_title" text DEFAULT '' NOT NULL,
	"body_text" text DEFAULT '' NOT NULL,
	"show_qr_code" boolean DEFAULT true NOT NULL,
	"show_certificate_id" boolean DEFAULT true NOT NULL,
	"accent_colour" text DEFAULT '#2563eb' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faqs" (
	"faq_id" text PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_settings" (
	"setting_id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_links" (
	"id" text PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"url" text,
	"icon" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "testimonials" (
	"testimonial_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"company" text,
	"rating" integer DEFAULT 5 NOT NULL,
	"text" text NOT NULL,
	"course" text,
	"avatar_url" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "why_choose_us" (
	"id" text PRIMARY KEY NOT NULL,
	"icon_name" text NOT NULL,
	"icon_color" text,
	"icon_bg" text,
	"title" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "instructor_badges" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text,
	"colour" text,
	"criteria_type" "badge_criteria_type" DEFAULT 'MANUAL' NOT NULL,
	"criteria_value" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"notification_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"batch_id" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_encoding_jobs" (
	"job_id" text PRIMARY KEY NOT NULL,
	"lesson_id" text NOT NULL,
	"course_id" text NOT NULL,
	"status" "video_encoding_job_status" DEFAULT 'PENDING' NOT NULL,
	"input_path" text NOT NULL,
	"output_path" text,
	"error_message" text,
	"duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_tokens_user_id_idx" ON "email_tokens" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_tokens_token_hash_idx" ON "email_tokens" ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_tokens_expires_at_idx" ON "email_tokens" ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instructor_meeting_credentials_user_idx" ON "instructor_meeting_credentials" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instructor_profiles_user_id_idx" ON "instructor_profiles" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instructor_profiles_display_order_idx" ON "instructor_profiles" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instructor_profiles_is_active_idx" ON "instructor_profiles" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_devices_user_idx" ON "user_devices" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_devices_user_last_seen_idx" ON "user_devices" ("user_id","last_seen_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_suspended_at_idx" ON "users" ("suspended_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_name_idx" ON "companies" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_slug_idx" ON "categories" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_is_active_idx" ON "categories" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_parent_idx" ON "categories" ("parent_category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_announcements_course_idx" ON "course_announcements" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_announcements_instructor_idx" ON "course_announcements" ("instructor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_announcements_course_created_idx" ON "course_announcements" ("course_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_sections_course_idx" ON "course_sections" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_slug_idx" ON "courses" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_category_idx" ON "courses" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_instructor_idx" ON "courses" ("instructor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_status_idx" ON "courses" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_status_review_idx" ON "courses" ("status","review_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lessons_section_idx" ON "lessons" ("section_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_questions_lesson_idx" ON "quiz_questions" ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignment_submissions_assignment_idx" ON "assignment_submissions" ("assignment_id","submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignment_submissions_user_idx" ON "assignment_submissions" ("user_id","submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignment_submissions_status_idx" ON "assignment_submissions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_course_idx" ON "assignments" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_instructor_idx" ON "assignments" ("instructor_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_published_idx" ON "assignments" ("is_published","due_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_progress_user_idx" ON "course_progress" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_progress_course_idx" ON "course_progress" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollments_user_idx" ON "enrollments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollments_course_idx" ON "enrollments" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollments_company_idx" ON "enrollments" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollments_source_idx" ON "enrollments" ("source","enrolled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_progress_progress_idx" ON "lesson_progress" ("course_progress_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_progress_lesson_idx" ON "lesson_progress" ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_quiz_attempts_user_submitted_idx" ON "lesson_quiz_attempts" ("user_id","submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_quiz_attempts_user_lesson_idx" ON "lesson_quiz_attempts" ("user_id","lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_quiz_attempts_lesson_idx" ON "lesson_quiz_attempts" ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_quiz_attempts_course_idx" ON "lesson_quiz_attempts" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "live_session_registrations_session_idx" ON "live_session_registrations" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "live_session_registrations_user_idx" ON "live_session_registrations" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "live_sessions_course_idx" ON "live_sessions" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "live_sessions_instructor_idx" ON "live_sessions" ("instructor_id","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "live_sessions_starts_at_idx" ON "live_sessions" ("starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "section_access_user_idx" ON "section_access" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "section_access_course_idx" ON "section_access" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "section_access_section_idx" ON "section_access" ("section_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "section_access_payment_idx" ON "section_access" ("payment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_user_idx" ON "payments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_gateway_idx" ON "payments" ("gateway_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_course_idx" ON "payments" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_section_idx" ON "payments" ("section_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_transaction_id_idx" ON "payments" ("transaction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_user_status_idx" ON "payments" ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_user_created_idx" ON "payments" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_refund_status_idx" ON "payments" ("refund_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_announcements_batch_idx" ON "batch_announcements" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_announcements_created_at_idx" ON "batch_announcements" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_attendance_session_idx" ON "batch_attendance" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_attendance_user_idx" ON "batch_attendance" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_certificates_batch_idx" ON "batch_certificates" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_certificates_user_idx" ON "batch_certificates" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_doubt_replies_doubt_idx" ON "batch_doubt_replies" ("doubt_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_doubts_batch_idx" ON "batch_doubts" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_doubts_status_idx" ON "batch_doubts" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_doubts_asked_by_idx" ON "batch_doubts" ("asked_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_enrollments_batch_idx" ON "batch_enrollments" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_enrollments_user_idx" ON "batch_enrollments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quiz_attempts_quiz_idx" ON "batch_quiz_attempts" ("quiz_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quiz_attempts_user_idx" ON "batch_quiz_attempts" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quiz_attempts_quiz_user_idx" ON "batch_quiz_attempts" ("quiz_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quiz_questions_quiz_idx" ON "batch_quiz_questions" ("quiz_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quizzes_batch_idx" ON "batch_quizzes" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quizzes_subject_idx" ON "batch_quizzes" ("subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_resources_batch_idx" ON "batch_resources" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_resources_type_idx" ON "batch_resources" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_resources_subject_idx" ON "batch_resources" ("subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_sessions_batch_idx" ON "batch_sessions" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_sessions_subject_idx" ON "batch_sessions" ("subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_sessions_scheduled_start_idx" ON "batch_sessions" ("scheduled_start_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_sessions_type_idx" ON "batch_sessions" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_subjects_batch_idx" ON "batch_subjects" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_slug_idx" ON "batches" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_status_idx" ON "batches" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_start_date_idx" ON "batches" ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_applications_service_idx" ON "service_applications" ("service_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_applications_status_idx" ON "service_applications" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_applications_email_idx" ON "service_applications" ("applicant_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_applications_created_at_idx" ON "service_applications" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_slug_idx" ON "services" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_display_order_idx" ON "services" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_is_active_idx" ON "services" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "banners_display_order_idx" ON "banners" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "banners_is_active_idx" ON "banners" ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "blog_categories_slug_key" ON "blog_categories" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_category_idx" ON "blog_posts" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_status_idx" ON "blog_posts" ("status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_key" ON "blog_posts" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brands_display_order_idx" ON "brands" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brands_is_active_idx" ON "brands" ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "certificate_templates_scope_key" ON "certificate_templates" ("scope");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faqs_display_order_idx" ON "faqs" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faqs_is_active_idx" ON "faqs" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_settings_key_idx" ON "site_settings" ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_links_display_order_idx" ON "social_links" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testimonials_display_order_idx" ON "testimonials" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testimonials_is_active_idx" ON "testimonials" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "why_choose_us_display_order_idx" ON "why_choose_us" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "why_choose_us_is_active_idx" ON "why_choose_us" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instructor_badges_is_active_idx" ON "instructor_badges" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id","read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_encoding_jobs_lesson_idx" ON "video_encoding_jobs" ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_encoding_jobs_course_idx" ON "video_encoding_jobs" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_encoding_jobs_status_idx" ON "video_encoding_jobs" ("status");