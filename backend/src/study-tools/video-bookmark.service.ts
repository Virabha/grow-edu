import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { lessonVideoBookmarks } from '../database/schema';
import { BatchAccessService } from '../batches/access/batch-access.service';
import { CreateVideoBookmarkDto } from './dto/create-video-bookmark.dto';

type Viewer = { userId: string; role: string };

@Injectable()
export class VideoBookmarkService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly access: BatchAccessService,
  ) {}

  async create(
    batchId: string,
    lessonId: string,
    viewer: Viewer,
    dto: CreateVideoBookmarkDto,
  ) {
    await this.access.requireForLesson(lessonId, viewer, 'READ', batchId);
    const now = this.clock.now();
    const [bookmark] = await this.db
      .insert(lessonVideoBookmarks)
      .values({
        userId: viewer.userId,
        lessonId,
        batchId,
        timestampSeconds: dto.timestampSeconds,
        note: dto.note ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return bookmark;
  }

  async listForLesson(batchId: string, lessonId: string, viewer: Viewer) {
    await this.access.requireForLesson(lessonId, viewer, 'READ', batchId);
    return this.db
      .select()
      .from(lessonVideoBookmarks)
      .where(
        and(
          eq(lessonVideoBookmarks.lessonId, lessonId),
          eq(lessonVideoBookmarks.batchId, batchId),
          eq(lessonVideoBookmarks.userId, viewer.userId),
          eq(lessonVideoBookmarks.isDeleted, false),
        ),
      )
      .orderBy(asc(lessonVideoBookmarks.timestampSeconds));
  }

  async listForBatch(batchId: string, viewer: Viewer) {
    await this.access.require(batchId, viewer, 'READ');
    return this.db
      .select()
      .from(lessonVideoBookmarks)
      .where(
        and(
          eq(lessonVideoBookmarks.batchId, batchId),
          eq(lessonVideoBookmarks.userId, viewer.userId),
          eq(lessonVideoBookmarks.isDeleted, false),
        ),
      )
      .orderBy(desc(lessonVideoBookmarks.createdAt));
  }

  async remove(batchId: string, bookmarkId: string, viewer: Viewer) {
    const [bookmark] = await this.db
      .select()
      .from(lessonVideoBookmarks)
      .where(
        and(
          eq(lessonVideoBookmarks.bookmarkId, bookmarkId),
          eq(lessonVideoBookmarks.batchId, batchId),
          eq(lessonVideoBookmarks.isDeleted, false),
        ),
      )
      .limit(1);
    if (!bookmark) throw new NotFoundException('Bookmark not found');
    if (bookmark.userId !== viewer.userId) {
      throw new ForbiddenException('Not your bookmark');
    }
    await this.db
      .update(lessonVideoBookmarks)
      .set({ isDeleted: true, updatedAt: this.clock.now() })
      .where(eq(lessonVideoBookmarks.bookmarkId, bookmarkId));
  }
}
