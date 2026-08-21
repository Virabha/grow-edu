import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { and, eq, inArray } from 'drizzle-orm';

import {
  assessmentQuestions,
  assessmentTestQuestions,
  assessmentTests,
  assessmentWeakTopics,
} from '../src/database/schema';
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
} from './support/assessment-factories';

describe('daily practice (ticket 18)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let student1: TestActor;
  let student2: TestActor;
  let taxonomyA: Taxonomy;
  let taxonomyB: Taxonomy;
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
    student1 = await createUser(database, 'LEARNER');
    student2 = await createUser(database, 'LEARNER');
    await seedDifficultyScale(database);
    taxonomyA = await createTaxonomy(database, admin.userId);
    taxonomyB = await createTaxonomy(database, admin.userId);
    batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student1.userId);
    await enrol(database, batchId, student2.userId);
  });

  async function seedBatchTopics() {
    const testId = await createTest(database, admin.userId, {
      batchId,
      publishedAt: clock.now(),
      durationMinutes: 60,
    });
    for (let i = 0; i < 12; i += 1) {
      const q = await createQuestion(database, taxonomyA, admin.userId, {
        difficulty: 1,
      });
      await placeQuestion(database, testId, q, { order: i + 1 });
    }
    for (let i = 0; i < 12; i += 1) {
      const q = await createQuestion(database, taxonomyB, admin.userId, {
        difficulty: 1,
      });
      await placeQuestion(database, testId, q, { order: 100 + i });
    }
  }

  async function getDaily(student: TestActor, expectedStatus = 200) {
    const { body } = await request(app.getHttpServer())
      .get(`/assessment/practice/daily?batchId=${batchId}`)
      .set(...authHeader(app, student))
      .expect(expectedStatus);
    return body;
  }

  async function topicCountsInTest(testId: string) {
    const placements = await database.db
      .select()
      .from(assessmentTestQuestions)
      .where(eq(assessmentTestQuestions.testId, testId));

    const questionIds = placements.map((p) => p.questionId);
    if (questionIds.length === 0) return { a: 0, b: 0 };

    const questions = await database.db
      .select()
      .from(assessmentQuestions)
      .where(inArray(assessmentQuestions.questionId, questionIds));

    return {
      a: questions.filter((q) => q.topicId === taxonomyA.topicId).length,
      b: questions.filter((q) => q.topicId === taxonomyB.topicId).length,
    };
  }

  it('two students in the same batch receive different sets on the same day', async () => {
    await seedBatchTopics();

    await database.db.insert(assessmentWeakTopics).values({
      userId: student1.userId,
      topicId: taxonomyA.topicId,
      attempted: 10,
      correct: 2,
      accuracy: '0.2000',
      computedAt: clock.now(),
    });

    const [set1, set2] = await Promise.all([
      getDaily(student1),
      getDaily(student2),
    ]);

    expect(set1.testId).not.toBe(set2.testId);

    const counts1 = await topicCountsInTest(set1.testId);
    const counts2 = await topicCountsInTest(set2.testId);

    expect(counts1.a).toBeGreaterThan(counts2.a);
  });

  it('the set is drawn from the topics the batch is currently covering', async () => {
    await seedBatchTopics();

    const taxonomyC = await createTaxonomy(database, admin.userId);
    for (let i = 0; i < 5; i += 1) {
      await createQuestion(database, taxonomyC, admin.userId, { difficulty: 1 });
    }

    const result = await getDaily(student1);
    const questions = await database.db
      .select()
      .from(assessmentTestQuestions)
      .where(eq(assessmentTestQuestions.testId, result.testId));

    const questionIds = questions.map((q) => q.questionId);
    const rows = await database.db
      .select()
      .from(assessmentQuestions)
      .where(inArray(assessmentQuestions.questionId, questionIds));

    const topicCIds = rows.filter(
      (q) => q.topicId === taxonomyC.topicId,
    ).length;
    expect(topicCIds).toBe(0);
  });

  it('a student weak in a topic receives more of it than a student who is not', async () => {
    await seedBatchTopics();

    await database.db.insert(assessmentWeakTopics).values({
      userId: student1.userId,
      topicId: taxonomyA.topicId,
      attempted: 10,
      correct: 2,
      accuracy: '0.2000',
      computedAt: clock.now(),
    });

    const [set1, set2] = await Promise.all([
      getDaily(student1),
      getDaily(student2),
    ]);

    const counts1 = await topicCountsInTest(set1.testId);
    const counts2 = await topicCountsInTest(set2.testId);

    expect(counts1.a).toBeGreaterThan(counts2.a);
  });

  it('requesting the set twice on the same day returns the same set', async () => {
    await seedBatchTopics();

    const first = await getDaily(student1);
    const second = await getDaily(student1);

    expect(first.setId).toBe(second.setId);
    expect(first.testId).toBe(second.testId);
    expect(second.isNew).toBe(false);
  });

  it('a student with no attempt history still receives a set', async () => {
    await seedBatchTopics();

    const result = await getDaily(student1);

    expect(result.testId).toBeDefined();
    expect(result.setId).toBeDefined();

    const placements = await database.db
      .select()
      .from(assessmentTestQuestions)
      .where(eq(assessmentTestQuestions.testId, result.testId));

    expect(placements.length).toBeGreaterThan(0);
  });

  it('requesting on a different day generates a new set', async () => {
    await seedBatchTopics();

    const first = await getDaily(student1);
    expect(first.isNew).toBe(true);

    clock.set('2026-08-22T09:00:00.000Z');
    const second = await getDaily(student1);

    expect(second.isNew).toBe(true);
    expect(second.setId).not.toBe(first.setId);
  });
});
