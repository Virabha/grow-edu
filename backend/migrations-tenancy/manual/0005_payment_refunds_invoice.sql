DO $$ BEGIN
  CREATE TYPE refund_status AS ENUM ('NONE', 'REQUESTED', 'APPROVED', 'DECLINED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_no text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS payments_invoice_no_key ON payments (invoice_no);
--> statement-breakpoint
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tax_amount numeric(10, 2) DEFAULT '0';
--> statement-breakpoint
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_status refund_status NOT NULL DEFAULT 'NONE';
--> statement-breakpoint
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_reason text;
--> statement-breakpoint
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_requested_at timestamp;
--> statement-breakpoint
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_resolved_at timestamp;
--> statement-breakpoint
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_resolved_by text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS payments_user_created_idx ON payments (user_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS payments_refund_status_idx ON payments (refund_status);
