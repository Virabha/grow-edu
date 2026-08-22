import 'dotenv/config';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const BASELINE = 'drizzle-baseline/0000_baseline.sql';

const TOLERATED = [
  'already exists',
  'duplicate key value',
  'duplicate_object',
  'duplicate column',
];

function tolerable(message) {
  const lower = message.toLowerCase();
  return TOLERATED.some((fragment) => lower.includes(fragment));
}

function parseEnums(sql) {
  const enums = new Map();
  const pattern = /CREATE TYPE "([^"]+)" AS ENUM\(([^)]*)\);/g;
  let match;
  while ((match = pattern.exec(sql)) !== null) {
    const values = [];
    const valuePattern = /'((?:[^']|'')*)'/g;
    let valueMatch;
    while ((valueMatch = valuePattern.exec(match[2])) !== null) {
      values.push(valueMatch[1].replace(/''/g, "'"));
    }
    enums.set(match[1], values);
  }
  return enums;
}

async function syncEnums(sql, baseline) {
  const wanted = parseEnums(baseline);
  const live = await sql`
    select t.typname as name, e.enumlabel as label, e.enumsortorder as position
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    order by t.typname, e.enumsortorder
  `;
  const present = new Map();
  for (const row of live) {
    const held = present.get(row.name);
    if (held) held.push(row.label);
    else present.set(row.name, [row.label]);
  }

  const added = [];
  for (const [name, values] of wanted) {
    const existing = present.get(name);
    if (!existing) continue;
    let previous = null;
    for (const value of values) {
      if (existing.includes(value)) {
        previous = value;
        continue;
      }
      const placement = previous
        ? `AFTER '${previous.replace(/'/g, "''")}'`
        : `BEFORE '${existing[0].replace(/'/g, "''")}'`;
      await sql.unsafe(
        `ALTER TYPE "${name}" ADD VALUE IF NOT EXISTS '${value.replace(/'/g, "''")}' ${placement}`,
      );
      added.push(`${name}.${value}`);
      previous = value;
    }
  }
  return added;
}

function parseTableColumns(sql) {
  const tables = new Map();
  const pattern = /CREATE TABLE IF NOT EXISTS "([^"]+)" \(([\s\S]*?)\n\);/g;
  let match;
  while ((match = pattern.exec(sql)) !== null) {
    const table = match[1];
    const columns = [];
    for (const rawLine of match[2].split('\n')) {
      const line = rawLine.trim().replace(/,$/, '');
      if (!line.startsWith('"')) continue;
      const nameMatch = /^"([^"]+)"\s+(.*)$/.exec(line);
      if (!nameMatch) continue;
      const name = nameMatch[1];
      let definition = nameMatch[2].trim();
      if (/^CONSTRAINT/i.test(definition)) continue;
      const hasDefault = /\bDEFAULT\b/i.test(definition);
      const notNull = /\bNOT NULL\b/i.test(definition);
      if (notNull && !hasDefault) {
        definition = definition.replace(/\s*NOT NULL\s*/i, ' ').trim();
      }
      columns.push({ name, definition, relaxed: notNull && !hasDefault });
    }
    tables.set(table, columns);
  }
  return tables;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const sql = postgres(connectionString, { max: 1 });
  const baseline = readFileSync(BASELINE, 'utf8');

  const statements = baseline
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let applied = 0;
  let skipped = 0;
  const failures = [];

  const enumValues = await syncEnums(sql, baseline);
  console.log(`enum values added: ${enumValues.length}`);
  for (const name of enumValues) console.log(`  + ${name}`);

  for (const statement of statements) {
    try {
      await sql.unsafe(statement);
      applied += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (tolerable(message)) {
        skipped += 1;
      } else {
        failures.push({ statement: statement.slice(0, 120), message });
      }
    }
  }

  console.log(`baseline: ${applied} applied, ${skipped} already present`);

  const existing = await sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
  `;
  const present = new Map();
  for (const row of existing) {
    const held = present.get(row.table_name);
    if (held) held.add(row.column_name);
    else present.set(row.table_name, new Set([row.column_name]));
  }

  const wanted = parseTableColumns(baseline);
  const added = [];
  const relaxed = [];

  for (const [table, columns] of wanted) {
    const live = present.get(table);
    if (!live) continue;
    for (const column of columns) {
      if (live.has(column.name)) continue;
      const ddl = `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column.name}" ${column.definition}`;
      try {
        await sql.unsafe(ddl);
        added.push(`${table}.${column.name}`);
        if (column.relaxed) relaxed.push(`${table}.${column.name}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!tolerable(message)) {
          failures.push({ statement: ddl, message });
        }
      }
    }
  }

  console.log(`columns added: ${added.length}`);
  for (const name of added) console.log(`  + ${name}`);

  if (relaxed.length > 0) {
    console.log(
      `\nAdded as NULLABLE because the column is NOT NULL with no default and the table already holds rows:`,
    );
    for (const name of relaxed) console.log(`  ! ${name}`);
  }

  if (failures.length > 0) {
    console.log(`\nfailures: ${failures.length}`);
    for (const failure of failures) {
      console.log(`  x ${failure.message}`);
      console.log(`    ${failure.statement}`);
    }
  }

  await sql.end({ timeout: 5 });
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('Schema sync failed:', err);
  process.exit(1);
});
