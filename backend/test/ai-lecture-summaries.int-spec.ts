import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { MODEL_PROVIDER } from '../src/ai/model-provider';
import { BATCH_RECONCILE_JOB } from '../src/ai/batch.service';
import {
  lessonSummaries,
  lessonTranscriptSegments,
  lessonTranscripts,
} from '../src/database/schema';
import { eq } from 'drizzle-orm';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import { makeModelProvider, RecordingModelProvider } from './support/ai-factories';

describe('ai lecture summaries (ticket 17)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let provider: RecordingModelProvider;
  let queue: InlineJobQueue;
  const clock = new TestClock();

  let instructor: TestActor;
  let student: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
    provider = makeModelProvider();
    app = await createTestApp(database, clock, [
      { token: MODEL_PROVIDER, value: provider },
    ]);
    queue = app.get<InlineJobQueue>(JOB_QUEUE);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    provider.calls = [];
    provider.batches = [];
    provider.failNext = false;
    provider.batchComplete = true;
    provider.batchOutcomeFor = () => 'SUCCEEDED';
    instructor = await createUser(database, 'INSTRUCTOR');
    student = await createUser(database, 'LEARNER');
  });

  async function seedTranscript(
    lessonId: string,
    segments: { ordinal: number; startSeconds: number; endSeconds: number; body: string }[],
  ): Promise<string> {
    const now = clock.now();
    const [transcript] = await database.db
      .insert(lessonTranscripts)
      .values({
        lessonId,
        status: 'READY',
        requestedAt: now,
        completedAt: now,
        updatedAt: now,
      })
      .returning();

    if (segments.length > 0) {
      await database.db.insert(lessonTranscriptSegments).values(
        segments.map((s) => ({
          transcriptId: transcript.transcriptId,
          lessonId,
          ordinal: s.ordinal,
          startSeconds: s.startSeconds,
          endSeconds: s.endSeconds,
          body: s.body,
          createdAt: now,
        })),
      );
    }

    return transcript.transcriptId;
  }

  const LESSON_ID = 'lesson-abc-123';

  const validSegments = [
    { ordinal: 1, startSeconds: 0, endSeconds: 120, body: 'Introduction to programming concepts.' },
    { ordinal: 2, startSeconds: 120, endSeconds: 300, body: 'Variables and data types explained.' },
    { ordinal: 3, startSeconds: 300, endSeconds: 600, body: 'Control flow and loops.' },
  ];

  const validSummaryOutput = {
    summary: 'This lecture covers the foundational concepts of programming including variables, data types, and control flow structures.',
    keyPoints: [
      'Variables store values in named memory locations',
      'Data types determine what operations are valid',
      'Loops repeat code blocks efficiently',
    ],
    chapters: [
      { startSeconds: 0, title: 'Introduction to Programming' },
      { startSeconds: 120, title: 'Variables and Data Types' },
      { startSeconds: 300, title: 'Control Flow' },
    ],
  };

  it('submits a batch and returns a summaryId', async () => {
    await seedTranscript(LESSON_ID, validSegments);
    provider.structuredFor = () => validSummaryOutput;

    const { body } = await request(app.getHttpServer())
      .post(`/ai/lessons/${LESSON_ID}/summarize`)
      .set(...authHeader(app, instructor))
      .expect(201);

    expect(body.summaryId).toBeDefined();
    expect(provider.batches).toHaveLength(1);
  });

  it('uses the batch path (HAIKU) and not inline completion', async () => {
    await seedTranscript(LESSON_ID, validSegments);
    provider.structuredFor = () => validSummaryOutput;

    await request(app.getHttpServer())
      .post(`/ai/lessons/${LESSON_ID}/summarize`)
      .set(...authHeader(app, instructor))
      .expect(201);

    expect(provider.calls.length).toBeGreaterThan(0);
    for (const call of provider.calls) {
      expect(call.model).toBe('claude-haiku-4-5');
    }
    expect(provider.batches).toHaveLength(1);
  });

  it('produces a READY summary after batch reconciliation', async () => {
    await seedTranscript(LESSON_ID, validSegments);
    provider.structuredFor = () => validSummaryOutput;

    await request(app.getHttpServer())
      .post(`/ai/lessons/${LESSON_ID}/summarize`)
      .set(...authHeader(app, instructor))
      .expect(201);

    await queue.enqueue(BATCH_RECONCILE_JOB, undefined);

    const { body: summary } = await request(app.getHttpServer())
      .get(`/ai/lessons/${LESSON_ID}/summary`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(summary.status).toBe('READY');
    expect(summary.summary).toContain('programming');
    expect(summary.keyPoints).toHaveLength(3);
    expect(summary.chapters).toHaveLength(3);
  });

  it('chapters are strictly increasing and within duration', async () => {
    await seedTranscript(LESSON_ID, validSegments);
    provider.structuredFor = () => validSummaryOutput;

    await request(app.getHttpServer())
      .post(`/ai/lessons/${LESSON_ID}/summarize`)
      .set(...authHeader(app, instructor))
      .expect(201);

    await queue.enqueue(BATCH_RECONCILE_JOB, undefined);

    const [row] = await database.db
      .select()
      .from(lessonSummaries)
      .where(eq(lessonSummaries.lessonId, LESSON_ID));

    const chapters = row.chapters ?? [];
    expect(chapters.length).toBeGreaterThan(0);

    for (let i = 1; i < chapters.length; i += 1) {
      expect(chapters[i].startSeconds).toBeGreaterThan(chapters[i - 1].startSeconds);
    }

    const maxEnd = Math.max(...validSegments.map((s) => s.endSeconds));
    for (const chapter of chapters) {
      expect(chapter.startSeconds).toBeLessThan(maxEnd);
    }
  });

  it('rejects a chapter list with non-increasing timestamps', async () => {
    await seedTranscript(LESSON_ID, validSegments);
    provider.structuredFor = () => ({
      ...validSummaryOutput,
      chapters: [
        { startSeconds: 300, title: 'Chapter A' },
        { startSeconds: 100, title: 'Chapter B' },
      ],
    });

    await request(app.getHttpServer())
      .post(`/ai/lessons/${LESSON_ID}/summarize`)
      .set(...authHeader(app, instructor))
      .expect(201);

    await queue.enqueue(BATCH_RECONCILE_JOB, undefined);

    const [row] = await database.db
      .select()
      .from(lessonSummaries)
      .where(eq(lessonSummaries.lessonId, LESSON_ID));

    expect(row.status).toBe('READY');
    expect(row.chapters).toEqual([]);
  });

  it('rejects any chapter whose timestamp falls outside the lecture duration', async () => {
    await seedTranscript(LESSON_ID, validSegments);
    const maxEnd = Math.max(...validSegments.map((s) => s.endSeconds));

    provider.structuredFor = () => ({
      ...validSummaryOutput,
      chapters: [
        { startSeconds: 0, title: 'Introduction' },
        { startSeconds: maxEnd, title: 'Beyond the end' },
      ],
    });

    await request(app.getHttpServer())
      .post(`/ai/lessons/${LESSON_ID}/summarize`)
      .set(...authHeader(app, instructor))
      .expect(201);

    await queue.enqueue(BATCH_RECONCILE_JOB, undefined);

    const [row] = await database.db
      .select()
      .from(lessonSummaries)
      .where(eq(lessonSummaries.lessonId, LESSON_ID));

    expect(row.status).toBe('READY');
    expect(row.chapters).toEqual([]);
  });

  it('returns 400 when the lesson has no completed transcript', async () => {
    await request(app.getHttpServer())
      .post(`/ai/lessons/${LESSON_ID}/summarize`)
      .set(...authHeader(app, instructor))
      .expect(400);
  });

  it('returns 404 when there is no summary yet', async () => {
    await request(app.getHttpServer())
      .get(`/ai/lessons/${LESSON_ID}/summary`)
      .set(...authHeader(app, student))
      .expect(404);
  });

  it('students cannot submit a summarise request', async () => {
    await seedTranscript(LESSON_ID, validSegments);

    await request(app.getHttpServer())
      .post(`/ai/lessons/${LESSON_ID}/summarize`)
      .set(...authHeader(app, student))
      .expect(403);
  });

  it('a lesson with empty transcript segments produces no summary', async () => {
    await database.db.insert(lessonTranscripts).values({
      lessonId: LESSON_ID,
      status: 'READY',
      requestedAt: clock.now(),
      completedAt: clock.now(),
      updatedAt: clock.now(),
    });

    await request(app.getHttpServer())
      .post(`/ai/lessons/${LESSON_ID}/summarize`)
      .set(...authHeader(app, instructor))
      .expect(400);

    const summaries = await database.db
      .select()
      .from(lessonSummaries)
      .where(eq(lessonSummaries.lessonId, LESSON_ID));

    expect(summaries).toHaveLength(0);
  });
});
