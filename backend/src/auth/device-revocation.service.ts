import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { TtlFlagCache } from './ttl-flag-cache';

@Injectable()
export class DeviceRevocationService {
  private readonly cache = new TtlFlagCache();

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async isRevoked(deviceId: string, now: number): Promise<boolean> {
    return this.cache.read(deviceId, now, async () => {
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

      return row !== undefined;
    });
  }

  forget(deviceId: string): void {
    this.cache.forget(deviceId);
  }
}
