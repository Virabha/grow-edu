import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { and, eq } from 'drizzle-orm';

import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { REVIEW_INGESTION_JOB } from '../src/review/review-item.service';
import { reviewItems } from '../src/database/schema';
import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
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

const DAY = 24 * 60 * 60 * 1000;

interface QueueEntry {
  entryId: string;
  kind: 'REVIEW' | 'PRACTICE';
  questionId: string;
  completedAt: string | null;
}

interface DailyQueue {
  queueId: string;
  queueDate: string;
  entries: QueueEntry[];
}

describe('spaced repetition (ticket 15)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let student: TestActor;
  let taxonomy: Taxonomy;

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
  });

  async function runIngestion() {
    await app.get<InlineJobQueue>(JOB_QUEUE).enqueue(REVIEW_INGESTION_JOB, undefined);
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

  async function getQueue(): Promise<DailyQueue> {
    const { body } = await request(app.getHttpServer())
      .get('/review/queue')
      .set(...authHeader(app, student))
      .expect(200);
    return body as DailyQueue;
  }

  async function completeEntry(entryId: string, outcome: 'CORRECT' | 'WRONG') {
    return request(app.getHttpServer())
      .patch(`/review/queue/entries/${entryId}/complete`)
      .set(...authHeader(app, student))
      .send({ outcome })
      .expect(200);
  }

  it('creates a review item from an error notebook entry when the ingestion job runs', async () => {
    const questionId = await sitWrong();

    await runIngestion();

    const items = await database.db
      .select()
      .from(reviewItems)
      .where(
        and(
          eq(reviewItems.userId, student.userId),
          eq(reviewItems.questionId, questionId),
        ),
      );

    expect(items).toHaveLength(1);
    expect(items[0].source).toBe('ERROR_NOTEBOOK');
    expect(items[0].retiredAt).toBeNull();
  });

  it('creates a review item from a bookmark', async () => {
    const questionId = await createQuestion(database, taxonomy, admin.userId);

    await request(app.getHttpServer())
      .post(`/review/bookmarks/${questionId}`)
      .set(...authHeader(app, student))
      .expect(201);

    const items = await database.db
      .select()
      .from(reviewItems)
      .where(
        and(
          eq(reviewItems.userId, student.userId),
          eq(reviewItems.questionId, questionId),
        ),
      );

    expect(items).toHaveLength(1);
    expect(items[0].source).toBe('BOOKMARKED_QUESTION');
    expect(items[0].retiredAt).toBeNull();
  });

  it('places error notebook and bookmark items in the daily queue as REVIEW entries', async () => {
    const notebookQuestionId = await sitWrong();
    await runIngestion();

    const bookmarkQuestionId = await createQuestion(database, taxonomy, admin.userId);
    await request(app.getHttpServer())
      .post(`/review/bookmarks/${bookmarkQuestionId}`)
      .set(...authHeader(app, student))
      .expect(201);

    const queue = await getQueue();
    const reviewEntries = queue.entries.filter((e) => e.kind === 'REVIEW');
    const questionIds = reviewEntries.map((e) => e.questionId);

    expect(questionIds).toContain(notebookQuestionId);
    expect(questionIds).toContain(bookmarkQuestionId);
  });

  it('does not create review items from correct answers', async () => {
    const testId = await createTest(database, admin.userId, {
      publishedAt: clock.now(),
      durationMinutes: 120,
    });
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    const placementId = await placeQuestion(database, testId, questionId);
    const attempt = await openAttempt<{ attemptId: string }>(app, testId, student);
    await answerQuestion(app, attempt.attemptId, placementId, 'a', student);
    await submitAttempt(app, attempt.attemptId, student);

    await runIngestion();

    const items = await database.db
      .select()
      .from(reviewItems)
      .where(eq(reviewItems.userId, student.userId));

    expect(items).toHaveLength(0);
  });

  it('retires a review item when its notebook entry is resolved', async () => {
    await sitWrong();
    await runIngestion();

    const { body: notebook } = await request(app.getHttpServer())
      .get('/assessment/error-notebook')
      .set(...authHeader(app, student))
      .expect(200);

    const [entry] = notebook as { entryId: string }[];

    await request(app.getHttpServer())
      .post(`/assessment/error-notebook/${entry.entryId}/resolve`)
      .set(...authHeader(app, student))
      .expect(201);

    await runIngestion();

    const items = await database.db
      .select()
      .from(reviewItems)
      .where(eq(reviewItems.userId, student.userId));

    expect(items).toHaveLength(1);
    expect(items[0].retiredAt).not.toBeNull();
  });

  it('retired notebook item does not appear in the review queue', async () => {
    await sitWrong();
    await runIngestion();

    const { body: notebook } = await request(app.getHttpServer())
      .get('/assessment/error-notebook')
      .set(...authHeader(app, student))
      .expect(200);

    const [entry] = notebook as { entryId: string }[];

    await request(app.getHttpServer())
      .post(`/assessment/error-notebook/${entry.entryId}/resolve`)
      .set(...authHeader(app, student))
      .expect(201);

    await runIngestion();

    const queue = await getQueue();
    const reviewEntries = queue.entries.filter((e) => e.kind === 'REVIEW');
    expect(reviewEntries).toHaveLength(0);
  });

  it('retires a review item when the bookmark is removed', async () => {
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    await request(app.getHttpServer())
      .post(`/review/bookmarks/${questionId}`)
      .set(...authHeader(app, student))
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/review/bookmarks/${questionId}`)
      .set(...authHeader(app, student))
      .expect(204);

    const items = await database.db
      .select()
      .from(reviewItems)
      .where(eq(reviewItems.userId, student.userId));

    expect(items).toHaveLength(1);
    expect(items[0].retiredAt).not.toBeNull();
  });

  it('removed bookmark no longer appears in the review queue', async () => {
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    await request(app.getHttpServer())
      .post(`/review/bookmarks/${questionId}`)
      .set(...authHeader(app, student))
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/review/bookmarks/${questionId}`)
      .set(...authHeader(app, student))
      .expect(204);

    const queue = await getQueue();
    const reviewEntries = queue.entries.filter((e) => e.kind === 'REVIEW');
    expect(reviewEntries).toHaveLength(0);
  });

  it('a correct review pushes the next due date beyond two days', async () => {
    await sitWrong();
    await runIngestion();

    const queue1 = await getQueue();
    const entry1 = queue1.entries.find((e) => e.kind === 'REVIEW');
    expect(entry1).toBeDefined();
    await completeEntry(entry1!.entryId, 'CORRECT');

    clock.advance(DAY + 1);

    const queue2 = await getQueue();
    const entry2 = queue2.entries.find((e) => e.kind === 'REVIEW');
    expect(entry2).toBeDefined();
    await completeEntry(entry2!.entryId, 'CORRECT');

    clock.advance(2 * DAY);

    const queue3 = await getQueue();
    const entry3 = queue3.entries.find((e) => e.kind === 'REVIEW');
    expect(entry3).toBeUndefined();
  });

  it('a wrong review pulls the next due date back in', async () => {
    await sitWrong();
    await runIngestion();

    const queue1 = await getQueue();
    const entry1 = queue1.entries.find((e) => e.kind === 'REVIEW');
    expect(entry1).toBeDefined();
    await completeEntry(entry1!.entryId, 'CORRECT');

    clock.advance(DAY + 1);

    const queue2 = await getQueue();
    const entry2 = queue2.entries.find((e) => e.kind === 'REVIEW');
    expect(entry2).toBeDefined();
    await completeEntry(entry2!.entryId, 'WRONG');

    clock.advance(2 * DAY);

    const queue3 = await getQueue();
    const entry3 = queue3.entries.find((e) => e.kind === 'REVIEW');
    expect(entry3).toBeDefined();
  });

  it('review logs are written for each review outcome', async () => {
    await sitWrong();
    await runIngestion();

    const queue = await getQueue();
    const [entry] = queue.entries.filter((e) => e.kind === 'REVIEW');
    await completeEntry(entry.entryId, 'CORRECT');

    const { reviewLogs: logsTable } = await import('../src/database/schema');
    const logs = await database.db
      .select()
      .from(logsTable)
      .where(eq(logsTable.userId, student.userId));

    expect(logs).toHaveLength(1);
    expect(logs[0].outcome).toBe('CORRECT');
  });
});
