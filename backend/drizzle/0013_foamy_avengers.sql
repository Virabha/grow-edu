DO $$ BEGIN
 CREATE TYPE "application_status" AS ENUM('NEW', 'REVIEWED', 'CONTACTED', 'ACCEPTED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
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
ALTER TABLE "contact_submissions" ADD COLUMN "mobile" text;--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN "course_interested" text;--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "contact_submissions" ADD COLUMN "document_url" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "form_schema" jsonb;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_applications_service_idx" ON "service_applications" ("service_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_applications_status_idx" ON "service_applications" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_applications_email_idx" ON "service_applications" ("applicant_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_applications_created_at_idx" ON "service_applications" ("created_at");