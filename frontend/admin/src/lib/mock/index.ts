export { mockAdapter } from "./adapter";
export { db, resetDb, write, collection, RESOURCES } from "./db";
export type { MockDb, Row } from "./db";
export * from "./settings";

/**
 * Demo mode is OPT-IN.
 *
 * The adapter replaces the whole API surface and lets any password sign in, so
 * it must never default to on — a deploy that forgets the flag would ship an
 * app running on fake data with auth bypassed.
 */
export const MOCKS_ENABLED = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
