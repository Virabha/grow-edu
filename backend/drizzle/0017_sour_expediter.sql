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
CREATE INDEX IF NOT EXISTS "batch_announcements_batch_idx" ON "batch_announcements" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_announcements_created_at_idx" ON "batch_announcements" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_enrollments_batch_idx" ON "batch_enrollments" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_enrollments_user_idx" ON "batch_enrollments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_sessions_batch_idx" ON "batch_sessions" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_sessions_subject_idx" ON "batch_sessions" ("subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_sessions_scheduled_start_idx" ON "batch_sessions" ("scheduled_start_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_sessions_type_idx" ON "batch_sessions" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_subjects_batch_idx" ON "batch_subjects" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_slug_idx" ON "batches" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_status_idx" ON "batches" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batches_start_date_idx" ON "batches" ("start_date");