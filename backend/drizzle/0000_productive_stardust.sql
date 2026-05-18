DO $$ BEGIN
 CREATE TYPE "access_source" AS ENUM('SECTION_PURCHASE', 'COURSE_PURCHASE', 'ADMIN_GRANT');
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
 CREATE TYPE "enrollment_status" AS ENUM('ACTIVE', 'COMPLETED', 'REVOKED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "item_type" AS ENUM('COURSE', 'SECTION');
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
 CREATE TYPE "payment_gateway" AS ENUM('RAZORPAY', 'STRIPE_US', 'STRIPE_UAE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "payment_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
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
CREATE TABLE IF NOT EXISTS "cart_items" (
	"cart_item_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"course_id" text,
	"section_id" text,
	"item_type" "item_type" DEFAULT 'COURSE' NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_user_item_unique" UNIQUE("user_id","course_id","section_id","item_type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"category_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
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
	"currency" text DEFAULT 'USD' NOT NULL,
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
CREATE TABLE IF NOT EXISTS "enrollments" (
	"enrollment_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"course_id" text NOT NULL,
	"company_id" text,
	"status" "enrollment_status" DEFAULT 'ACTIVE' NOT NULL,
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
	"last_accessed" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_progress_lesson_unique" UNIQUE("course_progress_id","lesson_id")
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
CREATE TABLE IF NOT EXISTS "payments" (
	"payment_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"enrollment_id" text,
	"course_id" text,
	"section_id" text,
	"item_type" "item_type" DEFAULT 'COURSE' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"gateway" "payment_gateway" NOT NULL,
	"gateway_id" text,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_enrollment_id_unique" UNIQUE("enrollment_id")
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
CREATE TABLE IF NOT EXISTS "users" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" "user_role" DEFAULT 'LEARNER' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"company_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cart_items_user_idx" ON "cart_items" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cart_items_course_idx" ON "cart_items" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cart_items_section_idx" ON "cart_items" ("section_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_slug_idx" ON "categories" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_name_idx" ON "companies" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_progress_user_idx" ON "course_progress" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_progress_course_idx" ON "course_progress" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_sections_course_idx" ON "course_sections" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_slug_idx" ON "courses" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_category_idx" ON "courses" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_instructor_idx" ON "courses" ("instructor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "courses_status_idx" ON "courses" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollments_user_idx" ON "enrollments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollments_course_idx" ON "enrollments" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enrollments_company_idx" ON "enrollments" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_progress_progress_idx" ON "lesson_progress" ("course_progress_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_progress_lesson_idx" ON "lesson_progress" ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lessons_section_idx" ON "lessons" ("section_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_user_idx" ON "payments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_gateway_idx" ON "payments" ("gateway_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_course_idx" ON "payments" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_section_idx" ON "payments" ("section_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_questions_lesson_idx" ON "quiz_questions" ("lesson_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "section_access_user_idx" ON "section_access" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "section_access_course_idx" ON "section_access" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "section_access_section_idx" ON "section_access" ("section_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "section_access_payment_idx" ON "section_access" ("payment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" ("role");