/**
 * Organisation context.
 *
 * Every tenant-scoped query must run inside `withOrgContext`. It opens a
 * transaction, pins the organisation for the life of that transaction, and lets
 * PostgreSQL Row-Level Security do the filtering [D-044] [D-045].
 *
 * Why transaction-scoped, and why this is not a style preference:
 *
 *   At 200k-500k concurrent users [D-051] the API must sit behind PgBouncer in
 *   TRANSACTION pooling mode, or Postgres runs out of connections. Transaction
 *   pooling hands the same backend connection to unrelated requests between
 *   transactions. A session-level `SET app.current_org` would therefore survive
 *   into another tenant's request and leak their rows — the precise catastrophe
 *   RLS exists to prevent, arriving through the back door.
 *
 *   `set_config(..., is_local => true)` is discarded at COMMIT or ROLLBACK, so
 *   it is safe under transaction pooling. Do not "simplify" it to a plain SET.
 *
 * Note also that `SET LOCAL x = $1` cannot take a bind parameter in Postgres.
 * `set_config()` can, which keeps the organisation id parameterised rather than
 * interpolated into SQL.
 */
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { ORG_CONTEXT_SETTING } from "./schema";
import type * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The unprivileged role every tenant-scoped query runs as. It has no BYPASSRLS,
 * which is the entire point — see migrations/manual/0002_app_role.sql.
 */
export const APP_ROLE = "groedu_app";

export class OrgContextError extends Error {}

/**
 * Run `fn` with every query scoped to one organisation.
 *
 * @param organizationId resolved from the request host, never from a request
 *        body. A client-supplied organisation id is not trusted [D-045].
 */
export async function withOrgContext<T>(
  db: Db,
  organizationId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  // Defence in depth: the value reaches Postgres as a parameter, but a
  // malformed id should fail loudly here rather than silently scope to nothing.
  if (!UUID_RE.test(organizationId)) {
    throw new OrgContextError(`invalid organization id: ${organizationId}`);
  }

  return db.transaction(async (tx) => {
    // Drop the BYPASSRLS privilege for the life of this transaction.
    //
    // Managed Postgres hands you a role with BYPASSRLS (Neon's neondb_owner,
    // RDS master, Supabase postgres). That attribute overrides ENABLE and even
    // FORCE ROW LEVEL SECURITY, so without this line every policy is silently
    // ignored and isolation does not exist. Verified: configuration correct,
    // isolation absent, until the session ran as groedu_app.
    //
    // SET LOCAL, like set_config below, dies with the transaction — safe under
    // PgBouncer transaction pooling.
    await tx.execute(sql`set local role ${sql.raw(APP_ROLE)}`);
    await tx.execute(
      sql`select set_config(${ORG_CONTEXT_SETTING}, ${organizationId}, true)`,
    );
    return fn(tx);
  });
}

/**
 * Escape hatch for the platform console [D-013].
 *
 * Runs with no organisation pinned. RLS policies are written so that an unset
 * `app.current_org` matches nothing, so this is only useful when connected as
 * the platform role that bypasses RLS. Every call site must write an audit
 * record — impersonation and cross-tenant reads are exactly what [D-028] and
 * [D-030] require to be traceable.
 */
export async function withPlatformContext<T>(
  db: Db,
  audit: { actorUserId: string; reason: string },
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (!audit.reason.trim()) {
    throw new OrgContextError("platform context requires a stated reason");
  }
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.actor', ${audit.actorUserId}, true)`,
    );
    return fn(tx);
  });
}
