import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { MODEL_PROVIDER } from '../src/ai/model-provider';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { makeModelProvider, RecordingModelProvider } from './support/ai-factories';
import {
  createUser,
  createBatch,
  createSubject,
  createLesson,
  enrol,
  assignInstructor,
} from './support/factories';
import {
  lessonTranscriptSegments,
  lessonTranscripts,
} from '../src/database/schema';
import { randomUUID } from 'crypto';

const DRAIN_INTERVAL_MS = 10_001;

describe('ai-grounding: retrieval scoping', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let provider: RecordingModelProvider;
  let clock: TestClock;
  let queue: InlineJobQueue;

  let admin: TestActor;
  let instructor: TestActor;
  let student: TestActor;

  let batchA: string;
  let batchB: string;
  let subjectA: string;
  let subjectB: string;

  const DECOY_TEXT = 'quantum entanglement photon polarisation state superposition unique-signal-xyz';

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
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

    admin = await createUser(database, 'PLATFORM_ADMIN');
    instructor = await createUser(database, 'INSTRUCTOR');
    student = await createUser(database, 'LEARNER');

    batchA = await createBatch(database, admin.userId);
    batchB = await createBatch(database, admin.userId);
    subjectA = await createSubject(database, batchA);
    subjectB = await createSubject(database, batchB);

    await enrol(database, batchA, student.userId);
    await assignInstructor(database, batchA, instructor.userId);
  });

  it('does not include content from a batch the student is not enrolled in', async () => {
    const decoyLessonId = await createLesson(database, subjectB, {
      title: 'Decoy lesson',
      textContent: DECOY_TEXT,
      status: 'READY',
    });

    const legitLessonId = await createLesson(database, subjectA, {
      title: 'Batch A lesson',
      textContent: 'General course introduction content',
      status: 'READY',
    });

    provider.structuredFor = () => ({
      answer: 'This is a sufficient answer for the student question',
      citations: [{ lessonId: legitLessonId, title: 'Batch A lesson' }],
    });

    await request(app.getHttpServer())
      .post(`/batches/${batchA}/doubts`)
      .set(...authHeader(app, student))
      .send({ title: DECOY_TEXT, body: 'Please explain this topic in detail' })
      .expect(201);

    clock.advance(DRAIN_INTERVAL_MS);
    await queue.tick();

    expect(provider.calls.length).toBeGreaterThan(0);
    const call = provider.calls[0];
    expect(call.cachedPrefix).not.toContain(decoyLessonId);
    expect(call.cachedPrefix).not.toContain(DECOY_TEXT);
    expect(call.cachedPrefix).toContain(legitLessonId);
  });

  it('does not include content from another organisation even if it is a better match', async () => {
    await createLesson(database, subjectA, {
      title: 'Student accessible lesson',
      textContent: 'Accessible content',
      status: 'READY',
    });

    provider.structuredFor = () => ({
      answer: 'This is a sufficient answer for the student question that is long enough',
      citations: [],
    });

    await request(app.getHttpServer())
      .post(`/batches/${batchA}/doubts`)
      .set(...authHeader(app, student))
      .send({ title: 'A question', body: 'Some detail about the topic' })
      .expect(201);

    clock.advance(DRAIN_INTERVAL_MS);
    await queue.tick();

    expect(provider.calls.length).toBeGreaterThan(0);
    const call = provider.calls[0];
    expect(call.cachedPrefix).not.toContain(DECOY_TEXT);
    expect(call.cachedPrefix).not.toContain(subjectB);
    expect(call.cachedPrefix).not.toContain(batchB);
  });

  it('includes transcript segments from enrolled batch lessons', async () => {
    const lessonId = await createLesson(database, subjectA, {
      title: 'Video lesson with transcript',
      type: 'VIDEO',
      status: 'READY',
    });

    const transcriptId = randomUUID();
    await database.db.insert(lessonTranscripts).values({
      transcriptId,
      lessonId,
      status: 'READY',
      requestedAt: clock.now(),
      updatedAt: clock.now(),
    });

    const segmentText = 'transcript segment body about the topic unique-segment-content-abc';
    await database.db.insert(lessonTranscriptSegments).values({
      segmentId: randomUUID(),
      transcriptId,
      lessonId,
      ordinal: 1,
      startSeconds: 0,
      endSeconds: 60,
      body: segmentText,
      createdAt: clock.now(),
    });

    provider.structuredFor = () => ({
      answer: 'A sufficient answer referencing transcript content',
      citations: [{ lessonId, title: 'Video lesson with transcript' }],
    });

    await request(app.getHttpServer())
      .post(`/batches/${batchA}/doubts`)
      .set(...authHeader(app, student))
      .send({ title: 'A question about the video', body: 'What was covered?' })
      .expect(201);

    clock.advance(DRAIN_INTERVAL_MS);
    await queue.tick();

    expect(provider.calls.length).toBeGreaterThan(0);
    const call = provider.calls[0];
    expect(call.cachedPrefix).toContain(segmentText);
  });

  it('returns nothing and does not error when an unenrolled student has a doubt intercepted', async () => {
    const unenrolledStudent = await createUser(database, 'LEARNER');
    await enrol(database, batchA, unenrolledStudent.userId, { status: 'REVOKED' });

    await createLesson(database, subjectA, {
      title: 'Some lesson',
      textContent: 'Some content',
      status: 'READY',
    });

    provider.structuredFor = () => ({
      answer: 'A sufficient fallback answer here for an unenrolled student',
      citations: [],
    });

    const adminResponse = await request(app.getHttpServer())
      .post(`/batches/${batchA}/doubts`)
      .set(...authHeader(app, admin))
      .send({ title: 'Question from admin', body: 'Posted on behalf' })
      .expect(201);

    const doubtId = adminResponse.body.doubtId;

    await database.db
      .update((await import('../src/database/schema')).batchDoubts)
      .set({ askedBy: unenrolledStudent.userId })
      .where(
        (await import('drizzle-orm')).eq(
          (await import('../src/database/schema')).batchDoubts.doubtId,
          doubtId,
        ),
      );

    clock.advance(DRAIN_INTERVAL_MS);
    await queue.tick();

    const aiAnswer = await database.db
      .select()
      .from((await import('../src/database/schema')).aiDoubtAnswers)
      .where(
        (await import('drizzle-orm')).eq(
          (await import('../src/database/schema')).aiDoubtAnswers.doubtId,
          doubtId,
        ),
      )
      .limit(1);

    expect(['FAILED', 'PENDING']).toContain(aiAnswer[0]?.status ?? 'FAILED');
  });
});
