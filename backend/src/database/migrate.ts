import 'dotenv/config';
import * as path from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

// Use require for postgres to handle CommonJS/ESM compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
const postgres = require('postgres');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  // For migrations, keep a single connection to avoid locking issues
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  const migrationsFolder = path.join(process.cwd(), 'drizzle');
  await migrate(db, { migrationsFolder });

  await client.end({ timeout: 5 });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Migration failed:', err);
  process.exit(1);
});

