-- Backfills invoice numbers and makes the sequence the column default.
--
-- Depends on 0005, and through it on `payments` from the application schema in
-- backend/drizzle. Absent on the tenancy CI job, where this file stands down.
CREATE SEQUENCE IF NOT EXISTS payments_invoice_seq START 1000;
--> statement-breakpoint

DO $$
BEGIN
  IF to_regclass('public.payments') IS NULL THEN
    RAISE NOTICE 'skipping 0007: table "payments" is absent (application schema not applied)';
    RETURN;
  END IF;

  UPDATE payments
     SET invoice_no = 'INV-' || lpad(nextval('payments_invoice_seq')::text, 8, '0')
   WHERE invoice_no IS NULL;

  ALTER TABLE payments
    ALTER COLUMN invoice_no
    SET DEFAULT 'INV-' || lpad(nextval('payments_invoice_seq')::text, 8, '0');
END $$;
