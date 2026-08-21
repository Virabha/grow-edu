import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { REVIEW_INGESTION_JOB } from '../src/review/review-item.service';
import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createBatch, createUser, enrol } from './support/factories';
import {
  createQuestion,
  createTaxonomy,
  createTest,
  placeQuestion,
  seedDifficultyScale,
  Taxonomy,
  openAttempt,
  answerQuestion,
  submitAttempt,
} from './support/assessment-factories';

interface QueueEntry {
  entryId: string;
  ordinal: number;
  kind: 'REVIEW' | 'PRACTICE';
  referenceId: string;
  questionId: string;
  completedAt: string | null;
}

interface DailyQueue {
  queueId: string;
  queueDate: string;
  practiceSetId: string | null;
  entries: QueueEntry[];
}

describe('daily review queue (ticket 16)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let student: TestActor;
  let taxonomy: Taxonomy;
  let batchId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database, clock);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.set('2026-08-21T09:00:00.000Z');
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, admin.userId);
    batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);
  });

  async function runIngestion() {
    await app.get<InlineJobQueue>(JOB_QUEUE).enqueue(REVIEW_INGESTION_JOB, undefined);
  }

  async function seedBatchQuestions(count = 12): Promise<void> {
    const testId = await createTest(database, admin.userId, {
      batchId,
      publishedAt: clock.now(),
      durationMinutes: 60,
    });
    for (let i = 0; i < count; i += 1) {
      const q = await createQuestion(database, taxonomy, admin.userId, {
        difficulty: 1,
      });
      await placeQuestion(database, testId, q, { order: i + 1 });
    }
  }

  async function getQueue(qBatchId?: string): Promise<DailyQueue> {
    const url = qBatchId
      ? `/review/queue?batchId=${qBatchId}`
      : '/review/queue';
    const { body } = await request(app.getHttpServer())
      .get(url)
      .set(...authHeader(app, student))
      .expect(200);
    return body as DailyQueue;
  }

  async function sitWrong(): Promise<string> {
    const testId = await createTest(database, admin.userId, {
      publishedAt: clock.now(),
      durationMinutes: 120,
    });
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    const placementId = await placeQuestion(database, testId, questionId);
    const attempt = await openAttempt<{ attemptId: string }>(app, testId, student);
    await answerQuestion(app, attempt.attemptId, placementId, 'b', student);
    await submitAttempt(app, attempt.attemptId, student);
    return questionId;
  }

  it('returns review items and practice set entries as one ordered list', async () => {
    await seedBatchQuestions(12);
    const notebookQuestionId = await sitWrong();
    await runIngestion();

    const queue = await getQueue(batchId);

    const reviewEntries = queue.entries.filter((e) => e.kind === 'REVIEW');
    const practiceEntries = queue.entries.filter((e) => e.kind === 'PRACTICE');

    expect(reviewEntries.length).toBeGreaterThan(0);
    expect(practiceEntries.length).toBeGreaterThan(0);
    expect(reviewEntries.some((e) => e.questionId === notebookQuestionId)).toBe(true);

    const ordinals = queue.entries.map((e) => e.ordinal);
    expect(ordinals).toEqual(ordinals.map((_, i) => i));
  });

  it('places review entries before practice entries', async () => {
    await seedBatchQuestions(12);
    await sitWrong();
    await runIngestion();

    const queue = await getQueue(batchId);
    const firstPractice = queue.entries.findIndex((e) => e.kind === 'PRACTICE');
    const lastReview = queue.entries.reduce(
      (last, e, i) => (e.kind === 'REVIEW' ? i : last),
      -1,
    );

    expect(firstPractice).toBeGreaterThan(-1);
    expect(lastReview).toBeGreaterThan(-1);
    expect(lastReview).toBeLessThan(firstPractice);
  });

  it('requesting the queue twice on the same day returns the same queueId', async () => {
    await seedBatchQuestions(12);

    const first = await getQueue(batchId);
    const second = await getQueue(batchId);

    expect(second.queueId).toBe(first.queueId);
    expect(second.entries.length).toBe(first.entries.length);
  });

  it('completing an entry removes it from the queue response', async () => {
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    await request(app.getHttpServer())
      .post(`/review/bookmarks/${questionId}`)
      .set(...authHeader(app, student))
      .expect(201);

    const queue = await getQueue();
    const [entry] = queue.entries.filter((e) => e.kind === 'REVIEW');
    expect(entry).toBeDefined();

    await request(app.getHttpServer())
      .patch(`/review/queue/entries/${entry.entryId}/complete`)
      .set(...authHeader(app, student))
      .send({ outcome: 'CORRECT' })
      .expect(200);

    const updatedQueue = await getQueue();
    const stillPresent = updatedQueue.entries.find((e) => e.entryId === entry.entryId);
    expect(stillPresent).toBeUndefined();
  });

  it('a student with nothing due still receives the practice set', async () => {
    await seedBatchQuestions(12);

    const queue = await getQueue(batchId);

    const reviewEntries = queue.entries.filter((e) => e.kind === 'REVIEW');
    const practiceEntries = queue.entries.filter((e) => e.kind === 'PRACTICE');

    expect(reviewEntries).toHaveLength(0);
    expect(practiceEntries.length).toBeGreaterThan(0);
  });

  it('a student with no batch still receives their due review items', async () => {
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    await request(app.getHttpServer())
      .post(`/review/bookmarks/${questionId}`)
      .set(...authHeader(app, student))
      .expect(201);

    const queue = await getQueue();

    const reviewEntries = queue.entries.filter((e) => e.kind === 'REVIEW');
    const practiceEntries = queue.entries.filter((e) => e.kind === 'PRACTICE');

    expect(reviewEntries.length).toBeGreaterThan(0);
    expect(practiceEntries).toHaveLength(0);
  });

  it('the queue date matches today in UTC', async () => {
    const queue = await getQueue();
    expect(queue.queueDate).toBe('2026-08-21');
  });

  it('a completed entry cannot be completed again', async () => {
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    await request(app.getHttpServer())
      .post(`/review/bookmarks/${questionId}`)
      .set(...authHeader(app, student))
      .expect(201);

    const queue = await getQueue();
    const [entry] = queue.entries.filter((e) => e.kind === 'REVIEW');

    await request(app.getHttpServer())
      .patch(`/review/queue/entries/${entry.entryId}/complete`)
      .set(...authHeader(app, student))
      .send({ outcome: 'CORRECT' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/review/queue/entries/${entry.entryId}/complete`)
      .set(...authHeader(app, student))
      .send({ outcome: 'CORRECT' })
      .expect(400);
  });

  it('completing a review entry without an outcome returns 400', async () => {
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    await request(app.getHttpServer())
      .post(`/review/bookmarks/${questionId}`)
      .set(...authHeader(app, student))
      .expect(201);

    const queue = await getQueue();
    const [entry] = queue.entries.filter((e) => e.kind === 'REVIEW');

    await request(app.getHttpServer())
      .patch(`/review/queue/entries/${entry.entryId}/complete`)
      .set(...authHeader(app, student))
      .send({})
      .expect(400);
  });

  it('another user cannot see or complete a different user queue entry', async () => {
    const other = await createUser(database, 'LEARNER');
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    await request(app.getHttpServer())
      .post(`/review/bookmarks/${questionId}`)
      .set(...authHeader(app, student))
      .expect(201);

    const queue = await getQueue();
    const [entry] = queue.entries.filter((e) => e.kind === 'REVIEW');

    await request(app.getHttpServer())
      .patch(`/review/queue/entries/${entry.entryId}/complete`)
      .set(...authHeader(app, other))
      .send({ outcome: 'CORRECT' })
      .expect(404);
  });
});
