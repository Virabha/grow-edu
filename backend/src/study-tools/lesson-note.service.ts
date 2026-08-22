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
import { lessonNotes } from '../database/schema';
import { BatchAccessService } from '../batches/access/batch-access.service';
import { UpsertLessonNoteDto } from './dto/upsert-lesson-note.dto';

type Viewer = { userId: string; role: string };

@Injectable()
export class LessonNoteService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly access: BatchAccessService,
  ) {}

  async upsert(
    batchId: string,
    lessonId: string,
    viewer: Viewer,
    dto: UpsertLessonNoteDto,
  ) {
    await this.access.requireForLesson(lessonId, viewer, 'READ', batchId);
    const now = this.clock.now();
    const [note] = await this.db
      .insert(lessonNotes)
      .values({
        userId: viewer.userId,
        lessonId,
        batchId,
        body: dto.body,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [lessonNotes.userId, lessonNotes.lessonId],
        set: {
          body: dto.body,
          isDeleted: false,
          updatedAt: now,
        },
      })
      .returning();
    return note;
  }

  async get(batchId: string, lessonId: string, viewer: Viewer) {
    await this.access.requireForLesson(lessonId, viewer, 'READ', batchId);
    const [note] = await this.db
      .select()
      .from(lessonNotes)
      .where(
        and(
          eq(lessonNotes.userId, viewer.userId),
          eq(lessonNotes.lessonId, lessonId),
          eq(lessonNotes.batchId, batchId),
          eq(lessonNotes.isDeleted, false),
        ),
      )
      .limit(1);
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async remove(batchId: string, lessonId: string, viewer: Viewer) {
    await this.access.requireForLesson(lessonId, viewer, 'READ', batchId);
    const [note] = await this.db
      .select()
      .from(lessonNotes)
      .where(
        and(
          eq(lessonNotes.userId, viewer.userId),
          eq(lessonNotes.lessonId, lessonId),
          eq(lessonNotes.batchId, batchId),
          eq(lessonNotes.isDeleted, false),
        ),
      )
      .limit(1);
    if (!note) throw new NotFoundException('Note not found');
    await this.db
      .update(lessonNotes)
      .set({ isDeleted: true, updatedAt: this.clock.now() })
      .where(eq(lessonNotes.noteId, note.noteId));
  }

  async exportForBatch(batchId: string, viewer: Viewer) {
    await this.access.require(batchId, viewer, 'READ');
    const notes = await this.db
      .select()
      .from(lessonNotes)
      .where(
        and(
          eq(lessonNotes.userId, viewer.userId),
          eq(lessonNotes.batchId, batchId),
          eq(lessonNotes.isDeleted, false),
        ),
      )
      .orderBy(desc(lessonNotes.updatedAt));
    return { batchId, userId: viewer.userId, notes };
  }
}
