export { mockAdapter } from "./adapter";
export { db, resetDb, write, staticData, findCourse } from "./db";
export type { MockDb } from "./db";
export * from "./seed";

/**
 * Demo mode is OPT-IN.
 *
 * The adapter replaces the entire API surface and lets any password sign in, so
 * it must never switch itself on by default — a deploy that forgets the flag
 * would ship an app running on fake data with auth bypassed. The demo enables
 * it explicitly via NEXT_PUBLIC_USE_MOCKS=true in .env.local.
 */
export const MOCKS_ENABLED = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
