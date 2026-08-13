import type { Config } from "drizzle-kit";

/**
 * Separate from drizzle.config.ts on purpose.
 *
 * The existing application schema (src/database/schema.ts, 45 tables) and the
 * new multi-tenant schema (src/tenancy/schema.ts) are migrated independently
 * while the two are being reconciled — they both declare a `users` table, so
 * generating them into one migration folder would collide.
 */
export default {
  schema: "./src/tenancy/schema.ts",
  out: "./migrations-tenancy",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env["DATABASE_URL"] ?? "",
  },
} satisfies Config;
