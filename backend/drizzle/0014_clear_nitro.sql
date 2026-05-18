ALTER TYPE "payment_gateway" ADD VALUE 'MANUAL_QR';--> statement-breakpoint
ALTER TYPE "payment_status" ADD VALUE 'PROOF_UPLOADED';--> statement-breakpoint
ALTER TYPE "payment_status" ADD VALUE 'REJECTED';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_proof_url" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "proof_uploaded_at" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "review_notes" text;