import * as fs from 'fs';
import * as path from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '../../src/database/schema';
import postgres = require('postgres');

export type TestDatabase = {
  schemaName: string;
  db: ReturnType<typeof drizzle<typeof schema>>;
  client: postgres.Sql;
  destroy: () => Promise<void>;
};

const BASELINE_DIR = path.join(__dirname, '..', '..', 'drizzle-baseline');
const STATEMENT_BREAKPOINT = '--> statement-breakpoint';

function baselineFiles(): string[] {
  return fs
    .readdirSync(BASELINE_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function statementsIn(file: string): string[] {
  return fs
    .readFileSync(path.join(BASELINE_DIR, file), 'utf8')
    .split(STATEMENT_BREAKPOINT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function uniqueSchemaName(): string {
  const random = Math.floor(Math.random() * 1e9).toString(36);
  return `test_${process.pid.toString(36)}_${random}`;
}

function unpooledUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Integration tests need a reachable Postgres.',
    );
  }
  return url.replace('-pooler', '');
}

function connect(schemaName?: string): postgres.Sql {
  return postgres(unpooledUrl(), {
    max: schemaName ? 3 : 1,
    connect_timeout: 20,
    ssl: { rejectUnauthorized: false },
    onnotice: () => undefined,
    ...(schemaName && {
      connection: { options: `-c search_path=${schemaName}` },
    }),
  });
}

async function assertIsolatedSchema(
  client: postgres.Sql,
  schemaName: string,
): Promise<void> {
  const [row] = await client.unsafe<{ current: string }[]>(
    'select current_schema() as current',
  );
  if (row?.current !== schemaName) {
    throw new Error(
      `Refusing to build the schema: expected search_path to resolve to ` +
        `"${schemaName}" but it resolved to "${row?.current}". ` +
        `Continuing would mutate a shared schema. ` +
        `Neon's -pooler endpoint rejects the search_path startup parameter, ` +
        `so the connection must use the unpooled host.`,
    );
  }
}

async function applyBaselineFile(
  client: postgres.Sql,
  file: string,
  schemaName: string,
): Promise<void> {
  for (const statement of statementsIn(file)) {
    try {
      await client.unsafe(statement).simple();
    } catch (error) {
      throw new Error(
        `Baseline ${file} failed in schema ${schemaName}: ${
          (error as Error).message
        }\n--- statement ---\n${statement.slice(0, 300)}`,
      );
    }
  }
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const schemaName = uniqueSchemaName();

  const admin = connect();
  try {
    await admin.unsafe(`CREATE SCHEMA "${schemaName}"`);
  } finally {
    await admin.end({ timeout: 5 });
  }

  const client = connect(schemaName);

  const destroy = async () => {
    await client.end({ timeout: 5 });
    const cleanup = connect();
    try {
      await cleanup.unsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    } finally {
      await cleanup.end({ timeout: 5 });
    }
  };

  try {
    await assertIsolatedSchema(client, schemaName);
    for (const file of baselineFiles()) {
      await applyBaselineFile(client, file, schemaName);
    }
  } catch (error) {
    await destroy();
    throw error;
  }

  return { schemaName, db: drizzle(client, { schema }), client, destroy };
}

export async function tableNamesIn(database: TestDatabase): Promise<string[]> {
  const rows = await database.db.execute<{ table_name: string }>(
    sql`select table_name from information_schema.tables where table_schema = ${database.schemaName} order by table_name`,
  );
  return rows.map((r) => r.table_name);
}

export async function truncateAll(database: TestDatabase): Promise<void> {
  const names = await tableNamesIn(database);
  if (names.length === 0) return;
  const quoted = names.map((n) => `"${database.schemaName}"."${n}"`).join(', ');
  await database.client.unsafe(`TRUNCATE ${quoted} RESTART IDENTITY CASCADE`);
}
