import type { Config } from 'drizzle-kit';

export default {
  schema: './src/database/schema/index.ts',
  out: './drizzle-baseline',
  driver: 'pg',
  dbCredentials: { connectionString: process.env.DATABASE_URL || '' },
} satisfies Config;
