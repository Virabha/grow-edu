import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import * as request from 'supertest';

import {
  assessmentAttempts,
  batchQuizAttempts,
  batchQuizzes,
} from '../src/database/schema';
import {
  createTaxonomy,
  createQuestion,
  createQuestionGroup,
  createTest,
  placeQuestion,
  seedDifficultyScale,
  Taxonomy,
} from './support/assessment-factories';
import { createBatch, createUser, enrol } from './support/factories';
import { authHeader, TestActor } from './support/test-app';
import { createTestApp } from './support/test-app';
import { createTestDatabase, TestDatabase, truncateAll } from './support/test-database';
import { TestClock } from './support/test-clock';

describe('assessment test assembly (tickets 14, 15, 16)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let admin: TestActor;
  let student: TestActor;
  let taxonomy: Taxonomy;

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    app = await createTestApp(database, clock);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    await truncateAll(database);
    clock.set('2026-01-01T00:00:00.000Z');
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, admin.userId);
  });

  describe('ticket 14 — tests reference bank questions', () => {
    it('removing a placement does not remove the question from the bank', async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const testId = await createTest(database, admin.userId);
      const placementId = await placeQuestion(database, testId, questionId);

      await request(app.getHttpServer())
        .delete(`/assessment/tests/${testId}/questions/${placementId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      const { body } = await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(body.questionId).toBe(questionId);
    });

    it('the same bank question can be placed in two tests with different marks', async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const testId1 = await createTest(database, admin.userId);
      const testId2 = await createTest(database, admin.userId);

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId1}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId, marks: 2 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId2}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId, marks: 5 })
        .expect(201);

      const { body: p1 } = await request(app.getHttpServer())
        .get(`/assessment/tests/${testId1}/questions`)
        .set(...authHeader(app, admin))
        .expect(200);

      const { body: p2 } = await request(app.getHttpServer())
        .get(`/assessment/tests/${testId2}/questions`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(Number(p1[0].marks)).toBe(2);
      expect(Number(p2[0].marks)).toBe(5);
    });

    it('a legacy batch quiz attempt reads back with its original score while the new test surface exists', async () => {
      const batchId = await createBatch(database, admin.userId, '0');
      await enrol(database, batchId, student.userId);

      const quizId = randomUUID();
      await database.db.insert(batchQuizzes).values({
        quizId,
        batchId,
        title: 'Pre-inversion quiz',
        durationMinutes: 30,
        maxAttempts: 1,
        negativeMarkPercent: '0',
        passingPercent: '40',
        createdBy: admin.userId,
        publishedAt: new Date('2025-06-01'),
      });

      const attemptId = randomUUID();
      await database.db.insert(batchQuizAttempts).values({
        attemptId,
        quizId,
        userId: student.userId,
        status: 'SUBMITTED' as never,
        expiresAt: new Date('2025-06-01T01:00:00Z'),
        submittedAt: new Date('2025-06-01T00:30:00Z'),
        score: '75',
        maxScore: '100',
        answers: {},
      });

      await request(app.getHttpServer())
        .post('/assessment/tests')
        .set(...authHeader(app, admin))
        .send({ title: 'New bank-based test' })
        .expect(201);

      const { body } = await request(app.getHttpServer())
        .get(`/batches/${batchId}/quizzes/${quizId}/attempts/${attemptId}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(Number(body.score)).toBe(75);
      expect(Number(body.maxScore)).toBe(100);
    });

    it('deleting a test leaves its questions in the bank', async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);

      const { body: created } = await request(app.getHttpServer())
        .post('/assessment/tests')
        .set(...authHeader(app, admin))
        .send({ title: 'Temporary test' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/tests/${created.testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId, marks: 3 })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/assessment/tests/${created.testId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      const { body: q } = await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(q.questionId).toBe(questionId);
    });

    it('test question order is explicit and stable', async () => {
      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const q2 = await createQuestion(database, taxonomy, admin.userId);
      const q3 = await createQuestion(database, taxonomy, admin.userId);

      const { body: created } = await request(app.getHttpServer())
        .post('/assessment/tests')
        .set(...authHeader(app, admin))
        .send({ title: 'Order test' })
        .expect(201);

      const testId = created.testId;

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId: q3, marks: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId: q1, marks: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId: q2, marks: 1 })
        .expect(201);

      const { body: placements } = await request(app.getHttpServer())
        .get(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(placements).toHaveLength(3);
      expect(placements[0].questionId).toBe(q3);
      expect(placements[1].questionId).toBe(q1);
      expect(placements[2].questionId).toBe(q2);
    });
  });

  describe('ticket 15 — explicit assembly', () => {
    it('questions appear in the order they were placed', async () => {
      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const q2 = await createQuestion(database, taxonomy, admin.userId);

      const { body: created } = await request(app.getHttpServer())
        .post('/assessment/tests')
        .set(...authHeader(app, admin))
        .send({ title: 'Placement order test' })
        .expect(201);

      const testId = created.testId;

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId: q2, marks: 2 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId: q1, marks: 1 })
        .expect(201);

      const { body: placements } = await request(app.getHttpServer())
        .get(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(placements[0].questionId).toBe(q2);
      expect(placements[1].questionId).toBe(q1);
    });

    it('adding one group member adds the whole group in group order', async () => {
      const groupId = await createQuestionGroup(database, admin.userId);
      const q1 = await createQuestion(database, taxonomy, admin.userId, {
        groupId,
        groupOrder: 1,
      });
      const q2 = await createQuestion(database, taxonomy, admin.userId, {
        groupId,
        groupOrder: 2,
      });
      const q3 = await createQuestion(database, taxonomy, admin.userId, {
        groupId,
        groupOrder: 3,
      });

      const { body: created } = await request(app.getHttpServer())
        .post('/assessment/tests')
        .set(...authHeader(app, admin))
        .send({ title: 'Group test' })
        .expect(201);

      const testId = created.testId;

      const { body: added } = await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId: q2, marks: 4 })
        .expect(201);

      expect(added).toHaveLength(3);
      expect(added[0].questionId).toBe(q1);
      expect(added[1].questionId).toBe(q2);
      expect(added[2].questionId).toBe(q3);

      const { body: placements } = await request(app.getHttpServer())
        .get(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(placements).toHaveLength(3);
      expect(placements[0].questionId).toBe(q1);
      expect(placements[1].questionId).toBe(q2);
      expect(placements[2].questionId).toBe(q3);
    });

    it('removing one group member removes the whole group', async () => {
      const groupId = await createQuestionGroup(database, admin.userId);
      const q1 = await createQuestion(database, taxonomy, admin.userId, {
        groupId,
        groupOrder: 1,
      });
      const q2 = await createQuestion(database, taxonomy, admin.userId, {
        groupId,
        groupOrder: 2,
      });

      const { body: created } = await request(app.getHttpServer())
        .post('/assessment/tests')
        .set(...authHeader(app, admin))
        .send({ title: 'Group removal test' })
        .expect(201);

      const testId = created.testId;

      const { body: added } = await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId: q1, marks: 3 })
        .expect(201);

      const q2Placement = added.find(
        (p: { questionId: string }) => p.questionId === q2,
      );
      expect(q2Placement).toBeDefined();

      await request(app.getHttpServer())
        .delete(`/assessment/tests/${testId}/questions/${q2Placement.placementId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      const { body: remaining } = await request(app.getHttpServer())
        .get(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(remaining).toHaveLength(0);
    });

    it('a retired question cannot be added (409)', async () => {
      const retiredId = await createQuestion(database, taxonomy, admin.userId, {
        isRetired: true,
      });

      const { body: created } = await request(app.getHttpServer())
        .post('/assessment/tests')
        .set(...authHeader(app, admin))
        .send({ title: 'Retired check test' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/tests/${created.testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId: retiredId, marks: 1 })
        .expect(409);
    });

    it('the same question cannot be added to a test twice (409)', async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);

      const { body: created } = await request(app.getHttpServer())
        .post('/assessment/tests')
        .set(...authHeader(app, admin))
        .send({ title: 'Duplicate check test' })
        .expect(201);

      const testId = created.testId;

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId, marks: 2 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId, marks: 2 })
        .expect(409);
    });
  });

  describe('ticket 16 — marks and negative rule', () => {
    it('the test reports its max score as the sum of all placements', async () => {
      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const q2 = await createQuestion(database, taxonomy, admin.userId);
      const q3 = await createQuestion(database, taxonomy, admin.userId);

      const { body: created } = await request(app.getHttpServer())
        .post('/assessment/tests')
        .set(...authHeader(app, admin))
        .send({ title: 'Max score test' })
        .expect(201);

      const testId = created.testId;

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId: q1, marks: 2 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId: q2, marks: 3 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId: q3, marks: 5 })
        .expect(201);

      const { body: test } = await request(app.getHttpServer())
        .get(`/assessment/tests/${testId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(test.maxScore).toBe(10);
    });

    it('placement negativeMarkPercent falls back to the test default when absent', async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);

      const { body: created } = await request(app.getHttpServer())
        .post('/assessment/tests')
        .set(...authHeader(app, admin))
        .send({ title: 'Negative rule fallback test', negativeMarkPercent: 25 })
        .expect(201);

      const testId = created.testId;

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId, marks: 4 })
        .expect(201);

      const { body: placements } = await request(app.getHttpServer())
        .get(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(placements[0].negativeMarkPercent).toBeNull();
      expect(Number(placements[0].effectiveNegativeMarkPercent)).toBe(25);
    });

    it('a placement-level negativeMarkPercent overrides the test default', async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);

      const { body: created } = await request(app.getHttpServer())
        .post('/assessment/tests')
        .set(...authHeader(app, admin))
        .send({ title: 'Override test', negativeMarkPercent: 25 })
        .expect(201);

      const testId = created.testId;

      await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId, marks: 4, negativeMarkPercent: 50 })
        .expect(201);

      const { body: placements } = await request(app.getHttpServer())
        .get(`/assessment/tests/${testId}/questions`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(Number(placements[0].negativeMarkPercent)).toBe(50);
      expect(Number(placements[0].effectiveNegativeMarkPercent)).toBe(50);
    });

    it('changing marks on a placement does not touch a submitted attempt score', async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const testId = await createTest(database, admin.userId);
      const placementId = await placeQuestion(database, testId, questionId, {
        marks: '5',
      });

      const attemptId = randomUUID();
      await database.db.insert(assessmentAttempts).values({
        attemptId,
        testId,
        userId: student.userId,
        status: 'GRADED' as never,
        expiresAt: new Date('2026-02-01'),
        submittedAt: new Date('2026-01-15'),
        finalScore: '5.00',
        maxScore: '5.00',
      });

      await request(app.getHttpServer())
        .patch(`/assessment/tests/${testId}/questions/${placementId}`)
        .set(...authHeader(app, admin))
        .send({ marks: 10 })
        .expect(200);

      const [attempt] = await database.db
        .select()
        .from(assessmentAttempts)
        .where(eq(assessmentAttempts.attemptId, attemptId));

      expect(attempt).toBeDefined();
      expect(Number(attempt.finalScore)).toBe(5);
    });

    it('marks of zero are rejected with 400', async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);

      const { body: created } = await request(app.getHttpServer())
        .post('/assessment/tests')
        .set(...authHeader(app, admin))
        .send({ title: 'Marks validation test' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/tests/${created.testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId, marks: 0 })
        .expect(400);
    });

    it('negative marks are rejected with 400', async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);

      const { body: created } = await request(app.getHttpServer())
        .post('/assessment/tests')
        .set(...authHeader(app, admin))
        .send({ title: 'Negative marks test' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/tests/${created.testId}/questions`)
        .set(...authHeader(app, admin))
        .send({ questionId, marks: -1 })
        .expect(400);
    });
  });
});
