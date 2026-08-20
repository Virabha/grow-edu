import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';

describe('the collapsed product model', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let student: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database, clock);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
  });

  function as(actor: TestActor) {
    return {
      post: (path: string, body: object = {}) =>
        request(app.getHttpServer())
          .post(path)
          .set(...authHeader(app, actor))
          .send(body),
      patch: (path: string, body: object = {}) =>
        request(app.getHttpServer())
          .patch(path)
          .set(...authHeader(app, actor))
          .send(body),
      get: (path: string) =>
        request(app.getHttpServer())
          .get(path)
          .set(...authHeader(app, actor)),
    };
  }

  async function createBatch(overrides: Record<string, unknown> = {}) {
    const suffix = Math.random().toString(36).slice(2, 10);
    const { body } = await as(admin)
      .post('/batches', {
        title: `Batch ${suffix}`,
        slug: `batch-${suffix}`,
        price: 0,
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2027-06-30T00:00:00.000Z',
        status: 'ONGOING',
        ...overrides,
      })
      .expect(201);
    return body;
  }

  it('sells a recorded-only product with no scheduled classes', async () => {
    const batch = await createBatch({ deliveryMode: 'RECORDED' });

    await as(student).post(`/batches/${batch.batchId}/checkout`).expect(201);

    const { body } = await as(student).get('/batches/mine').expect(200);
    expect(body.map((b: { batchId: string }) => b.batchId)).toEqual([
      batch.batchId,
    ]);
    expect(body[0].deliveryMode).toBe('RECORDED');

    const sessions = await as(student)
      .get(`/batches/${batch.batchId}/sessions`)
      .expect(200);
    expect(sessions.body).toEqual([]);
  });

  it('refuses to schedule a live class on a recorded-only product', async () => {
    const batch = await createBatch({ deliveryMode: 'RECORDED' });

    const { body } = await as(admin)
      .post(`/batches/${batch.batchId}/sessions`, {
        title: 'Live doubt clearing',
        type: 'LIVE',
        liveProvider: 'ZOOM',
        joinUrl: 'https://zoom.example/abc',
        scheduledStartAt: '2026-09-02T10:00:00.000Z',
        scheduledEndAt: '2026-09-02T11:00:00.000Z',
      })
      .expect(400);

    expect(body.message).toMatch(/recorded-only/i);
  });

  it('takes a live class on a hybrid product', async () => {
    const batch = await createBatch({ deliveryMode: 'HYBRID' });

    await as(admin)
      .post(`/batches/${batch.batchId}/sessions`, {
        title: 'Live doubt clearing',
        type: 'LIVE',
        liveProvider: 'ZOOM',
        joinUrl: 'https://zoom.example/abc',
        scheduledStartAt: '2026-09-02T10:00:00.000Z',
        scheduledEndAt: '2026-09-02T11:00:00.000Z',
      })
      .expect(201);
  });

  it('records how each student came by their place', async () => {
    const batch = await createBatch();
    const granted = await createUser(database, 'LEARNER');

    await as(student).post(`/batches/${batch.batchId}/checkout`).expect(201);
    await as(admin)
      .post(`/batches/${batch.batchId}/enrollments`, {
        userIds: [granted.userId],
      })
      .expect(201);

    const { body } = await as(admin)
      .get(`/batches/${batch.batchId}/enrollments`)
      .expect(200);

    const sources = new Map(
      body.data.map((e: { userId: string; source: string }) => [
        e.userId,
        e.source,
      ]),
    );
    expect(sources.get(student.userId)).toBe('FREE');
    expect(sources.get(granted.userId)).toBe('ADMIN_GRANT');
  });

  it('marks a test with negative marking, as the batch engine always did', async () => {
    const batch = await createBatch();
    await as(student).post(`/batches/${batch.batchId}/checkout`).expect(201);

    const { body: quiz } = await as(admin)
      .post(`/batches/${batch.batchId}/quizzes`, {
        title: 'Mechanics I',
        durationMinutes: 30,
        maxAttempts: 2,
        negativeMarkPercent: 25,
        passingPercent: 40,
        publish: true,
      })
      .expect(201);

    const { body: question } = await as(admin)
      .post(`/batches/${batch.batchId}/quizzes/${quiz.quizId}/questions`, {
        order: 1,
        type: 'MCQ_SINGLE',
        prompt: 'Which is a vector?',
        options: [
          { id: 'a', text: 'Speed' },
          { id: 'b', text: 'Velocity' },
        ],
        correctAnswer: 'b',
        marks: 4,
      })
      .expect(201);

    const { body: attempt } = await as(student)
      .post(`/batches/${batch.batchId}/quizzes/${quiz.quizId}/attempts`)
      .expect(201);

    const { body: submitted } = await as(student)
      .post(
        `/batches/${batch.batchId}/quizzes/${quiz.quizId}/attempts/${attempt.attemptId}/submit`,
        { answers: { [question.questionId]: 'a' } },
      )
      .expect(201);

    expect(Number(submitted.maxScore)).toBe(4);
    expect(Number(submitted.score)).toBe(0);
    expect(submitted.wrongCount).toBe(1);
  });

  it('holds a test shut until it opens, then lets it be taken', async () => {
    const batch = await createBatch();
    await as(student).post(`/batches/${batch.batchId}/checkout`).expect(201);

    const { body: quiz } = await as(admin)
      .post(`/batches/${batch.batchId}/quizzes`, {
        title: 'Sunday mock',
        durationMinutes: 30,
        maxAttempts: 1,
        negativeMarkPercent: 0,
        passingPercent: 40,
        opensAt: '2026-10-01T09:00:00.000Z',
        closesAt: '2026-10-01T12:00:00.000Z',
        publish: true,
      })
      .expect(201);

    const tooEarly = await as(student).post(
      `/batches/${batch.batchId}/quizzes/${quiz.quizId}/attempts`,
    );
    expect(tooEarly.status).toBe(400);
    expect(tooEarly.body.message).toMatch(/hasn't opened/i);

    clock.set('2026-10-01T10:00:00.000Z');
    await as(student)
      .post(`/batches/${batch.batchId}/quizzes/${quiz.quizId}/attempts`)
      .expect(201);
  });

  it('shuts a test once its window closes', async () => {
    const batch = await createBatch();
    await as(student).post(`/batches/${batch.batchId}/checkout`).expect(201);

    const { body: quiz } = await as(admin)
      .post(`/batches/${batch.batchId}/quizzes`, {
        title: 'Sunday mock',
        durationMinutes: 30,
        maxAttempts: 1,
        negativeMarkPercent: 0,
        passingPercent: 40,
        opensAt: '2026-10-01T09:00:00.000Z',
        closesAt: '2026-10-01T12:00:00.000Z',
        publish: true,
      })
      .expect(201);

    clock.set('2026-10-01T12:00:01.000Z');

    const tooLate = await as(student).post(
      `/batches/${batch.batchId}/quizzes/${quiz.quizId}/attempts`,
    );
    expect(tooLate.status).toBe(400);
    expect(tooLate.body.message).toMatch(/closed/i);
  });

  it('leaves a historic attempt readable after the test is edited', async () => {
    const batch = await createBatch();
    await as(student).post(`/batches/${batch.batchId}/checkout`).expect(201);

    const { body: quiz } = await as(admin)
      .post(`/batches/${batch.batchId}/quizzes`, {
        title: 'Mechanics I',
        durationMinutes: 30,
        maxAttempts: 3,
        negativeMarkPercent: 0,
        passingPercent: 40,
        publish: true,
      })
      .expect(201);

    const { body: question } = await as(admin)
      .post(`/batches/${batch.batchId}/quizzes/${quiz.quizId}/questions`, {
        order: 1,
        type: 'MCQ_SINGLE',
        prompt: 'Which is a vector?',
        options: [
          { id: 'a', text: 'Speed' },
          { id: 'b', text: 'Velocity' },
        ],
        correctAnswer: 'b',
        marks: 4,
      })
      .expect(201);

    const { body: attempt } = await as(student)
      .post(`/batches/${batch.batchId}/quizzes/${quiz.quizId}/attempts`)
      .expect(201);
    await as(student)
      .post(
        `/batches/${batch.batchId}/quizzes/${quiz.quizId}/attempts/${attempt.attemptId}/submit`,
        { answers: { [question.questionId]: 'b' } },
      )
      .expect(201);

    await as(admin)
      .patch(
        `/batches/${batch.batchId}/quizzes/${quiz.quizId}/questions/${question.questionId}`,
        { prompt: 'Which of these is a vector quantity?' },
      )
      .expect(200);

    const { body: second } = await as(student)
      .post(`/batches/${batch.batchId}/quizzes/${quiz.quizId}/attempts`)
      .expect(201);

    const { body: history } = await as(student)
      .get(`/batches/${batch.batchId}/quizzes/${quiz.quizId}/attempts`)
      .expect(200);

    const byAttemptNo = new Map(
      history.map((a: { attemptNo: number; quizVersion: number }) => [
        a.attemptNo,
        a.quizVersion,
      ]),
    );
    expect(byAttemptNo.get(1)).toBeLessThan(second.quizVersion);
    expect(history).toHaveLength(2);
    expect(history.map((a: { attemptNo: number }) => a.attemptNo).sort()).toEqual(
      [1, 2],
    );
  });
});
