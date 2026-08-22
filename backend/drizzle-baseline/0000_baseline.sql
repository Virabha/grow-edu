DO $$ BEGIN
 CREATE TYPE "ai_batch_item_state" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'RECONCILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "ai_batch_status" AS ENUM('SUBMITTED', 'COMPLETE', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "ai_call_outcome" AS ENUM('SUCCEEDED', 'FAILED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "ai_doubt_answer_status" AS ENUM('PENDING', 'ANSWERED', 'FAILED', 'REJECTED', 'ESCALATED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "ai_doubt_draft_status" AS ENUM('PENDING', 'COMMITTED', 'DISCARDED');
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
 CREATE TYPE "assessment_anomaly_kind" AS ENUM('TIMING_OUTLIER', 'IDENTICAL_SEQUENCE', 'SUBMISSION_PATTERN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "assessment_answer_status" AS ENUM('AUTO_SCORED', 'PENDING_GRADING', 'GRADED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "assessment_attempt_status" AS ENUM('IN_PROGRESS', 'AWAITING_GRADING', 'GRADED', 'EXPIRED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "assessment_import_status" AS ENUM('PARSED', 'COMMITTING', 'COMMITTED', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "assessment_partial_credit_rule" AS ENUM('ALL_OR_NOTHING', 'PROPORTIONAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "assessment_practice_kind" AS ENUM('DAILY', 'TOPIC');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "assessment_question_type" AS ENUM('SINGLE_CORRECT', 'MULTIPLE_CORRECT', 'NUMERIC', 'WRITTEN', 'IMAGE_UPLOAD');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "assessment_regrade_status" AS ENUM('OPEN', 'UPHELD', 'CHANGED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "assessment_taxonomy_kind" AS ENUM('SUBJECT', 'TOPIC', 'SUB_TOPIC');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "assessment_tolerance_kind" AS ENUM('ABSOLUTE', 'RELATIVE');
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
 CREATE TYPE "batch_instructor_role" AS ENUM('LEAD', 'SUBJECT', 'ASSISTANT', 'MENTOR');
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
 CREATE TYPE "batch_session_type" AS ENUM('LIVE', 'RECORDING', 'ONE_TO_ONE');
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
 CREATE TYPE "batch_visibility" AS ENUM('PUBLIC', 'CORPORATE_ONLY');
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
 CREATE TYPE "blog_post_status" AS ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "broadcast_audience" AS ENUM('BATCH', 'CORPORATE', 'SUB_GROUP', 'SEGMENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "coding_case_visibility" AS ENUM('VISIBLE', 'HIDDEN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "coding_problem_kind" AS ENUM('ALGORITHMIC', 'FRONTEND');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "coding_problem_status" AS ENUM('DRAFT', 'VALIDATED', 'PUBLISHED', 'RETIRED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "coding_run_kind" AS ENUM('SAMPLE_RUN', 'JUDGE_SUBMISSION', 'REFERENCE_VALIDATION');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "coding_run_status" AS ENUM('PENDING', 'RUNNING', 'COMPLETE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "coding_verdict" AS ENUM('ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR', 'INTERNAL_ERROR');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "community_author_kind" AS ENUM('STUDENT', 'INSTRUCTOR', 'ADMIN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "content_report_status" AS ENUM('OPEN', 'RESOLVED', 'DISMISSED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "content_report_target" AS ENUM('FEED_POST', 'GROUP_MESSAGE');
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
 CREATE TYPE "curriculum_item_kind" AS ENUM('LESSON', 'TEST');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "dev_environment_status" AS ENUM('PROVISIONING', 'RUNNING', 'HIBERNATED', 'RECLAIMED', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "document_annotation_state" AS ENUM('ANCHORED', 'ORPHANED');
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
 CREATE TYPE "funnel_event_kind" AS ENUM('PAGE_VIEW', 'CATALOGUE_VIEW', 'CHECKOUT_START', 'CHECKOUT_COMPLETE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "identity_provider" AS ENUM('PASSWORD', 'PHONE', 'GOOGLE');
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
 CREATE TYPE "job_opening_status" AS ENUM('OPEN', 'CLOSED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "lesson_status" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'PROCESSING', 'SCHEDULED', 'READY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "lesson_summary_status" AS ENUM('PENDING', 'READY', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "lesson_transcript_status" AS ENUM('PENDING', 'PROCESSING', 'READY', 'FAILED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "lesson_type" AS ENUM('VIDEO', 'TEXT', 'QUIZ', 'DOCUMENT', 'AUDIO', 'RICH', 'LIVE_SESSION');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "media_rendition_kind" AS ENUM('VIDEO', 'AUDIO');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "mock_interview_status" AS ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notification_type" AS ENUM('BATCH_ANNOUNCEMENT', 'BATCH_DOUBT_REPLY', 'BATCH_SESSION_SCHEDULED', 'BATCH_QUIZ_PUBLISHED', 'BATCH_RESOURCE_ADDED', 'BATCH_ENROLLMENT', 'BATCH_CERTIFICATE', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'WEEKLY_REPORT_CARD', 'PARENT_LINK_REQUEST', 'BADGE_AWARDED', 'DAILY_REVIEW_DUE', 'CODE_VERDICT', 'PROJECT_MILESTONE_REVIEWED', 'PATH_CERTIFICATE', 'GENERIC');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "page_status" AS ENUM('DRAFT', 'PUBLISHED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "parent_link_status" AS ENUM('PENDING', 'ACTIVE', 'REVOKED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "path_enrolment_status" AS ENUM('ACTIVE', 'COMPLETED', 'REVOKED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "path_stage_kind" AS ENUM('BATCH', 'PROBLEM_SET', 'PROJECT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "path_stage_state" AS ENUM('LOCKED', 'OPEN', 'COMPLETE');
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
 CREATE TYPE "portfolio_item_kind" AS ENUM('PROJECT', 'SKILL', 'CERTIFICATE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "project_check_status" AS ENUM('PENDING', 'PASSED', 'FAILED', 'HARNESS_ERROR');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "project_milestone_state" AS ENUM('LOCKED', 'OPEN', 'SUBMITTED', 'RETURNED', 'PASSED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "project_similarity_source" AS ENUM('COHORT', 'PUBLIC');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "question_review_status" AS ENUM('UNREVIEWED', 'APPROVED', 'REJECTED');
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
 CREATE TYPE "review_item_source" AS ENUM('ERROR_NOTEBOOK', 'BOOKMARKED_QUESTION');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "review_outcome" AS ENUM('CORRECT', 'WRONG');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "review_queue_entry_kind" AS ENUM('REVIEW', 'PRACTICE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "search_document_kind" AS ENUM('BATCH', 'INSTRUCTOR');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "skill_subject_kind" AS ENUM('PROBLEM', 'PROJECT', 'STAGE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "sso_provider_type" AS ENUM('OIDC', 'SAML');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "user_role" AS ENUM('LEARNER', 'INSTRUCTOR', 'CORPORATE_ADMIN', 'PLATFORM_ADMIN', 'PARENT');
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
CREATE TABLE IF NOT EXISTS "second_factor_challenges" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"challenge_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE IF NOT EXISTS "user_second_factors" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"second_factor_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"secret" text NOT NULL,
	"confirmed_at" timestamp,
	"last_used_at" timestamp,
	"last_used_code" text,
	"recovery_codes" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_second_factors_user_unique" UNIQUE("user_id")
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
	"source" text DEFAULT 'SELF_REPORTED' NOT NULL,
	"corrected_by" text,
	"corrected_at" timestamp,
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
	"verification_code" text NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" text,
	"revocation_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "batch_certificates_verification_unique" UNIQUE("verification_code"),
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
	"lesson_id" text,
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
	"batch_id" text,
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
	"visibility" "batch_visibility" DEFAULT 'PUBLIC' NOT NULL,
	"goal_key" text,
	"level_key" text,
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
	"completed_at" timestamp,
	"time_spent" integer DEFAULT 0 NOT NULL,
	"last_position" integer,
	"position_recorded_at" timestamp,
	"watched_seconds" integer DEFAULT 0 NOT NULL,
	"listened_seconds" integer DEFAULT 0 NOT NULL,
	"pages_viewed" integer DEFAULT 0 NOT NULL,
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
	"audio_url" text,
	"audio_duration" integer,
	"document_file_key" text,
	"document_page_count" integer,
	"document_version" integer DEFAULT 1 NOT NULL,
	"session_id" text,
	"resource_id" text,
	"quiz_id" text,
	"is_free_preview" boolean DEFAULT false NOT NULL,
	"status" "lesson_status" DEFAULT 'DRAFT' NOT NULL,
	"order" integer NOT NULL,
	"created_by" text,
	"submitted_at" timestamp,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"publish_at" timestamp,
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
	"unlock_at" timestamp,
	"unlock_after_days" integer,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subject_lessons_subject_lesson_unique" UNIQUE("subject_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_difficulty_levels" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"level_id" text PRIMARY KEY NOT NULL,
	"ordinal" integer NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_difficulty_levels_ordinal_unique" UNIQUE("organization_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_question_groups" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"group_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"stimulus" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_retired" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_question_versions" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"question_version_id" text PRIMARY KEY NOT NULL,
	"question_id" text NOT NULL,
	"version" integer NOT NULL,
	"prompt" jsonb NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"answer_key" jsonb,
	"explanation" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"partial_credit_rule" "assessment_partial_credit_rule",
	"tolerance_kind" "assessment_tolerance_kind",
	"tolerance" numeric(12, 6),
	"search_text" text DEFAULT '' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_question_versions_unique" UNIQUE("question_id","version")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_questions" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"question_id" text PRIMARY KEY NOT NULL,
	"type" "assessment_question_type" NOT NULL,
	"subject_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"sub_topic_id" text,
	"authored_difficulty" integer NOT NULL,
	"observed_difficulty" numeric(6, 3),
	"observed_attempt_count" integer DEFAULT 0 NOT NULL,
	"group_id" text,
	"group_order" integer,
	"current_version" integer DEFAULT 1 NOT NULL,
	"review_status" "question_review_status",
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"is_retired" boolean DEFAULT false NOT NULL,
	"retired_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_taxonomy_nodes" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"node_id" text PRIMARY KEY NOT NULL,
	"kind" "assessment_taxonomy_kind" NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"is_retired" boolean DEFAULT false NOT NULL,
	"retired_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_anomaly_flags" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"flag_id" text PRIMARY KEY NOT NULL,
	"attempt_id" text NOT NULL,
	"test_id" text NOT NULL,
	"user_id" text NOT NULL,
	"kind" "assessment_anomaly_kind" NOT NULL,
	"reason" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_attempt_answers" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"answer_id" text PRIMARY KEY NOT NULL,
	"attempt_id" text NOT NULL,
	"placement_id" text NOT NULL,
	"question_id" text NOT NULL,
	"question_version" integer NOT NULL,
	"response" jsonb,
	"elapsed_seconds" integer DEFAULT 0 NOT NULL,
	"is_skipped" boolean DEFAULT true NOT NULL,
	"is_correct" boolean,
	"awarded_marks" numeric(8, 2),
	"status" "assessment_answer_status" DEFAULT 'AUTO_SCORED' NOT NULL,
	"grader_comment" text,
	"graded_by" text,
	"graded_at" timestamp,
	"feedback_media_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_attempt_answers_unique" UNIQUE("attempt_id","placement_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_attempts" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"attempt_id" text PRIMARY KEY NOT NULL,
	"test_id" text NOT NULL,
	"user_id" text NOT NULL,
	"attempt_no" integer DEFAULT 1 NOT NULL,
	"status" "assessment_attempt_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"graded_at" timestamp,
	"provisional_score" numeric(8, 2),
	"final_score" numeric(8, 2),
	"pending_marks" numeric(8, 2),
	"max_score" numeric(8, 2),
	"correct_count" integer DEFAULT 0 NOT NULL,
	"wrong_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_attempts_unique" UNIQUE("test_id","user_id","attempt_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_criterion_scores" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"score_id" text PRIMARY KEY NOT NULL,
	"answer_id" text NOT NULL,
	"criterion_id" text NOT NULL,
	"value" numeric(6, 2) NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_criterion_scores_unique" UNIQUE("answer_id","criterion_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_error_notebook" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"entry_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"question_version" integer NOT NULL,
	"attempt_id" text NOT NULL,
	"answer_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"given_answer" jsonb,
	"correct_answer" jsonb,
	"explanation" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_error_notebook_unique" UNIQUE("answer_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_import_rows" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"row_id" text PRIMARY KEY NOT NULL,
	"import_id" text NOT NULL,
	"row_number" integer NOT NULL,
	"raw" jsonb NOT NULL,
	"parsed" jsonb,
	"is_valid" boolean DEFAULT false NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"question_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_import_rows_unique" UNIQUE("import_id","row_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_imports" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"import_id" text PRIMARY KEY NOT NULL,
	"status" "assessment_import_status" DEFAULT 'PARSED' NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"valid_count" integer DEFAULT 0 NOT NULL,
	"invalid_count" integer DEFAULT 0 NOT NULL,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"failure_reason" text,
	"committed_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_practice_sets" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"set_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "assessment_practice_kind" NOT NULL,
	"batch_id" text,
	"topic_id" text,
	"for_date" text,
	"test_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_practice_sets_daily_unique" UNIQUE("user_id","kind","for_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_question_stats" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"question_id" text PRIMARY KEY NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"mean_seconds" numeric(10, 2),
	"option_distribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_questions_served" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"served_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"difficulty" integer NOT NULL,
	"was_correct" boolean,
	"served_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_regrade_requests" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"request_id" text PRIMARY KEY NOT NULL,
	"answer_id" text NOT NULL,
	"attempt_id" text NOT NULL,
	"student_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" "assessment_regrade_status" DEFAULT 'OPEN' NOT NULL,
	"original_marks" numeric(8, 2),
	"resolved_marks" numeric(8, 2),
	"justification" text,
	"resolved_by" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_rubric_criteria" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"criterion_id" text PRIMARY KEY NOT NULL,
	"rubric_id" text NOT NULL,
	"label" text NOT NULL,
	"weight" numeric(6, 3) DEFAULT '1' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_rubrics" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"rubric_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"scale_max" integer DEFAULT 5 NOT NULL,
	"is_retired" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_test_questions" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"placement_id" text PRIMARY KEY NOT NULL,
	"test_id" text NOT NULL,
	"question_id" text NOT NULL,
	"group_id" text,
	"order" integer NOT NULL,
	"section_name" text,
	"marks" numeric(6, 2) DEFAULT '1' NOT NULL,
	"negative_mark_percent" numeric(5, 2),
	"rubric_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_test_questions_unique" UNIQUE("test_id","question_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_test_stats" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"test_id" text PRIMARY KEY NOT NULL,
	"figures" jsonb NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_tests" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"test_id" text PRIMARY KEY NOT NULL,
	"batch_id" text,
	"title" text NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"negative_mark_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"score_floor" numeric(8, 2) DEFAULT '0' NOT NULL,
	"passing_percent" numeric(5, 2) DEFAULT '40' NOT NULL,
	"show_leaderboard" boolean DEFAULT true NOT NULL,
	"show_solutions" boolean DEFAULT true NOT NULL,
	"exam_label" text,
	"exam_year" integer,
	"paper_label" text,
	"opens_at" timestamp,
	"closes_at" timestamp,
	"published_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_weak_topics" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"entry_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"attempted" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"accuracy" numeric(6, 4) NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_weak_topics_unique" UNIQUE("user_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "curriculum_test_placements" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"placement_id" text PRIMARY KEY NOT NULL,
	"subject_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"kind" "curriculum_item_kind" DEFAULT 'TEST' NOT NULL,
	"test_id" text NOT NULL,
	"order" integer NOT NULL,
	"unlock_at" timestamp,
	"unlock_after_days" integer,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "curriculum_test_placements_subject_test_unique" UNIQUE("subject_id","test_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_annotations" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"annotation_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"document_version" integer NOT NULL,
	"page" integer NOT NULL,
	"start_offset" integer NOT NULL,
	"end_offset" integer NOT NULL,
	"quoted_text" text NOT NULL,
	"note" text,
	"colour" text,
	"state" "document_annotation_state" DEFAULT 'ANCHORED' NOT NULL,
	"orphaned_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_bookmarks" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"bookmark_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "lesson_bookmarks_user_lesson_unique" UNIQUE("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_inline_answers" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"inline_answer_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"question_id" text NOT NULL,
	"response" jsonb,
	"outcome" text NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "lesson_inline_answers_user_question_unique" UNIQUE("user_id","lesson_id","question_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_notes" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"note_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"body" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "lesson_notes_user_lesson_unique" UNIQUE("user_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_transcript_segments" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"segment_id" text PRIMARY KEY NOT NULL,
	"transcript_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"start_seconds" integer NOT NULL,
	"end_seconds" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "lesson_transcript_segments_ordinal_unique" UNIQUE("transcript_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_transcripts" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"transcript_id" text PRIMARY KEY NOT NULL,
	"lesson_id" text NOT NULL,
	"rendition_kind" "media_rendition_kind" DEFAULT 'VIDEO' NOT NULL,
	"status" "lesson_transcript_status" DEFAULT 'PENDING' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"source_key" text,
	"error_message" text,
	"requested_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "lesson_transcripts_lesson_unique" UNIQUE("lesson_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_video_bookmarks" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"bookmark_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"timestamp_seconds" integer NOT NULL,
	"note" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rich_lesson_content" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"rich_content_id" text PRIMARY KEY NOT NULL,
	"lesson_id" text NOT NULL,
	"blocks" jsonb NOT NULL,
	"inline_question_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "rich_lesson_content_lesson_unique" UNIQUE("lesson_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_review_queue_entries" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"entry_id" text PRIMARY KEY NOT NULL,
	"queue_id" text NOT NULL,
	"user_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"kind" "review_queue_entry_kind" NOT NULL,
	"reference_id" text NOT NULL,
	"question_id" text NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "daily_review_queue_entries_ordinal_unique" UNIQUE("queue_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_review_queues" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"queue_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"queue_date" date NOT NULL,
	"practice_set_id" text,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "daily_review_queues_user_date_unique" UNIQUE("user_id","queue_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_items" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"review_item_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"source" "review_item_source" NOT NULL,
	"source_id" text,
	"interval_days" integer NOT NULL,
	"ease_factor" numeric(4, 2) NOT NULL,
	"repetition_count" integer DEFAULT 0 NOT NULL,
	"lapse_count" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp NOT NULL,
	"last_reviewed_at" timestamp,
	"retired_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "review_items_user_question_unique" UNIQUE("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "review_logs" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"review_log_id" text PRIMARY KEY NOT NULL,
	"review_item_id" text NOT NULL,
	"user_id" text NOT NULL,
	"outcome" "review_outcome" NOT NULL,
	"previous_interval_days" integer NOT NULL,
	"next_interval_days" integer NOT NULL,
	"reviewed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_badges" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"student_badge_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"badge_key" text NOT NULL,
	"awarded_at" timestamp NOT NULL,
	CONSTRAINT "student_badges_user_badge_unique" UNIQUE("user_id","badge_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_question_bookmarks" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"bookmark_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"question_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "student_question_bookmarks_user_question_unique" UNIQUE("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_study_goals" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"study_goal_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"daily_goal_minutes" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "student_study_goals_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_streaks" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"streak_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_qualifying_day" date,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "study_streaks_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_time_daily_totals" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"total_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"batch_id" text,
	"subject_id" text,
	"seconds" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "study_time_daily_totals_bucket_unique" UNIQUE("user_id","day","batch_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_time_sessions" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"study_session_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"batch_id" text,
	"subject_id" text,
	"lesson_id" text,
	"started_at" timestamp NOT NULL,
	"last_event_at" timestamp NOT NULL,
	"accrued_seconds" integer DEFAULT 0 NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "weekly_report_cards" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"report_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"week_start" date NOT NULL,
	"payload" jsonb NOT NULL,
	"had_activity" boolean DEFAULT false NOT NULL,
	"generated_at" timestamp NOT NULL,
	"sent_at" timestamp,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "weekly_report_cards_user_week_unique" UNIQUE("user_id","week_start")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_feed_posts" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"post_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"parent_post_id" text,
	"author_id" text NOT NULL,
	"author_kind" "community_author_kind" NOT NULL,
	"body" text NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"removed_at" timestamp,
	"removed_by" text,
	"removal_reason" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_reports" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"report_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"target_kind" "content_report_target" NOT NULL,
	"target_id" text NOT NULL,
	"reported_by" text NOT NULL,
	"reason" text NOT NULL,
	"status" "content_report_status" DEFAULT 'OPEN' NOT NULL,
	"outcome" text,
	"resolved_by" text,
	"resolved_at" timestamp,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "content_reports_reporter_target_unique" UNIQUE("reported_by","target_kind","target_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_group_members" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"membership_id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp NOT NULL,
	CONSTRAINT "study_group_members_group_user_unique" UNIQUE("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_group_messages" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"message_id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"author_id" text NOT NULL,
	"author_kind" "community_author_kind" NOT NULL,
	"body" text NOT NULL,
	"removed_at" timestamp,
	"removed_by" text,
	"removal_reason" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_groups" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"group_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"member_cap" integer NOT NULL,
	"created_by" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "study_groups_batch_name_unique" UNIQUE("batch_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_completion_criteria" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"criteria_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"min_lesson_completion_percent" integer DEFAULT 0 NOT NULL,
	"min_attendance_percent" integer DEFAULT 0 NOT NULL,
	"min_test_average_percent" integer DEFAULT 0 NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "batch_completion_criteria_batch_unique" UNIQUE("batch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_wishlist" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"wishlist_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "batch_wishlist_user_batch_unique" UNIQUE("user_id","batch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "diagnostic_results" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"diagnostic_result_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"test_id" text NOT NULL,
	"attempt_id" text NOT NULL,
	"goal_key" text,
	"level" text NOT NULL,
	"recommendation" text NOT NULL,
	"scored_percent" integer NOT NULL,
	"superseded_at" timestamp,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "diagnostic_results_attempt_unique" UNIQUE("attempt_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search_documents" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"search_document_id" text PRIMARY KEY NOT NULL,
	"kind" "search_document_kind" NOT NULL,
	"reference_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"search_vector" "tsvector",
	"is_listed" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "search_documents_kind_reference_unique" UNIQUE("kind","reference_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_profiles" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"student_profile_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"goal_key" text,
	"goal_set_at" timestamp,
	"level" text,
	"level_set_at" timestamp,
	"low_bandwidth" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "student_profiles_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parent_links" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"link_id" text PRIMARY KEY NOT NULL,
	"parent_user_id" text NOT NULL,
	"student_user_id" text NOT NULL,
	"status" "parent_link_status" DEFAULT 'PENDING' NOT NULL,
	"consent_token_hash" text,
	"consent_expires_at" timestamp,
	"requested_at" timestamp NOT NULL,
	"consented_at" timestamp,
	"revoked_at" timestamp,
	"revoked_by" text,
	CONSTRAINT "parent_links_parent_student_unique" UNIQUE("parent_user_id","student_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "phone_sign_in_codes" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"code_id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"ip_address" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_identities" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"identity_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" "identity_provider" NOT NULL,
	"subject" text NOT NULL,
	"verified_at" timestamp,
	"last_used_at" timestamp,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "user_identities_provider_subject_unique" UNIQUE("provider","subject"),
	CONSTRAINT "user_identities_user_provider_unique" UNIQUE("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coding_editor_drafts" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"draft_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"problem_id" text NOT NULL,
	"language" text NOT NULL,
	"source_code" text NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "coding_editor_drafts_unique" UNIQUE("user_id","problem_id","language")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coding_editorials" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"editorial_id" text PRIMARY KEY NOT NULL,
	"problem_id" text NOT NULL,
	"body" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_solution" text NOT NULL,
	"model_solution_language" text NOT NULL,
	"time_complexity" text NOT NULL,
	"space_complexity" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "coding_editorials_problem_unique" UNIQUE("problem_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coding_execution_usage" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"usage_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"run_id" text NOT NULL,
	"kind" "coding_run_kind" NOT NULL,
	"case_count" integer DEFAULT 0 NOT NULL,
	"billed_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "coding_execution_usage_run_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coding_frontend_assertions" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"assertion_id" text PRIMARY KEY NOT NULL,
	"problem_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"visibility" "coding_case_visibility" NOT NULL,
	"description" text NOT NULL,
	"script" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "coding_frontend_assertions_ordinal_unique" UNIQUE("problem_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coding_frontend_results" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"frontend_result_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"problem_id" text NOT NULL,
	"passed_ordinals" jsonb NOT NULL,
	"passed" boolean NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coding_give_ups" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"give_up_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"problem_id" text NOT NULL,
	"given_up_at" timestamp NOT NULL,
	CONSTRAINT "coding_give_ups_unique" UNIQUE("user_id","problem_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coding_problem_languages" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"problem_language_id" text PRIMARY KEY NOT NULL,
	"problem_id" text NOT NULL,
	"language" text NOT NULL,
	"starter_code" text DEFAULT '' NOT NULL,
	"reference_solution" text,
	"time_limit_ms" integer NOT NULL,
	"memory_limit_mb" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "coding_problem_languages_unique" UNIQUE("problem_id","language")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coding_problems" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"problem_id" text PRIMARY KEY NOT NULL,
	"kind" "coding_problem_kind" DEFAULT 'ALGORITHMIC' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"statement" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"constraints_text" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"topic_id" text,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"status" "coding_problem_status" DEFAULT 'DRAFT' NOT NULL,
	"validated_at" timestamp,
	"published_at" timestamp,
	"created_by" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "coding_problems_organization_slug_unique" UNIQUE("organization_id","slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coding_run_case_results" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"result_id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"case_ordinal" integer NOT NULL,
	"visibility" "coding_case_visibility" NOT NULL,
	"passed" boolean NOT NULL,
	"actual_output" text,
	"runtime_ms" integer,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "coding_run_case_results_unique" UNIQUE("run_id","case_ordinal")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coding_runs" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"run_id" text PRIMARY KEY NOT NULL,
	"problem_id" text NOT NULL,
	"user_id" text NOT NULL,
	"kind" "coding_run_kind" NOT NULL,
	"language" text NOT NULL,
	"source_code" text NOT NULL,
	"status" "coding_run_status" DEFAULT 'PENDING' NOT NULL,
	"verdict" "coding_verdict",
	"provider_ref" text,
	"failed_case_ordinal" integer,
	"failure_detail" text,
	"runtime_ms" integer,
	"memory_kb" integer,
	"queued_at" timestamp NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coding_test_cases" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"case_id" text PRIMARY KEY NOT NULL,
	"problem_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"visibility" "coding_case_visibility" NOT NULL,
	"input" text NOT NULL,
	"expected_output" text NOT NULL,
	"explanation" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "coding_test_cases_ordinal_unique" UNIQUE("problem_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "problem_set_items" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"item_id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"problem_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "problem_set_items_unique" UNIQUE("set_id","problem_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "problem_sets" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"set_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_check_runs" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"check_run_id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"build_status" "project_check_status" DEFAULT 'PENDING' NOT NULL,
	"lint_status" "project_check_status" DEFAULT 'PENDING' NOT NULL,
	"test_status" "project_check_status" DEFAULT 'PENDING' NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"harness_error" text,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "project_check_runs_submission_unique" UNIQUE("submission_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_criterion_scores" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"score_id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"criterion_id" text NOT NULL,
	"value" numeric(6, 2) NOT NULL,
	"comment" text,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "project_criterion_scores_unique" UNIQUE("submission_id","criterion_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_milestone_progress" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"progress_id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"milestone_id" text NOT NULL,
	"user_id" text NOT NULL,
	"state" "project_milestone_state" DEFAULT 'LOCKED' NOT NULL,
	"cycle" integer DEFAULT 0 NOT NULL,
	"opened_at" timestamp,
	"passed_at" timestamp,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "project_milestone_progress_unique" UNIQUE("milestone_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_milestones" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"milestone_id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"title" text NOT NULL,
	"description" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "project_milestones_ordinal_unique" UNIQUE("project_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_reviews" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"review_id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"outcome" "project_milestone_state" NOT NULL,
	"summary" text,
	"feedback_media_id" text,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "project_reviews_submission_unique" UNIQUE("submission_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_similarity_flags" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"flag_id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"source" "project_similarity_source" NOT NULL,
	"compared_submission_id" text,
	"compared_source_label" text,
	"score" numeric(5, 2) NOT NULL,
	"matched_regions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_submissions" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"submission_id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"milestone_id" text NOT NULL,
	"user_id" text NOT NULL,
	"cycle" integer NOT NULL,
	"repository_url" text NOT NULL,
	"deployment_url" text,
	"submitted_at" timestamp NOT NULL,
	"screened_at" timestamp,
	"reviewed_at" timestamp,
	"reviewed_by" text,
	"outcome" "project_milestone_state",
	CONSTRAINT "project_submissions_cycle_unique" UNIQUE("milestone_id","user_id","cycle")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"project_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"brief" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rubric_id" text NOT NULL,
	"starter_repository_url" text,
	"created_by" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_paths" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"path_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" "batch_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "learning_paths_organization_slug_unique" UNIQUE("organization_id","slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "path_certificates" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"certificate_id" text PRIMARY KEY NOT NULL,
	"path_id" text NOT NULL,
	"user_id" text NOT NULL,
	"certificate_number" text NOT NULL,
	"verification_code" text NOT NULL,
	"issued_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" text,
	"revocation_reason" text,
	CONSTRAINT "path_certificates_path_user_unique" UNIQUE("path_id","user_id"),
	CONSTRAINT "path_certificates_verification_unique" UNIQUE("verification_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "path_completion_criteria" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"criteria_id" text PRIMARY KEY NOT NULL,
	"path_id" text NOT NULL,
	"require_capstone" boolean DEFAULT true NOT NULL,
	"min_stages_complete_percent" integer DEFAULT 100 NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "path_completion_criteria_path_unique" UNIQUE("path_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "path_enrolments" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"enrolment_id" text PRIMARY KEY NOT NULL,
	"path_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "path_enrolment_status" DEFAULT 'ACTIVE' NOT NULL,
	"granted_by" text,
	"enrolled_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"revoked_at" timestamp,
	CONSTRAINT "path_enrolments_unique" UNIQUE("path_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "path_stage_prerequisites" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"prerequisite_id" text PRIMARY KEY NOT NULL,
	"path_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"required_stage_id" text NOT NULL,
	CONSTRAINT "path_stage_prerequisites_unique" UNIQUE("stage_id","required_stage_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "path_stage_progress" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"progress_id" text PRIMARY KEY NOT NULL,
	"path_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"user_id" text NOT NULL,
	"state" "path_stage_state" DEFAULT 'LOCKED' NOT NULL,
	"opened_at" timestamp,
	"completed_at" timestamp,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "path_stage_progress_unique" UNIQUE("stage_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "path_stages" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"stage_id" text PRIMARY KEY NOT NULL,
	"path_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"kind" "path_stage_kind" NOT NULL,
	"title" text NOT NULL,
	"batch_id" text,
	"problem_set_id" text,
	"project_id" text,
	"is_capstone" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "path_stages_ordinal_unique" UNIQUE("path_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill_demonstrations" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"demonstration_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"completed_items" integer DEFAULT 0 NOT NULL,
	"demonstrated_at" timestamp,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "skill_demonstrations_unique" UNIQUE("user_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill_tags" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"skill_tag_id" text PRIMARY KEY NOT NULL,
	"skill_id" text NOT NULL,
	"subject_kind" "skill_subject_kind" NOT NULL,
	"subject_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "skill_tags_unique" UNIQUE("skill_id","subject_kind","subject_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"skill_id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"required_items" integer DEFAULT 1 NOT NULL,
	"is_retired" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "skills_organization_key_unique" UNIQUE("organization_id","key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dev_environment_usage" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"usage_id" text PRIMARY KEY NOT NULL,
	"environment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"running_seconds" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dev_environments" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"environment_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"path_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"project_id" text NOT NULL,
	"provider_ref" text,
	"workspace_ref" text,
	"status" "dev_environment_status" DEFAULT 'PROVISIONING' NOT NULL,
	"cpu_limit" integer NOT NULL,
	"memory_limit_mb" integer NOT NULL,
	"egress_policy" jsonb NOT NULL,
	"failure_reason" text,
	"last_active_at" timestamp NOT NULL,
	"hibernated_at" timestamp,
	"reclaimed_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "dev_environments_user_stage_unique" UNIQUE("user_id","stage_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_items" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"item_id" text PRIMARY KEY NOT NULL,
	"portfolio_id" text NOT NULL,
	"user_id" text NOT NULL,
	"kind" "portfolio_item_kind" NOT NULL,
	"reference_id" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"published_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "portfolio_items_unique" UNIQUE("portfolio_id","kind","reference_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolios" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"portfolio_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"handle" text NOT NULL,
	"display_name" text,
	"headline" text,
	"bio" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "portfolios_user_unique" UNIQUE("user_id"),
	CONSTRAINT "portfolios_handle_unique" UNIQUE("handle")
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
	"scheduled_at" timestamp,
	"published_at" timestamp,
	"meta_title" text,
	"meta_description" text,
	"canonical_url" text,
	"og_image_url" text,
	"structured_data" jsonb,
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
CREATE TABLE IF NOT EXISTS "landing_pages" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"status" "page_status" DEFAULT 'DRAFT' NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"canonical_url" text,
	"og_image_url" text,
	"structured_data" jsonb,
	"published_at" timestamp,
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
CREATE TABLE IF NOT EXISTS "broadcasts" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"broadcast_id" text PRIMARY KEY NOT NULL,
	"audience_type" "broadcast_audience" NOT NULL,
	"audience_id" text,
	"segment" jsonb,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"recipient_ids" jsonb NOT NULL,
	"sent_by" text NOT NULL,
	"sent_at" timestamp NOT NULL
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
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"subscription_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"pruned_at" timestamp,
	"last_used_at" timestamp,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_feedback" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"feedback_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"user_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_encoding_jobs" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"job_id" text PRIMARY KEY NOT NULL,
	"lesson_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"rendition_kind" "media_rendition_kind" DEFAULT 'VIDEO' NOT NULL,
	"status" "video_encoding_job_status" DEFAULT 'PENDING' NOT NULL,
	"input_path" text NOT NULL,
	"output_path" text,
	"error_message" text,
	"duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "video_encoding_jobs_lesson_rendition_unique" UNIQUE("lesson_id","rendition_kind")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "export_jobs" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"export_job_id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"requested_by" text NOT NULL,
	"report_type" text NOT NULL,
	"sub_group_id" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"failure_reason" text,
	"export_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_schedules" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"schedule_id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"report_type" text NOT NULL,
	"sub_group_id" text,
	"cadence" text NOT NULL,
	"is_paused" boolean DEFAULT false NOT NULL,
	"next_run_at" timestamp NOT NULL,
	"last_run_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_batch_items" (
	"item_id" text PRIMARY KEY NOT NULL,
	"batch_id" text NOT NULL,
	"reference" text NOT NULL,
	"state" "ai_batch_item_state" DEFAULT 'PENDING' NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result_text" text,
	"result_structured" jsonb,
	"failure_reason" text,
	"reconciled_at" timestamp,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "ai_batch_items_reference_unique" UNIQUE("batch_id","reference")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_batches" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"batch_id" text PRIMARY KEY NOT NULL,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"provider_reference" text,
	"status" "ai_batch_status" DEFAULT 'SUBMITTED' NOT NULL,
	"requested_by" text,
	"failure_reason" text,
	"submitted_at" timestamp NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_model_calls" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"call_id" text PRIMARY KEY NOT NULL,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"outcome" "ai_call_outcome" NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cache_write_tokens" integer DEFAULT 0 NOT NULL,
	"batched" text DEFAULT 'NO' NOT NULL,
	"failure_reason" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_summaries" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"summary_id" text PRIMARY KEY NOT NULL,
	"lesson_id" text NOT NULL,
	"status" "lesson_summary_status" DEFAULT 'PENDING' NOT NULL,
	"summary" text,
	"key_points" jsonb DEFAULT '[]'::jsonb,
	"chapters" jsonb DEFAULT '[]'::jsonb,
	"requested_by" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "lesson_summaries_lesson_unique" UNIQUE("lesson_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_doubt_answers" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"answer_id" text PRIMARY KEY NOT NULL,
	"doubt_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"asked_by" text NOT NULL,
	"subject_id" text,
	"status" "ai_doubt_answer_status" DEFAULT 'PENDING' NOT NULL,
	"answer_text" text,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reply_id" text,
	"marked_unhelpful_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "ai_doubt_answers_doubt_unique" UNIQUE("doubt_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_doubt_drafts" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"draft_id" text PRIMARY KEY NOT NULL,
	"doubt_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"answer_id" text NOT NULL,
	"draft_text" text NOT NULL,
	"status" "ai_doubt_draft_status" DEFAULT 'PENDING' NOT NULL,
	"committed_at" timestamp,
	"committed_reply_id" text,
	"is_discarded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "ai_doubt_drafts_doubt_unique" UNIQUE("doubt_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "funnel_events" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"event_id" text PRIMARY KEY NOT NULL,
	"kind" "funnel_event_kind" NOT NULL,
	"batch_id" text,
	"source" text,
	"session_key" text,
	"user_id" text,
	"captured_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_shares" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"share_id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"granted_to" text NOT NULL,
	"granted_by" text NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "retention_cohort_rows" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"row_id" text PRIMARY KEY NOT NULL,
	"cohort_month" text NOT NULL,
	"source" text,
	"period_offset" integer NOT NULL,
	"active_count" integer NOT NULL,
	"computed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_reports" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"report_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_by" text NOT NULL,
	"definition" jsonb NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_applications" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"application_id" text PRIMARY KEY NOT NULL,
	"opening_id" text NOT NULL,
	"student_id" text NOT NULL,
	"portfolio_id" text NOT NULL,
	"status" "application_status" DEFAULT 'NEW' NOT NULL,
	"applied_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"notes" text,
	CONSTRAINT "job_applications_opening_student_unique" UNIQUE("opening_id","student_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_openings" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"opening_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"location" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" "job_opening_status" DEFAULT 'OPEN' NOT NULL,
	"posted_by" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mentor_session_feedback" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"feedback_id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"mentor_id" text NOT NULL,
	"student_id" text NOT NULL,
	"notes" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "mentor_session_feedback_session_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mock_interview_scores" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"score_id" text PRIMARY KEY NOT NULL,
	"mock_interview_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"score" integer NOT NULL,
	"notes" text,
	"edited_after_student_viewed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "mock_interview_scores_interview_skill_unique" UNIQUE("mock_interview_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mock_interviews" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"mock_interview_id" text PRIMARY KEY NOT NULL,
	"session_id" text,
	"path_id" text NOT NULL,
	"mentor_id" text NOT NULL,
	"student_id" text NOT NULL,
	"status" "mock_interview_status" DEFAULT 'SCHEDULED' NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"student_first_viewed_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "path_mentor_assignments" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"assignment_id" text PRIMARY KEY NOT NULL,
	"path_id" text NOT NULL,
	"mentor_id" text NOT NULL,
	"student_id" text NOT NULL,
	"assigned_by" text NOT NULL,
	"assigned_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" text,
	CONSTRAINT "path_mentor_assignments_active_unique" UNIQUE("path_id","mentor_id","student_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corporate_api_credentials" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"credential_id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"label" text NOT NULL,
	"key_hash" text NOT NULL,
	"issued_by" text NOT NULL,
	"issued_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"revoked_by" text,
	CONSTRAINT "corporate_api_credentials_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corporate_branding" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"branding_id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"primary_color" text,
	"updated_by" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "corporate_branding_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corporate_sso_configs" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"sso_config_id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"provider_type" "sso_provider_type" NOT NULL,
	"issuer_url" text NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "corporate_sso_configs_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corporate_sso_links" (
	"organization_id" text DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"link_id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"user_id" text NOT NULL,
	"external_subject" text NOT NULL,
	"linked_at" timestamp NOT NULL,
	CONSTRAINT "corporate_sso_links_company_subject_unique" UNIQUE("company_id","external_subject"),
	CONSTRAINT "corporate_sso_links_company_user_unique" UNIQUE("company_id","user_id")
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
CREATE INDEX IF NOT EXISTS "second_factor_challenges_token_idx" ON "second_factor_challenges" ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "second_factor_challenges_user_idx" ON "second_factor_challenges" ("user_id");--> statement-breakpoint
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
CREATE INDEX IF NOT EXISTS "assessment_question_versions_question_idx" ON "assessment_question_versions" ("question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_questions_subject_idx" ON "assessment_questions" ("subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_questions_topic_idx" ON "assessment_questions" ("topic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_questions_sub_topic_idx" ON "assessment_questions" ("sub_topic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_questions_group_idx" ON "assessment_questions" ("group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_questions_difficulty_idx" ON "assessment_questions" ("authored_difficulty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_taxonomy_nodes_parent_idx" ON "assessment_taxonomy_nodes" ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_taxonomy_nodes_kind_idx" ON "assessment_taxonomy_nodes" ("kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_anomaly_flags_attempt_idx" ON "assessment_anomaly_flags" ("attempt_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_anomaly_flags_test_idx" ON "assessment_anomaly_flags" ("test_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_attempt_answers_attempt_idx" ON "assessment_attempt_answers" ("attempt_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_attempt_answers_question_idx" ON "assessment_attempt_answers" ("question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_attempt_answers_status_idx" ON "assessment_attempt_answers" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_attempts_test_idx" ON "assessment_attempts" ("test_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_attempts_user_idx" ON "assessment_attempts" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_criterion_scores_answer_idx" ON "assessment_criterion_scores" ("answer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_error_notebook_user_idx" ON "assessment_error_notebook" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_import_rows_import_idx" ON "assessment_import_rows" ("import_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_practice_sets_user_idx" ON "assessment_practice_sets" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_questions_served_user_idx" ON "assessment_questions_served" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_questions_served_user_question_idx" ON "assessment_questions_served" ("user_id","question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_regrade_requests_answer_idx" ON "assessment_regrade_requests" ("answer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_regrade_requests_status_idx" ON "assessment_regrade_requests" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_rubric_criteria_rubric_idx" ON "assessment_rubric_criteria" ("rubric_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_test_questions_test_idx" ON "assessment_test_questions" ("test_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_test_questions_question_idx" ON "assessment_test_questions" ("question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_tests_batch_idx" ON "assessment_tests" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_tests_exam_idx" ON "assessment_tests" ("exam_label","exam_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_weak_topics_user_idx" ON "assessment_weak_topics" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "curriculum_test_placements_subject_order_idx" ON "curriculum_test_placements" ("subject_id","order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "curriculum_test_placements_batch_idx" ON "curriculum_test_placements" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_annotations_user_lesson_idx" ON "document_annotations" ("user_id","lesson_id","page");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_annotations_lesson_version_idx" ON "document_annotations" ("lesson_id","document_version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_bookmarks_user_recency_idx" ON "lesson_bookmarks" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_inline_answers_lesson_idx" ON "lesson_inline_answers" ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_notes_user_batch_idx" ON "lesson_notes" ("user_id","batch_id","updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_transcript_segments_lesson_idx" ON "lesson_transcript_segments" ("lesson_id","start_seconds");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_transcripts_status_idx" ON "lesson_transcripts" ("status","requested_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_video_bookmarks_user_lesson_idx" ON "lesson_video_bookmarks" ("user_id","lesson_id","timestamp_seconds");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_video_bookmarks_user_batch_idx" ON "lesson_video_bookmarks" ("user_id","batch_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_review_queue_entries_queue_idx" ON "daily_review_queue_entries" ("queue_id","completed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_items_due_idx" ON "review_items" ("user_id","retired_at","due_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_logs_item_idx" ON "review_logs" ("review_item_id","reviewed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "review_logs_user_idx" ON "review_logs" ("user_id","reviewed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_badges_user_idx" ON "student_badges" ("user_id","awarded_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_question_bookmarks_user_idx" ON "student_question_bookmarks" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_time_daily_totals_user_day_idx" ON "study_time_daily_totals" ("user_id","day");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_time_sessions_open_idx" ON "study_time_sessions" ("user_id","closed_at","last_event_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_time_sessions_lesson_idx" ON "study_time_sessions" ("user_id","lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "weekly_report_cards_week_idx" ON "weekly_report_cards" ("week_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_feed_posts_batch_idx" ON "batch_feed_posts" ("batch_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_feed_posts_parent_idx" ON "batch_feed_posts" ("parent_post_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_feed_posts_author_idx" ON "batch_feed_posts" ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_reports_queue_idx" ON "content_reports" ("batch_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_reports_target_idx" ON "content_reports" ("target_kind","target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_group_members_user_idx" ON "study_group_members" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_group_messages_group_idx" ON "study_group_messages" ("group_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_groups_batch_idx" ON "study_groups" ("batch_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_wishlist_user_idx" ON "batch_wishlist" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diagnostic_results_current_idx" ON "diagnostic_results" ("user_id","superseded_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_documents_listed_idx" ON "search_documents" ("is_listed","kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_profiles_goal_idx" ON "student_profiles" ("goal_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parent_links_parent_idx" ON "parent_links" ("parent_user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "parent_links_student_idx" ON "parent_links" ("student_user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "phone_sign_in_codes_phone_idx" ON "phone_sign_in_codes" ("phone","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "phone_sign_in_codes_live_idx" ON "phone_sign_in_codes" ("phone","consumed_at","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_identities_user_idx" ON "user_identities" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coding_execution_usage_user_idx" ON "coding_execution_usage" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coding_frontend_results_user_problem_idx" ON "coding_frontend_results" ("user_id","problem_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coding_problems_status_idx" ON "coding_problems" ("status","difficulty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coding_problems_topic_idx" ON "coding_problems" ("topic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coding_runs_history_idx" ON "coding_runs" ("user_id","problem_id","queued_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coding_runs_provider_idx" ON "coding_runs" ("provider_ref");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coding_runs_pending_idx" ON "coding_runs" ("status","queued_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coding_test_cases_visibility_idx" ON "coding_test_cases" ("problem_id","visibility");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "problem_set_items_ordinal_idx" ON "problem_set_items" ("set_id","ordinal");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_criterion_scores_submission_idx" ON "project_criterion_scores" ("submission_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_milestone_progress_user_idx" ON "project_milestone_progress" ("user_id","project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_milestones_project_idx" ON "project_milestones" ("project_id","ordinal");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_similarity_flags_submission_idx" ON "project_similarity_flags" ("submission_id","score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_submissions_queue_idx" ON "project_submissions" ("reviewed_at","submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_submissions_user_idx" ON "project_submissions" ("user_id","submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_rubric_idx" ON "projects" ("rubric_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "path_certificates_user_idx" ON "path_certificates" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "path_enrolments_user_idx" ON "path_enrolments" ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "path_stage_prerequisites_stage_idx" ON "path_stage_prerequisites" ("stage_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "path_stage_progress_user_path_idx" ON "path_stage_progress" ("user_id","path_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "path_stages_path_idx" ON "path_stages" ("path_id","ordinal");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "path_stages_batch_idx" ON "path_stages" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "skill_tags_subject_idx" ON "skill_tags" ("subject_kind","subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dev_environment_usage_environment_idx" ON "dev_environment_usage" ("environment_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dev_environment_usage_user_idx" ON "dev_environment_usage" ("user_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dev_environments_live_idx" ON "dev_environments" ("status","last_active_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dev_environments_user_idx" ON "dev_environments" ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_items_portfolio_idx" ON "portfolio_items" ("portfolio_id","published_at");--> statement-breakpoint
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
CREATE UNIQUE INDEX IF NOT EXISTS "landing_pages_slug_key" ON "landing_pages" ("organization_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "landing_pages_status_idx" ON "landing_pages" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_settings_key_idx" ON "site_settings" ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_links_display_order_idx" ON "social_links" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testimonials_display_order_idx" ON "testimonials" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testimonials_is_active_idx" ON "testimonials" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "why_choose_us_display_order_idx" ON "why_choose_us" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "why_choose_us_is_active_idx" ON "why_choose_us" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instructor_badges_is_active_idx" ON "instructor_badges" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcasts_sent_at_idx" ON "broadcasts" ("sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "broadcasts_audience_idx" ON "broadcasts" ("audience_type","audience_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_templates_type_idx" ON "notification_templates" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id","read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notifications_dedupe_key_idx" ON "notifications" ("dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_idx" ON "push_subscriptions" ("endpoint");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_idx" ON "push_subscriptions" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_device_idx" ON "push_subscriptions" ("device_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_feedback_subject_idx" ON "student_feedback" ("batch_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_feedback_author_idx" ON "student_feedback" ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_encoding_jobs_lesson_idx" ON "video_encoding_jobs" ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_encoding_jobs_batch_idx" ON "video_encoding_jobs" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_encoding_jobs_status_idx" ON "video_encoding_jobs" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "export_jobs_contract_idx" ON "export_jobs" ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "export_jobs_requested_by_idx" ON "export_jobs" ("requested_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "export_jobs_status_idx" ON "export_jobs" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_schedules_due_idx" ON "report_schedules" ("is_paused","next_run_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_schedules_recipient_idx" ON "report_schedules" ("recipient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_schedules_contract_idx" ON "report_schedules" ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_batch_items_state_idx" ON "ai_batch_items" ("batch_id","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_batches_status_idx" ON "ai_batches" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_model_calls_feature_idx" ON "ai_model_calls" ("organization_id","feature","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_model_calls_created_idx" ON "ai_model_calls" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_summaries_status_idx" ON "lesson_summaries" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_doubt_answers_pending_idx" ON "ai_doubt_answers" ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_doubt_answers_batch_idx" ON "ai_doubt_answers" ("batch_id","marked_unhelpful_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_doubt_drafts_doubt_idx" ON "ai_doubt_drafts" ("doubt_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_doubt_drafts_answer_idx" ON "ai_doubt_drafts" ("answer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnel_events_kind_idx" ON "funnel_events" ("kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnel_events_captured_at_idx" ON "funnel_events" ("captured_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnel_events_source_idx" ON "funnel_events" ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnel_events_batch_idx" ON "funnel_events" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_shares_report_idx" ON "report_shares" ("report_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_shares_granted_to_idx" ON "report_shares" ("granted_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retention_cohort_rows_cohort_idx" ON "retention_cohort_rows" ("cohort_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "retention_cohort_rows_computed_at_idx" ON "retention_cohort_rows" ("computed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_reports_created_by_idx" ON "saved_reports" ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_applications_student_idx" ON "job_applications" ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_applications_opening_idx" ON "job_applications" ("opening_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_openings_status_idx" ON "job_openings" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mentor_session_feedback_mentor_idx" ON "mentor_session_feedback" ("mentor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mock_interview_scores_interview_idx" ON "mock_interview_scores" ("mock_interview_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mock_interviews_path_student_idx" ON "mock_interviews" ("path_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mock_interviews_mentor_idx" ON "mock_interviews" ("mentor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "path_mentor_assignments_path_student_idx" ON "path_mentor_assignments" ("path_id","student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "path_mentor_assignments_mentor_idx" ON "path_mentor_assignments" ("mentor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_api_credentials_company_idx" ON "corporate_api_credentials" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_api_credentials_key_hash_idx" ON "corporate_api_credentials" ("key_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_branding_company_idx" ON "corporate_branding" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_sso_configs_company_idx" ON "corporate_sso_configs" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_sso_links_company_idx" ON "corporate_sso_links" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_sso_links_user_idx" ON "corporate_sso_links" ("user_id");--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "search_documents" DROP COLUMN IF EXISTS "search_vector";
--> statement-breakpoint
ALTER TABLE "search_documents" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("body", '')), 'B')
  ) STORED;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_documents_vector_idx"
  ON "search_documents" USING gin ("search_vector");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_transcript_segments_body_idx"
  ON "lesson_transcript_segments"
  USING gin (to_tsvector('english', "body"));
--> statement-breakpoint
ALTER TABLE "study_time_daily_totals"
  DROP CONSTRAINT IF EXISTS "study_time_daily_totals_bucket_unique";
--> statement-breakpoint
ALTER TABLE "study_time_daily_totals"
  ADD CONSTRAINT "study_time_daily_totals_bucket_unique"
  UNIQUE NULLS NOT DISTINCT ("user_id", "day", "batch_id", "subject_id");
