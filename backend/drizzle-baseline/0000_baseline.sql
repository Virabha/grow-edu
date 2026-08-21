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
 CREATE TYPE "batch_delivery_mode" AS ENUM('LIVE', 'RECORDED', 'HYBRID');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "batch_doubt_anchor_type" AS ENUM('BATCH', 'LESSON', 'QUESTION');
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
 CREATE TYPE "batch_enrollment_source" AS ENUM('SELF_PURCHASE', 'ADMIN_GRANT', 'CORPORATE_SEAT', 'FREE');
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
 CREATE TYPE "batch_instructor_role" AS ENUM('LEAD', 'SUBJECT', 'ASSISTANT');
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
 CREATE TYPE "batch_waitlist_status" AS ENUM('WAITING', 'PROMOTED', 'WITHDRAWN');
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
 CREATE TYPE "corporate_contract_status" AS ENUM('DRAFT', 'AWAITING_PAYMENT', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'CANCELLED');
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
 CREATE TYPE "invoice_kind" AS ENUM('INVOICE', 'CREDIT_NOTE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "item_type" AS ENUM('BATCH', 'CORPORATE_CONTRACT');
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
CREATE TABLE IF NOT EXISTS "organizations" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"audit_id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_role" text,
	"impersonator_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"before" jsonb,
	"after" jsonb,
	"ip_address" text,
	"user_agent" text,
	"request_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"credential_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"zoom_client_id" text,
	"zoom_client_secret" text,
	"jitsi_app_id" text,
	"jitsi_secret" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "instructor_meeting_credentials_organization_user_unique" UNIQUE("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "instructor_profiles" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	CONSTRAINT "instructor_profiles_organization_user_unique" UNIQUE("organization_id","user_id")
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"company_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corporate_contract_batches" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"contract_batch_id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "corporate_contract_batches_contract_batch_unique" UNIQUE("contract_id","batch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corporate_contracts" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"contract_id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"title" text NOT NULL,
	"seat_count" integer NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"status" "corporate_contract_status" DEFAULT 'DRAFT' NOT NULL,
	"payment_id" text,
	"notes" text,
	"created_by" text NOT NULL,
	"cancelled_at" timestamp,
	"activated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corporate_join_links" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"join_link_id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"generation" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "corporate_join_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corporate_roster_uploads" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"upload_id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"status" text DEFAULT 'PROCESSING' NOT NULL,
	"row_count" integer NOT NULL,
	"row_results" jsonb,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corporate_seats" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"seat_id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"user_id" text NOT NULL,
	"join_link_id" text,
	"claimed_at" timestamp DEFAULT now() NOT NULL,
	"released_at" timestamp,
	"released_by" text,
	"release_reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corporate_sub_group_members" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"sub_group_member_id" text PRIMARY KEY NOT NULL,
	"sub_group_id" text NOT NULL,
	"contract_id" text NOT NULL,
	"user_id" text NOT NULL,
	"added_by" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "corporate_sub_group_members_unique" UNIQUE("sub_group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corporate_sub_groups" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"sub_group_id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"name" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	CONSTRAINT "categories_organization_slug_unique" UNIQUE("organization_id","slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assignment_submissions" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
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
CREATE TABLE IF NOT EXISTS "payments" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"payment_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"idempotency_key" text,
	"batch_id" text,
	"corporate_contract_id" text,
	"item_type" "item_type" DEFAULT 'BATCH' NOT NULL,
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
	"refunded_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
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
	CONSTRAINT "payments_organization_invoice_unique" UNIQUE("organization_id","invoice_no"),
	CONSTRAINT "payments_organization_idempotency_unique" UNIQUE("organization_id","idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoice_sequences" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"series" text NOT NULL,
	"next_value" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_sequences_organization_series_unique" UNIQUE("organization_id","series")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"invoice_id" text PRIMARY KEY NOT NULL,
	"kind" "invoice_kind" DEFAULT 'INVOICE' NOT NULL,
	"series" text NOT NULL,
	"sequence" integer NOT NULL,
	"invoice_no" text NOT NULL,
	"payment_id" text,
	"contract_id" text,
	"corrects_invoice_id" text,
	"buyer_user_id" text NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_email" text NOT NULL,
	"currency" text NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"lines" jsonb NOT NULL,
	"reason" text,
	"issued_at" timestamp NOT NULL,
	"issued_by" text,
	CONSTRAINT "invoices_organization_number_unique" UNIQUE("organization_id","invoice_no"),
	CONSTRAINT "invoices_organization_series_sequence_unique" UNIQUE("organization_id","series","sequence"),
	CONSTRAINT "invoices_organization_payment_unique" UNIQUE("organization_id","payment_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_announcements" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"certificate_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"user_id" text NOT NULL,
	"certificate_number" text NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "batch_certificates_organization_number_unique" UNIQUE("organization_id","certificate_number"),
	CONSTRAINT "batch_certificates_batch_user_unique" UNIQUE("batch_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_doubt_replies" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"doubt_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"subject_id" text,
	"anchor_type" "batch_doubt_anchor_type" DEFAULT 'BATCH' NOT NULL,
	"anchor_id" text,
	"asked_by" text NOT NULL,
	"assigned_to" text,
	"assigned_at" timestamp,
	"assigned_by" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"status" "batch_doubt_status" DEFAULT 'OPEN' NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"consent_to_attribution" boolean DEFAULT false NOT NULL,
	"promoted_reply_id" text,
	"promoted_at" timestamp,
	"promoted_by" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_enrollments" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"enrollment_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "batch_enrollment_status" DEFAULT 'ACTIVE' NOT NULL,
	"source" "batch_enrollment_source" DEFAULT 'ADMIN_GRANT' NOT NULL,
	"access_starts_at" timestamp DEFAULT now() NOT NULL,
	"access_ends_at" timestamp,
	"granted_by" text,
	"payment_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "batch_enrollments_batch_user_unique" UNIQUE("batch_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_instructors" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"batch_instructor_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"instructor_id" text NOT NULL,
	"role" "batch_instructor_role" DEFAULT 'SUBJECT' NOT NULL,
	"assigned_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "batch_instructors_batch_instructor_unique" UNIQUE("batch_id","instructor_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_quiz_attempts" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"attempt_id" text PRIMARY KEY NOT NULL,
	"quiz_id" text NOT NULL,
	"user_id" text NOT NULL,
	"quiz_version" integer DEFAULT 1 NOT NULL,
	"attempt_no" integer DEFAULT 1 NOT NULL,
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
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "batch_quiz_attempts_quiz_user_attempt_unique" UNIQUE("quiz_id","user_id","attempt_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_quiz_questions" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"version" integer DEFAULT 1 NOT NULL,
	"opens_at" timestamp,
	"closes_at" timestamp,
	"published_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_recurrence_series" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"series_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"title" text NOT NULL,
	"subject_id" text,
	"teacher_id" text,
	"live_provider" "batch_live_provider",
	"join_url" text,
	"days_of_week" integer[] NOT NULL,
	"start_time_utc" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"window_start_at" timestamp NOT NULL,
	"window_end_at" timestamp,
	"look_ahead_days" integer DEFAULT 28 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_resources" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"is_downloadable" boolean DEFAULT false NOT NULL,
	"uploaded_by" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_sessions" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"series_id" text,
	"occurrence_index" integer,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "batch_sessions_series_occurrence_unique" UNIQUE("series_id","occurrence_index")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_subjects" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
CREATE TABLE IF NOT EXISTS "batch_waitlist" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"waitlist_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "batch_waitlist_status" DEFAULT 'WAITING' NOT NULL,
	"joined_at" timestamp NOT NULL,
	"resolved_at" timestamp,
	"payment_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "batch_waitlist_batch_user_unique" UNIQUE("batch_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batches" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"delivery_mode" "batch_delivery_mode" DEFAULT 'LIVE' NOT NULL,
	"category_id" text,
	"status" "batch_status" DEFAULT 'DRAFT' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	CONSTRAINT "batches_organization_slug_unique" UNIQUE("organization_id","slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_progress" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"lesson_progress_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"time_spent" integer DEFAULT 0 NOT NULL,
	"last_position" integer,
	"last_accessed" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_lesson_unique" UNIQUE("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lessons" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"lesson_id" text PRIMARY KEY NOT NULL,
	"subject_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "lesson_type" DEFAULT 'VIDEO' NOT NULL,
	"video_url" text,
	"text_content" text,
	"resources" jsonb,
	"duration" integer,
	"is_free_preview" boolean DEFAULT false NOT NULL,
	"status" "lesson_status" DEFAULT 'DRAFT' NOT NULL,
	"order" integer NOT NULL,
	"created_by" text,
	"submitted_at" timestamp,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subject_lessons" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"placement_id" text PRIMARY KEY NOT NULL,
	"subject_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"order" integer NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subject_lessons_subject_lesson_unique" UNIQUE("subject_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_applications" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	CONSTRAINT "services_organization_slug_unique" UNIQUE("organization_id","slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "banners" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"setting_id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_organization_key_unique" UNIQUE("organization_id","key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_links" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
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
CREATE TABLE IF NOT EXISTS "notification_templates" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"template_id" text PRIMARY KEY NOT NULL,
	"type" "notification_type" NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_templates_type_unique" UNIQUE("type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"notification_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"batch_id" text,
	"read" boolean DEFAULT false NOT NULL,
	"dedupe_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_encoding_jobs" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"job_id" text PRIMARY KEY NOT NULL,
	"lesson_id" text NOT NULL,
	"batch_id" text NOT NULL,
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
CREATE INDEX IF NOT EXISTS "organizations_slug_idx" ON "organizations" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_actor_idx" ON "audit_log" ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_target_idx" ON "audit_log" ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_log" ("action","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "audit_log" ("created_at");--> statement-breakpoint
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
CREATE INDEX IF NOT EXISTS "corporate_contract_batches_contract_idx" ON "corporate_contract_batches" ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_contract_batches_batch_idx" ON "corporate_contract_batches" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_contracts_company_idx" ON "corporate_contracts" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_contracts_status_idx" ON "corporate_contracts" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_contracts_ends_at_idx" ON "corporate_contracts" ("ends_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_contracts_payment_idx" ON "corporate_contracts" ("payment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_join_links_contract_idx" ON "corporate_join_links" ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_join_links_token_hash_idx" ON "corporate_join_links" ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_roster_uploads_contract_idx" ON "corporate_roster_uploads" ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_roster_uploads_actor_idx" ON "corporate_roster_uploads" ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_seats_contract_idx" ON "corporate_seats" ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_seats_user_idx" ON "corporate_seats" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_seats_contract_released_idx" ON "corporate_seats" ("contract_id","released_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_sub_group_members_sub_group_idx" ON "corporate_sub_group_members" ("sub_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_sub_group_members_contract_user_idx" ON "corporate_sub_group_members" ("contract_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_sub_groups_contract_idx" ON "corporate_sub_groups" ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_slug_idx" ON "categories" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_is_active_idx" ON "categories" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_parent_idx" ON "categories" ("parent_category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignment_submissions_assignment_idx" ON "assignment_submissions" ("assignment_id","submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignment_submissions_user_idx" ON "assignment_submissions" ("user_id","submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignment_submissions_status_idx" ON "assignment_submissions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_batch_idx" ON "assignments" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_instructor_idx" ON "assignments" ("instructor_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignments_published_idx" ON "assignments" ("is_published","due_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_user_idx" ON "payments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_gateway_idx" ON "payments" ("gateway_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_batch_idx" ON "payments" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_corporate_contract_idx" ON "payments" ("corporate_contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_transaction_id_idx" ON "payments" ("transaction_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_user_status_idx" ON "payments" ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_user_created_idx" ON "payments" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_refund_status_idx" ON "payments" ("refund_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_buyer_idx" ON "invoices" ("buyer_user_id","issued_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_contract_idx" ON "invoices" ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_corrects_idx" ON "invoices" ("corrects_invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_issued_at_idx" ON "invoices" ("issued_at");--> statement-breakpoint
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
CREATE INDEX IF NOT EXISTS "batch_doubts_assigned_idx" ON "batch_doubts" ("assigned_to","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_doubts_promoted_idx" ON "batch_doubts" ("batch_id","promoted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_doubts_anchor_idx" ON "batch_doubts" ("anchor_type","anchor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_enrollments_batch_idx" ON "batch_enrollments" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_enrollments_user_idx" ON "batch_enrollments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_instructors_batch_idx" ON "batch_instructors" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_instructors_instructor_idx" ON "batch_instructors" ("instructor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quiz_attempts_quiz_idx" ON "batch_quiz_attempts" ("quiz_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quiz_attempts_user_idx" ON "batch_quiz_attempts" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quiz_attempts_quiz_user_idx" ON "batch_quiz_attempts" ("quiz_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quiz_questions_quiz_idx" ON "batch_quiz_questions" ("quiz_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quizzes_batch_idx" ON "batch_quizzes" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quizzes_subject_idx" ON "batch_quizzes" ("subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_recurrence_series_batch_idx" ON "batch_recurrence_series" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_resources_batch_idx" ON "batch_resources" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_resources_type_idx" ON "batch_resources" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_resources_subject_idx" ON "batch_resources" ("subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_sessions_batch_idx" ON "batch_sessions" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_sessions_subject_idx" ON "batch_sessions" ("subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_sessions_scheduled_start_idx" ON "batch_sessions" ("scheduled_start_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_sessions_type_idx" ON "batch_sessions" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_sessions_series_idx" ON "batch_sessions" ("series_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_subjects_batch_idx" ON "batch_subjects" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_waitlist_queue_idx" ON "batch_waitlist" ("batch_id","status","joined_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_waitlist_user_idx" ON "batch_waitlist" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_slug_idx" ON "batches" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_status_idx" ON "batches" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_start_date_idx" ON "batches" ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_delivery_mode_idx" ON "batches" ("delivery_mode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_progress_user_batch_idx" ON "lesson_progress" ("user_id","batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lessons_subject_idx" ON "lessons" ("subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lessons_pending_idx" ON "lessons" ("status","submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lessons_subject_order_idx" ON "lessons" ("subject_id","order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subject_lessons_subject_order_idx" ON "subject_lessons" ("subject_id","order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subject_lessons_lesson_idx" ON "subject_lessons" ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_applications_service_idx" ON "service_applications" ("service_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_applications_status_idx" ON "service_applications" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_applications_email_idx" ON "service_applications" ("applicant_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_applications_created_at_idx" ON "service_applications" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_slug_idx" ON "services" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_display_order_idx" ON "services" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_is_active_idx" ON "services" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "banners_display_order_idx" ON "banners" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "banners_is_active_idx" ON "banners" ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "blog_categories_slug_key" ON "blog_categories" ("organization_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_category_idx" ON "blog_posts" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_status_idx" ON "blog_posts" ("status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_key" ON "blog_posts" ("organization_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brands_display_order_idx" ON "brands" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brands_is_active_idx" ON "brands" ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "certificate_templates_scope_key" ON "certificate_templates" ("organization_id","scope");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faqs_display_order_idx" ON "faqs" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faqs_is_active_idx" ON "faqs" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_settings_key_idx" ON "site_settings" ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_links_display_order_idx" ON "social_links" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testimonials_display_order_idx" ON "testimonials" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testimonials_is_active_idx" ON "testimonials" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "why_choose_us_display_order_idx" ON "why_choose_us" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "why_choose_us_is_active_idx" ON "why_choose_us" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instructor_badges_is_active_idx" ON "instructor_badges" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_templates_type_idx" ON "notification_templates" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id","read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_dedupe_key_idx" ON "notifications" ("dedupe_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_encoding_jobs_lesson_idx" ON "video_encoding_jobs" ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_encoding_jobs_batch_idx" ON "video_encoding_jobs" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_encoding_jobs_status_idx" ON "video_encoding_jobs" ("status");--> statement-breakpoint
INSERT INTO "organizations" ("organization_id", "name", "slug")
VALUES ('00000000-0000-0000-0000-000000000001', 'groEdu', 'groedu')
ON CONFLICT ("organization_id") DO NOTHING;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION audit_log_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_log_no_mutation ON "audit_log";
--> statement-breakpoint
CREATE TRIGGER audit_log_no_mutation
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION invoices_are_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'an issued invoice cannot be changed; issue a credit note instead';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS invoices_no_mutation ON "invoices";
--> statement-breakpoint
CREATE TRIGGER invoices_no_mutation
  BEFORE UPDATE OR DELETE ON "invoices"
  FOR EACH ROW EXECUTE FUNCTION invoices_are_immutable();
