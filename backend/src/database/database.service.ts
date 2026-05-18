import { Inject, Injectable } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { DATABASE_CONNECTION } from './database.module';

@Injectable()
export class DatabaseService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  getDb(): PostgresJsDatabase<typeof schema> {
    return this.db;
  }
}

