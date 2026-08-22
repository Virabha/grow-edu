import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { MODEL_PROVIDER } from '../src/ai/model-provider';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser, createBatch, createSubject, createLesson, enrol, assignInstructor } from './support/factories';
import { makeModelProvider, RecordingModelProvider } from './support/ai-factories';
import { DOUBT_DRAIN_JOB } from '../src/batches/engagement/doubt-answer.service';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { aiModelCalls } from '../src/database/schema';
import { eq, and } from 'drizzle-orm';

describe('ai foundation', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let provider: RecordingModelProvider;
  const clock = new TestClock();

  let admin: TestActor;
  let instructor: TestActor;
  let student: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
    provider = makeModelProvider();
    app = await createTestApp(database, clock, [
      { token: MODEL_PROVIDER, value: provider },
    ]);
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
    provider.structuredFor = () => null;
    provider.usageFor = () => ({
      inputTokens: 100,
      outputTokens: 20,
      cacheReadTokens: 90,
      cacheWriteTokens: 0,
    });
    admin = await createUser(database, 'PLATFORM_ADMIN');
    instructor = await createUser(database, 'INSTRUCTOR');
    student = await createUser(database, 'LEARNER');
  });

  it('refuses a student sight of model cost', async () => {
    await request(app.getHttpServer())
      .get('/ai/cost')
      .set(...authHeader(app, student))
      .expect(403);
  });

  it('refuses an instructor sight of model cost', async () => {
    await request(app.getHttpServer())
      .get('/ai/cost')
      .set(...authHeader(app, instructor))
      .expect(403);
  });

  it('gives the owner an empty breakdown rather than an error when nothing has run', async () => {
    const response = await request(app.getHttpServer())
      .get('/ai/cost')
      .set(...authHeader(app, admin))
      .expect(200);

    expect(response.body.rows).toEqual([]);
    expect(response.body.totals.calls).toBe(0);
    expect(response.body.totals.cacheReadTokens).toBe(0);
  });

  it('rejects a malformed date range rather than defaulting silently', async () => {
    await request(app.getHttpServer())
      .get('/ai/cost')
      .query({ from: 'not-a-date' })
      .set(...authHeader(app, admin))
      .expect(400);
  });

  describe('ticket 02 — cost attribution', () => {
    async function runDoubtDrain(): Promise<{ doubtId: string }> {
      const batchId = await createBatch(database, admin.userId);
      const subjectId = await createSubject(database, batchId);
      await createLesson(database, subjectId, {
        title: 'Lesson',
        textContent: 'Content for grounding',
        status: 'READY',
      });
      await enrol(database, batchId, student.userId);
      await assignInstructor(database, batchId, instructor.userId);

      const response = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'Test cost question', body: 'Detail for the cost test' })
        .expect(201);

      const queue = app.get<InlineJobQueue>(JOB_QUEUE);
      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      return { doubtId: response.body.doubtId };
    }

    it('a usage row exists after a model call with feature, organisation and model', async () => {
      provider.structuredFor = () => null;

      await runDoubtDrain();

      const rows = await database.db
        .select()
        .from(aiModelCalls)
        .where(eq(aiModelCalls.feature, 'doubt.answer'));

      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].feature).toBe('doubt.answer');
      expect(rows[0].model).toBeTruthy();
      expect(rows[0].organizationId).toBeTruthy();
    });

    it('a failed call still records the attempt and its feature', async () => {
      provider.failNext = true;

      await runDoubtDrain();

      const rows = await database.db
        .select()
        .from(aiModelCalls)
        .where(
          and(
            eq(aiModelCalls.feature, 'doubt.answer'),
            eq(aiModelCalls.outcome, 'FAILED'),
          ),
        );

      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].feature).toBe('doubt.answer');
    });

    it('GET /ai/cost aggregates real rows by feature and organisation', async () => {
      provider.structuredFor = () => null;

      await runDoubtDrain();

      const response = await request(app.getHttpServer())
        .get('/ai/cost')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(response.body.rows.length).toBeGreaterThan(0);
      expect(response.body.rows[0].feature).toBe('doubt.answer');
      expect(response.body.totals.calls).toBeGreaterThan(0);
    });

    it('cache-read tokens are stored and appear in the cost aggregation', async () => {
      provider.structuredFor = () => null;
      provider.usageFor = () => ({
        inputTokens: 50,
        outputTokens: 10,
        cacheReadTokens: 200,
        cacheWriteTokens: 5,
      });

      await runDoubtDrain();

      const callRows = await database.db
        .select()
        .from(aiModelCalls)
        .where(eq(aiModelCalls.feature, 'doubt.answer'));

      const totalCacheRead = callRows.reduce((sum, r) => sum + r.cacheReadTokens, 0);
      expect(totalCacheRead).toBeGreaterThan(0);

      const response = await request(app.getHttpServer())
        .get('/ai/cost')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(response.body.totals.cacheReadTokens).toBeGreaterThan(0);
      expect(response.body.totals.cacheWriteTokens).toBeGreaterThanOrEqual(0);
      expect(response.body.totals.inputTokens).toBeGreaterThan(0);
      expect(response.body.totals.outputTokens).toBeGreaterThanOrEqual(0);
    });
  });
});
