import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  lessonBookmarks,
  lessons,
  subjectLessons,
  batchSubjects,
} from '../database/schema';
import { BatchAccessService } from '../batches/access/batch-access.service';

type Viewer = { userId: string; role: string };

@Injectable()
export class LessonBookmarkService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly access: BatchAccessService,
  ) {}

  async upsert(batchId: string, lessonId: string, viewer: Viewer) {
    await this.access.requireForLesson(lessonId, viewer, 'READ', batchId);
    const now = this.clock.now();
    const [inserted] = await this.db
      .insert(lessonBookmarks)
      .values({
        userId: viewer.userId,
        lessonId,
        batchId,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning();
    if (inserted) return inserted;
    const [existing] = await this.db
      .select()
      .from(lessonBookmarks)
      .where(
        and(
          eq(lessonBookmarks.userId, viewer.userId),
          eq(lessonBookmarks.lessonId, lessonId),
        ),
      )
      .limit(1);
    return existing;
  }

  async listForBatch(batchId: string, viewer: Viewer) {
    await this.access.require(batchId, viewer, 'READ');
    return this.db
      .select({
        bookmarkId: lessonBookmarks.bookmarkId,
        lessonId: lessonBookmarks.lessonId,
        batchId: lessonBookmarks.batchId,
        createdAt: lessonBookmarks.createdAt,
        lessonTitle: lessons.title,
        lessonType: lessons.type,
        lessonStatus: lessons.status,
      })
      .from(lessonBookmarks)
      .innerJoin(lessons, eq(lessons.lessonId, lessonBookmarks.lessonId))
      .innerJoin(
        subjectLessons,
        and(
          eq(subjectLessons.lessonId, lessonBookmarks.lessonId),
          eq(subjectLessons.isDeleted, false),
        ),
      )
      .innerJoin(
        batchSubjects,
        and(
          eq(batchSubjects.subjectId, subjectLessons.subjectId),
          eq(batchSubjects.batchId, batchId),
          eq(batchSubjects.isDeleted, false),
        ),
      )
      .where(
        and(
          eq(lessonBookmarks.batchId, batchId),
          eq(lessonBookmarks.userId, viewer.userId),
          eq(lessons.isDeleted, false),
        ),
      )
      .orderBy(desc(lessonBookmarks.createdAt));
  }

  async remove(batchId: string, lessonId: string, viewer: Viewer) {
    const deleted = await this.db
      .delete(lessonBookmarks)
      .where(
        and(
          eq(lessonBookmarks.userId, viewer.userId),
          eq(lessonBookmarks.lessonId, lessonId),
          eq(lessonBookmarks.batchId, batchId),
        ),
      )
      .returning();
    if (deleted.length === 0) throw new NotFoundException('Bookmark not found');
  }
}
