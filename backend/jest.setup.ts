/**
 * Test environment defaults.
 *
 * `AppConfigModule` validates configuration at import time and throws when
 * DATABASE_URL or JWT_SECRET are missing, so any spec that transitively
 * imports `src/config` fails to load without them. That made the suite pass
 * only on machines with a local `.env` and fail in CI, where there is none.
 *
 * These are placeholders for module construction only. Anything that talks to
 * a real database sets its own DATABASE_URL (see the tenancy CI job), and
 * existing values are never overwritten.
 */
const TEST_DEFAULTS: Record<string, string> = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://test:test@localhost:5432/test",
  JWT_SECRET: "test-jwt-secret-not-used-to-sign-anything-real",
  EMAIL_PROVIDER: "sendgrid",
  SENDGRID_API_KEY: "SG.test-key",
  EMAIL_FROM_ADDRESS: "test@example.com",
};

for (const [key, value] of Object.entries(TEST_DEFAULTS)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
