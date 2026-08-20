import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  suspended: boolean;
  checkedAt: number;
}

@Injectable()
export class AccountSuspensionService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async isSuspended(userId: string, now: number): Promise<boolean> {
    const cached = this.cache.get(userId);
    if (cached && now - cached.checkedAt < CACHE_TTL_MS) {
      return cached.suspended;
    }

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

    const suspended = row !== undefined;
    this.cache.set(userId, { suspended, checkedAt: now });
    this.prune(now);
    return suspended;
  }

  forget(userId: string): void {
    this.cache.delete(userId);
  }

  private prune(now: number): void {
    for (const [key, entry] of this.cache) {
      if (now - entry.checkedAt >= CACHE_TTL_MS) {
        this.cache.delete(key);
      }
    }
  }
}
