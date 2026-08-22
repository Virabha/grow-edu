import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { MODEL_PROVIDER } from '../src/ai/model-provider';
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
import { DOUBT_DRAIN_JOB } from '../src/batches/engagement/doubt-answer.service';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { aiDoubtAnswers, lessonTranscripts, lessonTranscriptSegments, batches, batchSubjects, lessons, subjectLessons } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

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
      answer: 'This is a sufficient answer for the student question about the topic',
      citations: [{ lessonId: legitLessonId, title: 'Batch A lesson' }],
    });

    await request(app.getHttpServer())
      .post(`/batches/${batchA}/doubts`)
      .set(...authHeader(app, student))
      .send({ title: DECOY_TEXT, body: 'Please explain this topic in detail' })
      .expect(201);

    await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

    expect(provider.calls.length).toBeGreaterThan(0);
    const call = provider.calls[0];
    expect(call.cachedPrefix).not.toContain(decoyLessonId);
    expect(call.cachedPrefix).not.toContain(DECOY_TEXT);
    expect(call.cachedPrefix).toContain(legitLessonId);
  });

  it('does not include content from a batch in another subject not linked to the enrolled batch', async () => {
    const legitLessonId = await createLesson(database, subjectA, {
      title: 'Accessible course lesson',
      textContent: 'Accessible content in the enrolled batch',
      status: 'READY',
    });

    await createLesson(database, subjectB, {
      title: 'Other batch lesson',
      textContent: DECOY_TEXT,
      status: 'READY',
    });

    provider.structuredFor = () => ({
      answer: 'A sufficient answer from course content that is long enough',
      citations: [{ lessonId: legitLessonId, title: 'Accessible course lesson' }],
    });

    await request(app.getHttpServer())
      .post(`/batches/${batchA}/doubts`)
      .set(...authHeader(app, student))
      .send({ title: 'A question about the topic', body: 'Some detail about it' })
      .expect(201);

    await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

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
      answer: 'A sufficient answer referencing transcript content from the lesson',
      citations: [{ lessonId, title: 'Video lesson with transcript' }],
    });

    await request(app.getHttpServer())
      .post(`/batches/${batchA}/doubts`)
      .set(...authHeader(app, student))
      .send({ title: 'A question about the video', body: 'What was covered?' })
      .expect(201);

    await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

    expect(provider.calls.length).toBeGreaterThan(0);
    const call = provider.calls[0];
    expect(call.cachedPrefix).toContain(segmentText);
  });

  it('produces no sources when asker is not enrolled and fails gracefully without calling AI', async () => {
    await createLesson(database, subjectA, {
      title: 'Some lesson',
      textContent: 'Some content',
      status: 'READY',
    });

    const adminResponse = await request(app.getHttpServer())
      .post(`/batches/${batchA}/doubts`)
      .set(...authHeader(app, admin))
      .send({ title: 'Question from admin', body: 'Posted on behalf of a student' })
      .expect(201);

    const doubtId = adminResponse.body.doubtId;

    await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

    const aiAnswer = await database.db
      .select()
      .from(aiDoubtAnswers)
      .where(eq(aiDoubtAnswers.doubtId, doubtId))
      .limit(1);

    expect(aiAnswer[0].status).toBe('FAILED');
    expect(provider.calls.length).toBe(0);
  });

  it('content belonging to another organisation is never retrieved — adversarial org isolation', async () => {
    const DECOY = 'adversarial-org-leakage-unique-signal-xyzqrst';
    const evilOrgId = randomUUID();

    const evilBatchId = randomUUID();
    await database.db.insert(batches).values({
      batchId: evilBatchId,
      organizationId: evilOrgId,
      title: 'Evil Org Batch',
      slug: `evil-batch-${randomUUID().slice(0, 8)}`,
      price: '0',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2027-06-30T00:00:00.000Z'),
      status: 'ONGOING' as never,
      createdBy: admin.userId,
    });

    const evilSubjectId = randomUUID();
    await database.db.insert(batchSubjects).values({
      organizationId: evilOrgId,
      subjectId: evilSubjectId,
      batchId: evilBatchId,
      name: 'Evil Subject',
    });

    const evilLessonId = randomUUID();
    await database.db.insert(lessons).values({
      organizationId: evilOrgId,
      lessonId: evilLessonId,
      subjectId: evilSubjectId,
      title: 'Evil Lesson',
      type: 'TEXT' as never,
      status: 'READY' as never,
      order: 1,
      textContent: DECOY,
    });

    await database.db.insert(subjectLessons).values({
      organizationId: evilOrgId,
      subjectId: evilSubjectId,
      lessonId: evilLessonId,
      order: 1,
    });

    const legitLessonId = await createLesson(database, subjectA, {
      title: 'Legitimate lesson',
      textContent: 'Normal course material about the topic.',
      status: 'READY',
    });

    provider.structuredFor = () => ({
      answer: 'A sufficient answer from legitimate course content for this student question.',
      citations: [{ lessonId: legitLessonId, title: 'Legitimate lesson' }],
    });

    await request(app.getHttpServer())
      .post(`/batches/${batchA}/doubts`)
      .set(...authHeader(app, student))
      .send({ title: DECOY, body: 'Please explain this adversarial topic in detail.' })
      .expect(201);

    await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

    expect(provider.calls.length).toBeGreaterThan(0);
    const call = provider.calls[0];
    expect(call.cachedPrefix).not.toContain(DECOY);
    expect(call.cachedPrefix).not.toContain(evilLessonId);
    expect(call.cachedPrefix).not.toContain(evilOrgId);
  });
});
