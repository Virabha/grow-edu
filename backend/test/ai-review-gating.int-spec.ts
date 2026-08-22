import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';

import { MODEL_PROVIDER } from '../src/ai/model-provider';
import { assessmentQuestions, assessmentTestQuestions } from '../src/database/schema';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createBatch, createUser, enrol } from './support/factories';
import { makeModelProvider, RecordingModelProvider } from './support/ai-factories';
import {
  createQuestion,
  createTest,
  placeQuestion,
  seedDifficultyScale,
  Taxonomy,
  createTaxonomy,
} from './support/assessment-factories';

describe('ai review gating (ticket 15)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let provider: RecordingModelProvider;
  const clock = new TestClock();

  let instructor: TestActor;
  let student: TestActor;
  let taxonomy: Taxonomy;
  let batchId: string;

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
    clock.set('2026-08-22T09:00:00.000Z');
    await truncateAll(database);
    provider.calls = [];
    provider.failNext = false;
    instructor = await createUser(database, 'INSTRUCTOR');
    student = await createUser(database, 'LEARNER');
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, instructor.userId);
    batchId = await createBatch(database, instructor.userId);
    await enrol(database, batchId, student.userId);
  });

  async function createUnreviewedQuestion(): Promise<string> {
    const questionId = await createQuestion(database, taxonomy, instructor.userId, {
      difficulty: 1,
    });
    await database.db
      .update(assessmentQuestions)
      .set({ reviewStatus: 'UNREVIEWED' })
      .where(eq(assessmentQuestions.questionId, questionId));
    return questionId;
  }

  async function createApprovedQuestion(): Promise<string> {
    const questionId = await createQuestion(database, taxonomy, instructor.userId, {
      difficulty: 1,
    });
    await database.db
      .update(assessmentQuestions)
      .set({ reviewStatus: 'APPROVED', reviewedBy: instructor.userId })
      .where(eq(assessmentQuestions.questionId, questionId));
    return questionId;
  }

  describe('test path', () => {
    it('refuses to add an unreviewed question to a test', async () => {
      const testId = await createTest(database, instructor.userId);
      const unreviewedId = await createUnreviewedQuestion();

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, instructor))
        .send({ questionId: unreviewedId, marks: 4 })
        .expect(409);
    });

    it('refuses to add a rejected question to a test', async () => {
      const testId = await createTest(database, instructor.userId);
      const questionId = await createQuestion(database, taxonomy, instructor.userId);
      await database.db
        .update(assessmentQuestions)
        .set({ reviewStatus: 'REJECTED' })
        .where(eq(assessmentQuestions.questionId, questionId));

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, instructor))
        .send({ questionId, marks: 4 })
        .expect(409);
    });

    it('allows adding a human-authored question (null review status) to a test', async () => {
      const testId = await createTest(database, instructor.userId);
      const questionId = await createQuestion(database, taxonomy, instructor.userId);

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, instructor))
        .send({ questionId, marks: 4 })
        .expect(201);
    });
  });

  describe('topic practice path', () => {
    it('does not serve an unreviewed question', async () => {
      await createUnreviewedQuestion();

      await request(app.getHttpServer())
        .get(`/assessment/practice/topic/${taxonomy.topicId}/next`)
        .set(...authHeader(app, student))
        .expect(404);
    });

    it('serves an approved question', async () => {
      await createApprovedQuestion();

      const { body } = await request(app.getHttpServer())
        .get(`/assessment/practice/topic/${taxonomy.topicId}/next`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(body.questionId).toBeDefined();
    });

    it('does not serve an unreviewed question even when an approved one exists for another topic', async () => {
      const otherTaxonomy = await createTaxonomy(database, instructor.userId);
      await createUnreviewedQuestion();
      await createApprovedQuestion();

      await database.db
        .update(assessmentQuestions)
        .set({ topicId: otherTaxonomy.topicId })
        .where(eq(assessmentQuestions.topicId, taxonomy.topicId));

      await request(app.getHttpServer())
        .get(`/assessment/practice/topic/${taxonomy.topicId}/next`)
        .set(...authHeader(app, student))
        .expect(404);
    });
  });

  describe('daily practice path', () => {
    it('does not include an unreviewed question in the generated set', async () => {
      const approvedId = await createApprovedQuestion();
      const unreviewedId = await createUnreviewedQuestion();

      const testId = await createTest(database, instructor.userId, {
        batchId,
        publishedAt: clock.now(),
        durationMinutes: 60,
      });
      await placeQuestion(database, testId, approvedId);

      for (let i = 1; i < 12; i += 1) {
        const qId = await createQuestion(database, taxonomy, instructor.userId, { difficulty: 1 });
        await placeQuestion(database, testId, qId, { order: i + 1 });
      }

      const { body: dailyBody } = await request(app.getHttpServer())
        .get(`/assessment/practice/daily?batchId=${batchId}`)
        .set(...authHeader(app, student))
        .expect(200);

      const placements = await database.db
        .select()
        .from(assessmentTestQuestions)
        .where(eq(assessmentTestQuestions.testId, dailyBody.testId));

      const placedIds = placements.map((p) => p.questionId);
      expect(placedIds).not.toContain(unreviewedId);
    });
  });

  describe('approve and reject (review workflow)', () => {
    it('approving an unreviewed question records the reviewer and makes it servable', async () => {
      const questionId = await createUnreviewedQuestion();

      const { body } = await request(app.getHttpServer())
        .post(`/assessment/questions/${questionId}/approve`)
        .set(...authHeader(app, instructor))
        .expect(201);

      expect(body.reviewStatus).toBe('APPROVED');
      expect(body.reviewedBy).toBe(instructor.userId);
      expect(body.reviewedAt).toBeDefined();

      const { body: next } = await request(app.getHttpServer())
        .get(`/assessment/practice/topic/${taxonomy.topicId}/next`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(next.questionId).toBe(questionId);
    });

    it('rejecting an unreviewed question means it cannot be served', async () => {
      const questionId = await createUnreviewedQuestion();

      await request(app.getHttpServer())
        .post(`/assessment/questions/${questionId}/reject`)
        .set(...authHeader(app, instructor))
        .expect(201);

      await request(app.getHttpServer())
        .get(`/assessment/practice/topic/${taxonomy.topicId}/next`)
        .set(...authHeader(app, student))
        .expect(404);
    });

    it('rejected question cannot be approved', async () => {
      const questionId = await createQuestion(database, taxonomy, instructor.userId);
      await database.db
        .update(assessmentQuestions)
        .set({ reviewStatus: 'REJECTED' })
        .where(eq(assessmentQuestions.questionId, questionId));

      await request(app.getHttpServer())
        .post(`/assessment/questions/${questionId}/approve`)
        .set(...authHeader(app, instructor))
        .expect(409);
    });

    it('already-approved question cannot be approved again', async () => {
      const questionId = await createApprovedQuestion();

      await request(app.getHttpServer())
        .post(`/assessment/questions/${questionId}/approve`)
        .set(...authHeader(app, instructor))
        .expect(409);
    });
  });
});
