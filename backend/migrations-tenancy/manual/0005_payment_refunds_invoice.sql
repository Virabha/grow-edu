-- Refund tracking and invoice numbers on payments.
--
-- `payments` belongs to the application schema in backend/drizzle, not to the
-- tenancy schema this folder migrates. On a deployed database both schemas are
-- present and every statement below runs. On the tenancy CI job only the
-- tenancy schema is applied, so the table is absent and this file must stand
-- down rather than abort the run — the isolation proof that follows does not
-- depend on it.
DO $$ BEGIN
  CREATE TYPE refund_status AS ENUM ('NONE', 'REQUESTED', 'APPROVED', 'DECLINED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF to_regclass('public.payments') IS NULL THEN
    RAISE NOTICE 'skipping 0005: table "payments" is absent (application schema not applied)';
    RETURN;
  END IF;

  ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_no text;
  CREATE UNIQUE INDEX IF NOT EXISTS payments_invoice_no_key ON payments (invoice_no);
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS tax_amount numeric(10, 2) DEFAULT '0';
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_status refund_status NOT NULL DEFAULT 'NONE';
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_reason text;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_requested_at timestamp;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_resolved_at timestamp;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_resolved_by text;
  CREATE INDEX IF NOT EXISTS payments_user_created_idx ON payments (user_id, created_at);
  CREATE INDEX IF NOT EXISTS payments_refund_status_idx ON payments (refund_status);
END $$;
