DO $$ BEGIN
 CREATE TYPE "notification_type" AS ENUM('BATCH_ANNOUNCEMENT', 'BATCH_DOUBT_REPLY', 'BATCH_SESSION_SCHEDULED', 'BATCH_QUIZ_PUBLISHED', 'BATCH_RESOURCE_ADDED', 'BATCH_ENROLLMENT', 'BATCH_CERTIFICATE', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'GENERIC');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "item_type" ADD VALUE 'BATCH';--> statement-breakpoint
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
CREATE INDEX IF NOT EXISTS "batch_certificates_batch_idx" ON "batch_certificates" ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_certificates_user_idx" ON "batch_certificates" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id","read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" ("created_at");