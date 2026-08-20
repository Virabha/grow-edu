import { execFileSync } from 'node:child_process';
import { readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'drizzle-baseline';
const TARGET = '0000_baseline.sql';

rmSync(DIR, { recursive: true, force: true });

execFileSync(
  'drizzle-kit',
  ['generate:pg', '--config', 'drizzle.baseline.config.ts'],
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

console.log(`Baseline written to ${join(DIR, TARGET)}`);
