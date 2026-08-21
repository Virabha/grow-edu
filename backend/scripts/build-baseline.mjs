import { execFileSync } from 'node:child_process';
import { appendFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'drizzle-baseline';
const TARGET = '0000_baseline.sql';
const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';

const APPEND_ONLY_AUDIT_LOG = `--> statement-breakpoint
CREATE OR REPLACE FUNCTION audit_log_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_log_no_mutation ON "audit_log";
--> statement-breakpoint
CREATE TRIGGER audit_log_no_mutation
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();
`;

const IMMUTABLE_INVOICES = `--> statement-breakpoint
CREATE OR REPLACE FUNCTION invoices_are_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'an issued invoice cannot be changed; issue a credit note instead';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS invoices_no_mutation ON "invoices";
--> statement-breakpoint
CREATE TRIGGER invoices_no_mutation
  BEFORE UPDATE OR DELETE ON "invoices"
  FOR EACH ROW EXECUTE FUNCTION invoices_are_immutable();
`;

const SEED_DEFAULT_ORGANIZATION = `--> statement-breakpoint
INSERT INTO "organizations" ("organization_id", "name", "slug")
VALUES ('${DEFAULT_ORGANIZATION_ID}', 'groEdu', 'groedu')
ON CONFLICT ("organization_id") DO NOTHING;
`;

const SEARCH_DOCUMENT_FULL_TEXT = `--> statement-breakpoint
ALTER TABLE "search_documents" DROP COLUMN IF EXISTS "search_vector";
--> statement-breakpoint
ALTER TABLE "search_documents" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("body", '')), 'B')
  ) STORED;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_documents_vector_idx"
  ON "search_documents" USING gin ("search_vector");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_transcript_segments_body_idx"
  ON "lesson_transcript_segments"
  USING gin (to_tsvector('english', "body"));
`;

rmSync(DIR, { recursive: true, force: true });

execFileSync(
  'npx',
  ['drizzle-kit', 'generate:pg', '--config', 'drizzle.baseline.config.ts'],
  { stdio: 'inherit', shell: true },
);

const generated = readdirSync(DIR).filter((f) => f.endsWith('.sql'));

if (generated.length !== 1) {
  throw new Error(
    `Expected drizzle-kit to emit exactly one baseline, found ${generated.length}: ${generated.join(', ')}`,
  );
}

renameSync(join(DIR, generated[0]), join(DIR, TARGET));
rmSync(join(DIR, 'meta'), { recursive: true, force: true });
appendFileSync(join(DIR, TARGET), SEED_DEFAULT_ORGANIZATION);
appendFileSync(join(DIR, TARGET), APPEND_ONLY_AUDIT_LOG);
appendFileSync(join(DIR, TARGET), IMMUTABLE_INVOICES);
appendFileSync(join(DIR, TARGET), SEARCH_DOCUMENT_FULL_TEXT);

console.log(`Baseline written to ${join(DIR, TARGET)}`);
