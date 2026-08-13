import { drizzle } from "drizzle-orm/postgres-js";

// CommonJS import form. A default import emits `postgres_1.default`, which
// postgres.js does not define — see the same note in database/database.module.ts.
// This file used to live in an ESM package where the default import worked.
import postgres = require("postgres");

import * as schema from "./schema";
import type { Db } from "./tenant";

export interface DbConnection {
  db: Db;
  close: () => Promise<void>;
}

/**
 * The API is expected to sit behind PgBouncer in transaction pooling mode
 * [D-051], so `prepare` must be false — prepared statements are per-session and
 * break when the pooler reassigns connections between transactions.
 */
export function createDb(url: string, opts: { max?: number } = {}): DbConnection {
  const client = postgres(url, {
    max: opts.max ?? 10,
    prepare: false,
  });
  return {
    db: drizzle(client, { schema }),
    close: () => client.end(),
  };
}
