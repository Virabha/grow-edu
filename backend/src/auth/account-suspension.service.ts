import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { TtlFlagCache } from './ttl-flag-cache';

@Injectable()
export class AccountSuspensionService {
  private readonly cache = new TtlFlagCache();

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async isSuspended(userId: string, now: number): Promise<boolean> {
    return this.cache.read(userId, now, async () => {
      const [row] = await this.db
        .select({ userId: schema.users.userId })
        .from(schema.users)
        .where(
          and(
            eq(schema.users.userId, userId),
            isNotNull(schema.users.suspendedAt),
          ),
        )
        .limit(1);

      return row !== undefined;
    });
  }

  forget(userId: string): void {
    this.cache.forget(userId);
  }
}
