import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { lessons, studentProfiles } from '../database/schema';
import { DISCOVERY_SETTINGS_GROUP } from '../settings/settings.definitions';
import { SettingsService } from '../settings/settings.service';
import { BatchAccessService, Viewer } from '../batches/access/batch-access.service';

const DEFAULT_LOW_BANDWIDTH_KB = 100;

@Injectable()
export class LowBandwidthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly settings: SettingsService,
    private readonly access: BatchAccessService,
  ) {}

  async getSetting(userId: string): Promise<{ lowBandwidth: boolean }> {
    const [row] = await this.db
      .select({ lowBandwidth: studentProfiles.lowBandwidth })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId))
      .limit(1);
    return { lowBandwidth: row?.lowBandwidth ?? false };
  }

  async setSetting(userId: string, value: boolean): Promise<{ lowBandwidth: boolean }> {
    const now = this.clock.now();
    await this.db
      .insert(studentProfiles)
      .values({
        userId,
        lowBandwidth: value,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: studentProfiles.userId,
        set: { lowBandwidth: value, updatedAt: now },
      });
    return { lowBandwidth: value };
  }

  async getLessonPlayback(lessonId: string, batchId: string, viewer: Viewer) {
    await this.access.requireForLesson(lessonId, viewer, 'READ', batchId);

    const [lesson] = await this.db
      .select({
        lessonId: lessons.lessonId,
        type: lessons.type,
        videoUrl: lessons.videoUrl,
        duration: lessons.duration,
        audioUrl: lessons.audioUrl,
        audioDuration: lessons.audioDuration,
        status: lessons.status,
      })
      .from(lessons)
      .where(eq(lessons.lessonId, lessonId))
      .limit(1);

    if (!lesson) throw new NotFoundException('Lesson not found');

    const userId = viewer.userId;
    const lowBandwidth = userId
      ? (await this.getSetting(userId)).lowBandwidth
      : false;

    const imageSuppressThresholdKb = await this.imageThresholdKb();

    if (lowBandwidth && lesson.audioUrl) {
      return {
        lessonId: lesson.lessonId,
        preferredKind: 'AUDIO' as const,
        preferredUrl: lesson.audioUrl,
        durationSeconds: lesson.audioDuration,
        lowBandwidth: true,
        imageSuppressThresholdKb,
      };
    }

    return {
      lessonId: lesson.lessonId,
      preferredKind: 'VIDEO' as const,
      preferredUrl: lesson.videoUrl,
      durationSeconds: lesson.duration,
      lowBandwidth,
      imageSuppressThresholdKb: lowBandwidth ? imageSuppressThresholdKb : null,
    };
  }

  private async imageThresholdKb(): Promise<number> {
    const group = await this.settings.getGroup(DISCOVERY_SETTINGS_GROUP);
    const raw = Number(group.values.lowBandwidthImageKilobytes);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_LOW_BANDWIDTH_KB;
  }
}
