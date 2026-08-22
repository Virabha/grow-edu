import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { documentAnnotations } from '../database/schema';
import { BatchAccessService } from '../batches/access/batch-access.service';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { ReconcileAnnotationsDto } from './dto/reconcile-annotations.dto';

type Viewer = { userId: string; role: string };

type AnnotationRow = typeof documentAnnotations.$inferSelect;

type AnnotationResponse = Omit<AnnotationRow, 'startOffset' | 'endOffset'> & {
  startOffset: number | null;
  endOffset: number | null;
  positionReliable: boolean;
};

function toResponse(row: AnnotationRow): AnnotationResponse {
  const orphaned = row.state === 'ORPHANED';
  return {
    ...row,
    startOffset: orphaned ? null : row.startOffset,
    endOffset: orphaned ? null : row.endOffset,
    positionReliable: !orphaned,
  };
}

@Injectable()
export class AnnotationService {
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
    dto: CreateAnnotationDto,
  ) {
    const { lesson } = await this.access.requireForLesson(
      lessonId,
      viewer,
      'READ',
      batchId,
    );
    const now = this.clock.now();
    const [annotation] = await this.db
      .insert(documentAnnotations)
      .values({
        userId: viewer.userId,
        lessonId,
        batchId,
        documentVersion: lesson.documentVersion,
        page: dto.page,
        startOffset: dto.startOffset,
        endOffset: dto.endOffset,
        quotedText: dto.quotedText,
        note: dto.note ?? null,
        colour: dto.colour ?? null,
        state: 'ANCHORED',
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return toResponse(annotation);
  }

  async list(batchId: string, lessonId: string, viewer: Viewer) {
    const { lesson } = await this.access.requireForLesson(
      lessonId,
      viewer,
      'READ',
      batchId,
    );

    const staleRows = await this.db
      .select()
      .from(documentAnnotations)
      .where(
        and(
          eq(documentAnnotations.userId, viewer.userId),
          eq(documentAnnotations.lessonId, lessonId),
          eq(documentAnnotations.batchId, batchId),
          eq(documentAnnotations.isDeleted, false),
          eq(documentAnnotations.state, 'ANCHORED'),
        ),
      );

    const now = this.clock.now();
    const staleIds = staleRows
      .filter((r) => r.documentVersion < lesson.documentVersion)
      .map((r) => r.annotationId);

    if (staleIds.length > 0) {
      for (const annotationId of staleIds) {
        await this.db
          .update(documentAnnotations)
          .set({ state: 'ORPHANED', orphanedAt: now, updatedAt: now })
          .where(eq(documentAnnotations.annotationId, annotationId));
      }
    }

    const rows = await this.db
      .select()
      .from(documentAnnotations)
      .where(
        and(
          eq(documentAnnotations.userId, viewer.userId),
          eq(documentAnnotations.lessonId, lessonId),
          eq(documentAnnotations.batchId, batchId),
          eq(documentAnnotations.isDeleted, false),
        ),
      );

    return rows.map(toResponse);
  }

  async reconcile(
    batchId: string,
    lessonId: string,
    viewer: Viewer,
    dto: ReconcileAnnotationsDto,
  ) {
    const { lesson } = await this.access.requireForLesson(
      lessonId,
      viewer,
      'READ',
      batchId,
    );

    const orphaned = await this.db
      .select()
      .from(documentAnnotations)
      .where(
        and(
          eq(documentAnnotations.userId, viewer.userId),
          eq(documentAnnotations.lessonId, lessonId),
          eq(documentAnnotations.batchId, batchId),
          eq(documentAnnotations.isDeleted, false),
          eq(documentAnnotations.state, 'ORPHANED'),
        ),
      );

    const now = this.clock.now();

    for (const row of orphaned) {
      const idx = dto.documentText.indexOf(row.quotedText);
      if (idx !== -1) {
        await this.db
          .update(documentAnnotations)
          .set({
            state: 'ANCHORED',
            startOffset: idx,
            endOffset: idx + row.quotedText.length,
            documentVersion: lesson.documentVersion,
            orphanedAt: null,
            updatedAt: now,
          })
          .where(eq(documentAnnotations.annotationId, row.annotationId));
      }
    }

    return this.list(batchId, lessonId, viewer);
  }

  async remove(
    batchId: string,
    lessonId: string,
    annotationId: string,
    viewer: Viewer,
  ) {
    await this.access.requireForLesson(lessonId, viewer, 'READ', batchId);
    const [annotation] = await this.db
      .select()
      .from(documentAnnotations)
      .where(
        and(
          eq(documentAnnotations.annotationId, annotationId),
          eq(documentAnnotations.lessonId, lessonId),
          eq(documentAnnotations.batchId, batchId),
          eq(documentAnnotations.isDeleted, false),
        ),
      )
      .limit(1);
    if (!annotation) throw new NotFoundException('Annotation not found');
    if (annotation.userId !== viewer.userId) {
      throw new ForbiddenException('Not your annotation');
    }
    await this.db
      .update(documentAnnotations)
      .set({ isDeleted: true, updatedAt: this.clock.now() })
      .where(eq(documentAnnotations.annotationId, annotationId));
  }

}
