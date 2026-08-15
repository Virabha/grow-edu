import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  revoked: boolean;
  checkedAt: number;
}

@Injectable()
export class DeviceRevocationService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async isRevoked(deviceId: string, now: number): Promise<boolean> {
    const cached = this.cache.get(deviceId);
    if (cached && now - cached.checkedAt < CACHE_TTL_MS) {
      return cached.revoked;
    }

    const [row] = await this.db
      .select({ deviceId: schema.userDevices.deviceId })
      .from(schema.userDevices)
      .where(
        and(
          eq(schema.userDevices.deviceId, deviceId),
          isNotNull(schema.userDevices.revokedAt),
        ),
      )
      .limit(1);

    const revoked = row !== undefined;
    this.cache.set(deviceId, { revoked, checkedAt: now });
    this.prune(now);
    return revoked;
  }

  forget(deviceId: string): void {
    this.cache.delete(deviceId);
  }

  private prune(now: number): void {
    for (const [key, entry] of this.cache) {
      if (now - entry.checkedAt >= CACHE_TTL_MS) {
        this.cache.delete(key);
      }
    }
  }
}
