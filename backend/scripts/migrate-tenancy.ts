/**
 * Applies schema migrations, then the hand-written tenancy SQL.
 *
 *   DATABASE_URL=postgres://... pnpm db:migrate:tenancy
 *
 * Two stages, deliberately separate:
 *
 *   1. migrations/          drizzle-kit generated, tracked by drizzle's journal
 *   2. migrations/manual/   RLS policies, partial unique indexes, check
 *                           constraints — none of which drizzle 0.29 can
 *                           express, and all of which are load-bearing.
 *
 * Stage 2 is idempotent and tracked in `_manual_migrations` so it is safe to
 * re-run. If stage 2 is ever skipped the schema still "works" — it just has no
 * tenant isolation at all, which is the failure mode this file exists to make
 * impossible to reach quietly.
 */
import "dotenv/config";

import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { sql } from "drizzle-orm";

import { createDb } from "../src/tenancy/client";

const here = __dirname;
// Deliberately NOT backend/drizzle — that folder holds the existing
// application schema's migrations. The tenancy schema is migrated separately
// while the two are reconciled; both declare a `users` table.
const MIGRATIONS = join(here, "..", "migrations-tenancy");
const MANUAL = join(MIGRATIONS, "manual");

async function main(): Promise<void> {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const { db, close } = createDb(url, { max: 1 });

  try {
    // Stage 1 — generated schema.
    if (existsSync(join(MIGRATIONS, "meta", "_journal.json"))) {
      await migrate(db, { migrationsFolder: MIGRATIONS });
      console.log("schema migrations applied");
    } else {
      console.warn(
        "no drizzle journal found — run `pnpm db:generate:tenancy` first",
      );
    }

    // Stage 2 — hand-written tenancy SQL.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS _manual_migrations (
        name        text PRIMARY KEY,
        applied_at  timestamptz NOT NULL DEFAULT now()
      )
    `);

    const files = (await readdir(MANUAL))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const done = await db.execute(
        sql`select 1 from _manual_migrations where name = ${file}`,
      );
      if (done.length > 0) {
        console.log(`skip  ${file} (already applied)`);
        continue;
      }
      const body = await readFile(join(MANUAL, file), "utf8");
      await db.execute(sql.raw(body));
      await db.execute(
        sql`insert into _manual_migrations (name) values (${file})`,
      );
      console.log(`apply ${file}`);
    }

    // Fail loudly if isolation did not actually land.
    //
    // `organizations` is excluded deliberately: its `organization_id` column is
    // its own primary key, not a tenant scope. A row IS a tenant, so scoping the
    // table by itself is circular — see migrations/manual/0001_tenancy_rls.sql.
    // This is an allowlist of one rather than a filter on column role, because
    // any future table needing an exemption should have to justify itself here.
    const unprotected = await db.execute(sql`
      select c.relname
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        join information_schema.columns col
          on col.table_name = c.relname
         and col.column_name = 'organization_id'
       where n.nspname = 'public'
         and c.relkind = 'r'
         and c.relrowsecurity = false
         and c.relname <> 'organizations'
    `);

    if (unprotected.length > 0) {
      const names = unprotected.map((r) => r["relname"]).join(", ");
      throw new Error(
        `tables carry organization_id but have no row-level security: ${names}. ` +
          `Call apply_tenant_rls() for each — see migrations/manual/0001_tenancy_rls.sql`,
      );
    }

    console.log("tenancy verified: every organization_id table has RLS enabled");
  } finally {
    await close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
