DO $$ BEGIN
 CREATE TYPE "batch_doubt_status" AS ENUM('OPEN', 'ANSWERED', 'CLOSED');
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
CREATE INDEX IF NOT EXISTS "batch_attendance_session_idx" ON "batch_attendance" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_attendance_user_idx" ON "batch_attendance" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_doubt_replies_doubt_idx" ON "batch_doubt_replies" ("doubt_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_doubts_batch_idx" ON "batch_doubts" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_doubts_status_idx" ON "batch_doubts" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_doubts_asked_by_idx" ON "batch_doubts" ("asked_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quiz_attempts_quiz_idx" ON "batch_quiz_attempts" ("quiz_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quiz_attempts_user_idx" ON "batch_quiz_attempts" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quiz_attempts_quiz_user_idx" ON "batch_quiz_attempts" ("quiz_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quiz_questions_quiz_idx" ON "batch_quiz_questions" ("quiz_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quizzes_batch_idx" ON "batch_quizzes" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_quizzes_subject_idx" ON "batch_quizzes" ("subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_resources_batch_idx" ON "batch_resources" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_resources_type_idx" ON "batch_resources" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_resources_subject_idx" ON "batch_resources" ("subject_id");