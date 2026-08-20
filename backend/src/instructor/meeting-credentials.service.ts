import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';
import { UpsertZoomCredentialsDto } from './dto/upsert-zoom-credentials.dto';
import { UpsertJitsiCredentialsDto } from './dto/upsert-jitsi-credentials.dto';

export interface MeetingCredentialsSafeView {
  zoomClientId: string | null;
  zoomSecretConfigured: boolean;
  jitsiAppId: string | null;
  jitsiSecretConfigured: boolean;
}

@Injectable()
export class MeetingCredentialsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getMeetingCredentials(userId: string): Promise<MeetingCredentialsSafeView> {
    const rows = await this.db
      .select({
        zoomClientId: schema.instructorMeetingCredentials.zoomClientId,
        zoomClientSecret: schema.instructorMeetingCredentials.zoomClientSecret,
        jitsiAppId: schema.instructorMeetingCredentials.jitsiAppId,
        jitsiSecret: schema.instructorMeetingCredentials.jitsiSecret,
      })
      .from(schema.instructorMeetingCredentials)
      .where(eq(schema.instructorMeetingCredentials.userId, userId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return { zoomClientId: null, zoomSecretConfigured: false, jitsiAppId: null, jitsiSecretConfigured: false };
    }
    return {
      zoomClientId: row.zoomClientId,
      zoomSecretConfigured: row.zoomClientSecret !== null,
      jitsiAppId: row.jitsiAppId,
      jitsiSecretConfigured: row.jitsiSecret !== null,
    };
  }

  async upsertZoomCredentials(userId: string, dto: UpsertZoomCredentialsDto): Promise<MeetingCredentialsSafeView> {
    const newSecret = dto.clientSecret?.trim();
    if (newSecret) {
      await this.db
        .insert(schema.instructorMeetingCredentials)
        .values({ userId, zoomClientId: dto.clientId, zoomClientSecret: newSecret })
        .onConflictDoUpdate({
          target: [
            schema.instructorMeetingCredentials.organizationId,
            schema.instructorMeetingCredentials.userId,
          ],
          set: { zoomClientId: dto.clientId, zoomClientSecret: newSecret, updatedAt: new Date() },
        });
    } else {
      await this.db
        .insert(schema.instructorMeetingCredentials)
        .values({ userId, zoomClientId: dto.clientId, zoomClientSecret: null })
        .onConflictDoUpdate({
          target: [
            schema.instructorMeetingCredentials.organizationId,
            schema.instructorMeetingCredentials.userId,
          ],
          set: { zoomClientId: dto.clientId, updatedAt: new Date() },
        });
    }
    return this.getMeetingCredentials(userId);
  }

  async clearZoomCredentials(userId: string): Promise<MeetingCredentialsSafeView> {
    await this.db
      .update(schema.instructorMeetingCredentials)
      .set({ zoomClientId: null, zoomClientSecret: null, updatedAt: new Date() })
      .where(eq(schema.instructorMeetingCredentials.userId, userId));
    return this.getMeetingCredentials(userId);
  }

  async upsertJitsiCredentials(userId: string, dto: UpsertJitsiCredentialsDto): Promise<MeetingCredentialsSafeView> {
    const newSecret = dto.appKey?.trim();
    if (newSecret) {
      await this.db
        .insert(schema.instructorMeetingCredentials)
        .values({ userId, jitsiAppId: dto.appId, jitsiSecret: newSecret })
        .onConflictDoUpdate({
          target: [
            schema.instructorMeetingCredentials.organizationId,
            schema.instructorMeetingCredentials.userId,
          ],
          set: { jitsiAppId: dto.appId, jitsiSecret: newSecret, updatedAt: new Date() },
        });
    } else {
      await this.db
        .insert(schema.instructorMeetingCredentials)
        .values({ userId, jitsiAppId: dto.appId, jitsiSecret: null })
        .onConflictDoUpdate({
          target: [
            schema.instructorMeetingCredentials.organizationId,
            schema.instructorMeetingCredentials.userId,
          ],
          set: { jitsiAppId: dto.appId, updatedAt: new Date() },
        });
    }
    return this.getMeetingCredentials(userId);
  }

  async clearJitsiCredentials(userId: string): Promise<MeetingCredentialsSafeView> {
    await this.db
      .update(schema.instructorMeetingCredentials)
      .set({ jitsiAppId: null, jitsiSecret: null, updatedAt: new Date() })
      .where(eq(schema.instructorMeetingCredentials.userId, userId));
    return this.getMeetingCredentials(userId);
  }
}
