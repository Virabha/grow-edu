ALTER TYPE "payment_gateway" ADD VALUE 'PHONEPE';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "transaction_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payer_name" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_transaction_id_idx" ON "payments" ("transaction_id");