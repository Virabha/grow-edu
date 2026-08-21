import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../common/clock';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import {
  lessonTranscriptSegments,
  lessonTranscripts,
  lessons,
} from '../database/schema';
import { JOB_QUEUE, JobQueue, registerAndRepeat } from '../jobs/job-queue';
import { TRANSCRIPTION_PROVIDER, TranscriptionProvider } from './transcription-provider';
import { BatchAccessService, Viewer } from '../batches/access/batch-access.service';

export const TRANSCRIPT_JOB = 'media.transcript.poll';
const POLL_INTERVAL_MS = 30_000;

@Injectable()
export class TranscriptService implements OnModuleInit {
  private readonly logger = new Logger(TranscriptService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    @Inject(TRANSCRIPTION_PROVIDER) private readonly provider: TranscriptionProvider,
    private readonly access: BatchAccessService,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      TRANSCRIPT_JOB,
      async () => {
        await this.processPending();
      },
      POLL_INTERVAL_MS,
      (err) => this.logger.error('Transcript poll failed to schedule', err),
    );
  }

  async request(
    lessonId: string,
    batchId: string,
    viewer: Viewer,
    language = 'en',
  ) {
    await this.access.require(batchId, viewer, 'MANAGE');

    const [lesson] = await this.db
      .select({ lessonId: lessons.lessonId, videoUrl: lessons.videoUrl })
      .from(lessons)
      .where(eq(lessons.lessonId, lessonId))
      .limit(1);
    if (!lesson) throw new NotFoundException('Lesson not found');

    const [existing] = await this.db
      .select({
        transcriptId: lessonTranscripts.transcriptId,
        status: lessonTranscripts.status,
      })
      .from(lessonTranscripts)
      .where(eq(lessonTranscripts.lessonId, lessonId))
      .limit(1);

    if (existing && existing.status !== 'FAILED') {
      throw new ConflictException(
        'Transcription has already been requested for this lesson',
      );
    }

    const now = this.clock.now();

    if (existing) {
      await this.db
        .update(lessonTranscripts)
        .set({
          status: 'PENDING',
          errorMessage: null,
          requestedAt: now,
          updatedAt: now,
        })
        .where(eq(lessonTranscripts.transcriptId, existing.transcriptId));

      const [row] = await this.db
        .select()
        .from(lessonTranscripts)
        .where(eq(lessonTranscripts.transcriptId, existing.transcriptId))
        .limit(1);
      return row;
    }

    const [row] = await this.db
      .insert(lessonTranscripts)
      .values({
        lessonId,
        language,
        sourceKey: lesson.videoUrl ?? lessonId,
        status: 'PENDING',
        requestedAt: now,
        updatedAt: now,
      })
      .returning();

    return row;
  }

  async retry(lessonId: string, batchId: string, viewer: Viewer) {
    await this.access.require(batchId, viewer, 'MANAGE');

    const [existing] = await this.db
      .select()
      .from(lessonTranscripts)
      .where(eq(lessonTranscripts.lessonId, lessonId))
      .limit(1);

    if (!existing) throw new NotFoundException('No transcript found for this lesson');
    if (existing.status !== 'FAILED') {
      throw new ConflictException('Transcript can only be retried when status is FAILED');
    }

    const now = this.clock.now();
    await this.db
      .update(lessonTranscripts)
      .set({ status: 'PENDING', errorMessage: null, requestedAt: now, updatedAt: now })
      .where(eq(lessonTranscripts.transcriptId, existing.transcriptId));

    const [row] = await this.db
      .select()
      .from(lessonTranscripts)
      .where(eq(lessonTranscripts.transcriptId, existing.transcriptId))
      .limit(1);
    return row;
  }

  async getTranscript(lessonId: string, batchId: string, viewer: Viewer) {
    await this.access.requireForLesson(lessonId, viewer, 'READ', batchId);

    const [transcript] = await this.db
      .select()
      .from(lessonTranscripts)
      .where(eq(lessonTranscripts.lessonId, lessonId))
      .limit(1);

    if (!transcript) {
      return { available: false, transcript: null, segments: [] };
    }

    const segments =
      transcript.status === 'READY'
        ? await this.db
            .select()
            .from(lessonTranscriptSegments)
            .where(eq(lessonTranscriptSegments.transcriptId, transcript.transcriptId))
            .orderBy(asc(lessonTranscriptSegments.ordinal))
        : [];

    return { available: transcript.status === 'READY', transcript, segments };
  }

  async search(lessonId: string, batchId: string, viewer: Viewer, query: string) {
    await this.access.requireForLesson(lessonId, viewer, 'READ', batchId);

    if (!query.trim()) return { matches: [] };

    const [transcript] = await this.db
      .select({ transcriptId: lessonTranscripts.transcriptId })
      .from(lessonTranscripts)
      .where(
        and(
          eq(lessonTranscripts.lessonId, lessonId),
          eq(lessonTranscripts.status, 'READY'),
        ),
      )
      .limit(1);

    if (!transcript) return { matches: [] };

    const singleMatches = await this.db
      .select({
        segmentId: lessonTranscriptSegments.segmentId,
        ordinal: lessonTranscriptSegments.ordinal,
        startSeconds: lessonTranscriptSegments.startSeconds,
        endSeconds: lessonTranscriptSegments.endSeconds,
        body: lessonTranscriptSegments.body,
      })
      .from(lessonTranscriptSegments)
      .where(
        and(
          eq(lessonTranscriptSegments.lessonId, lessonId),
          sql`to_tsvector('english', ${lessonTranscriptSegments.body}) @@ plainto_tsquery('english', ${query})`,
        ),
      )
      .orderBy(asc(lessonTranscriptSegments.startSeconds));

    const boundaryRows = await this.db.execute<{
      seg1_id: string;
      seg2_id: string;
      start1: number;
      end1: number;
      body1: string;
      ord1: number;
      start2: number;
      end2: number;
      body2: string;
      ord2: number;
    }>(
      sql`
        SELECT
          s1.segment_id AS seg1_id,
          s2.segment_id AS seg2_id,
          s1.start_seconds AS start1,
          s1.end_seconds AS end1,
          s1.body AS body1,
          s1.ordinal AS ord1,
          s2.start_seconds AS start2,
          s2.end_seconds AS end2,
          s2.body AS body2,
          s2.ordinal AS ord2
        FROM lesson_transcript_segments s1
        JOIN lesson_transcript_segments s2
          ON s1.transcript_id = s2.transcript_id
          AND s2.ordinal = s1.ordinal + 1
        WHERE s1.lesson_id = ${lessonId}
          AND to_tsvector('english', s1.body || ' ' || s2.body) @@ plainto_tsquery('english', ${query})
      `,
    );

    const hitIds = new Set(singleMatches.map((m) => m.segmentId));
    type MatchResult = {
      segmentId: string;
      ordinal: number;
      startSeconds: number;
      endSeconds: number;
      body: string;
    };
    const extra: MatchResult[] = [];
    for (const row of boundaryRows) {
      if (!hitIds.has(row.seg1_id)) {
        extra.push({
          segmentId: row.seg1_id,
          ordinal: row.ord1,
          startSeconds: row.start1,
          endSeconds: row.end1,
          body: row.body1,
        });
        hitIds.add(row.seg1_id);
      }
      if (!hitIds.has(row.seg2_id)) {
        extra.push({
          segmentId: row.seg2_id,
          ordinal: row.ord2,
          startSeconds: row.start2,
          endSeconds: row.end2,
          body: row.body2,
        });
        hitIds.add(row.seg2_id);
      }
    }

    const allMatches: MatchResult[] = [...singleMatches, ...extra];
    allMatches.sort((a, b) => a.startSeconds - b.startSeconds);

    return { matches: allMatches };
  }

  private async processPending(): Promise<void> {
    const pending = await this.db
      .select()
      .from(lessonTranscripts)
      .where(inArray(lessonTranscripts.status, ['PENDING']))
      .limit(10);

    for (const transcript of pending) {
      await this.runTranscription(transcript.transcriptId, transcript.lessonId);
    }
  }

  private async runTranscription(transcriptId: string, lessonId: string): Promise<void> {
    const [transcript] = await this.db
      .select()
      .from(lessonTranscripts)
      .where(eq(lessonTranscripts.transcriptId, transcriptId))
      .limit(1);

    if (!transcript || transcript.status !== 'PENDING') return;

    const now = this.clock.now();
    await this.db
      .update(lessonTranscripts)
      .set({ status: 'PROCESSING', updatedAt: now })
      .where(eq(lessonTranscripts.transcriptId, transcriptId));

    try {
      const segments = await this.provider.transcribe(
        transcript.sourceKey ?? lessonId,
        transcript.language,
      );

      await this.db
        .delete(lessonTranscriptSegments)
        .where(eq(lessonTranscriptSegments.transcriptId, transcriptId));

      if (segments.length > 0) {
        await this.db.insert(lessonTranscriptSegments).values(
          segments.map((seg) => ({
            transcriptId,
            lessonId,
            ordinal: seg.ordinal,
            startSeconds: seg.startSeconds,
            endSeconds: seg.endSeconds,
            body: seg.body,
            createdAt: now,
          })),
        );
      }

      const completedAt = this.clock.now();
      await this.db
        .update(lessonTranscripts)
        .set({ status: 'READY', completedAt, updatedAt: completedAt })
        .where(eq(lessonTranscripts.transcriptId, transcriptId));
    } catch (err) {
      const failedAt = this.clock.now();
      await this.db
        .update(lessonTranscripts)
        .set({
          status: 'FAILED',
          errorMessage: String(err),
          updatedAt: failedAt,
        })
        .where(eq(lessonTranscripts.transcriptId, transcriptId));

      this.logger.error(`Transcription failed for ${transcriptId}: ${String(err)}`);
    }
  }
}
