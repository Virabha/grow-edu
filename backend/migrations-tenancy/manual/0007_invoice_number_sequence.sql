CREATE SEQUENCE IF NOT EXISTS payments_invoice_seq START 1000;
--> statement-breakpoint

UPDATE payments
   SET invoice_no = 'INV-' || lpad(nextval('payments_invoice_seq')::text, 8, '0')
 WHERE invoice_no IS NULL;
--> statement-breakpoint

ALTER TABLE payments
  ALTER COLUMN invoice_no
  SET DEFAULT 'INV-' || lpad(nextval('payments_invoice_seq')::text, 8, '0');
