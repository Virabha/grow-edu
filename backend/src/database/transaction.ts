import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import * as schema from './schema';

export type AppDatabase = PostgresJsDatabase<typeof schema>;

export type Transaction = Parameters<
  Parameters<AppDatabase['transaction']>[0]
>[0];

export type Queryable = AppDatabase | Transaction;
