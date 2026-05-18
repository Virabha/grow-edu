DO $$ BEGIN
 CREATE TYPE "email_token_type" AS ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET');
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
ALTER TABLE "lesson_progress" ADD COLUMN "last_position" integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_tokens_user_id_idx" ON "email_tokens" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_tokens_token_hash_idx" ON "email_tokens" ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_tokens_expires_at_idx" ON "email_tokens" ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_encoding_jobs_lesson_idx" ON "video_encoding_jobs" ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_encoding_jobs_course_idx" ON "video_encoding_jobs" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_encoding_jobs_status_idx" ON "video_encoding_jobs" ("status");