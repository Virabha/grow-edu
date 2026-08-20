import { execFileSync } from 'node:child_process';
import { appendFileSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'drizzle-baseline';
const TARGET = '0000_baseline.sql';
const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';

const SEED_DEFAULT_ORGANIZATION = `--> statement-breakpoint
INSERT INTO "organizations" ("organization_id", "name", "slug")
VALUES ('${DEFAULT_ORGANIZATION_ID}', 'groEdu', 'groedu')
ON CONFLICT ("organization_id") DO NOTHING;
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

console.log(`Baseline written to ${join(DIR, TARGET)}`);
