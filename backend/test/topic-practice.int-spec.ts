import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';

import { assessmentQuestionsServed, assessmentQuestions } from '../src/database/schema';
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
  seedDifficultyScale,
  Taxonomy,
} from './support/assessment-factories';

describe('topic practice – adaptive difficulty (ticket 38)', () => {
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
    clock.reset();
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, admin.userId);
  });

  async function next(actor: TestActor = student, expectedStatus = 200) {
    const { body } = await request(app.getHttpServer())
      .get(`/assessment/practice/topic/${taxonomy.topicId}/next`)
      .set(...authHeader(app, actor))
      .expect(expectedStatus);
    return body;
  }

  async function answer(
    servedId: string,
    wasCorrect: boolean,
    actor: TestActor = student,
  ) {
    await request(app.getHttpServer())
      .patch(`/assessment/practice/served/${servedId}`)
      .set(...authHeader(app, actor))
      .send({ wasCorrect })
      .expect(200);
  }

  it('a student can request successive questions indefinitely', async () => {
    const q1 = await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });
    const q2 = await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });
    const q3 = await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });

    const s1 = await next();
    const s2 = await next();
    const s3 = await next();
    const s4 = await next();
    const s5 = await next();

    expect([s1, s2, s3, s4, s5].every((s) => s.questionId !== undefined)).toBe(true);

    const questionIds = new Set([q1, q2, q3]);
    for (const s of [s1, s2, s3]) {
      expect(questionIds.has(s.questionId)).toBe(true);
    }
  });

  it('a run of correct answers raises the difficulty of what is served next', async () => {
    for (let i = 0; i < 5; i += 1) {
      await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });
    }
    for (let i = 0; i < 5; i += 1) {
      await createQuestion(database, taxonomy, admin.userId, { difficulty: 2 });
    }

    const s1 = await next();
    expect(s1.difficulty).toBe(1);
    await answer(s1.servedId, true);

    const s2 = await next();
    await answer(s2.servedId, true);

    const s3 = await next();
    await answer(s3.servedId, true);

    const s4 = await next();
    expect(s4.difficulty).toBe(2);
  });

  it('a run of wrong answers lowers the difficulty', async () => {
    for (let i = 0; i < 5; i += 1) {
      await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });
    }
    for (let i = 0; i < 5; i += 1) {
      await createQuestion(database, taxonomy, admin.userId, { difficulty: 2 });
    }
    for (let i = 0; i < 5; i += 1) {
      await createQuestion(database, taxonomy, admin.userId, { difficulty: 3 });
    }

    await database.db.insert(assessmentQuestionsServed).values([
      {
        userId: student.userId,
        topicId: taxonomy.topicId,
        questionId: (await createQuestion(database, taxonomy, admin.userId, { difficulty: 2 })),
        difficulty: 2,
        wasCorrect: false,
        servedAt: new Date(clock.now().getTime() - 30000),
      },
      {
        userId: student.userId,
        topicId: taxonomy.topicId,
        questionId: (await createQuestion(database, taxonomy, admin.userId, { difficulty: 2 })),
        difficulty: 2,
        wasCorrect: false,
        servedAt: new Date(clock.now().getTime() - 20000),
      },
      {
        userId: student.userId,
        topicId: taxonomy.topicId,
        questionId: (await createQuestion(database, taxonomy, admin.userId, { difficulty: 2 })),
        difficulty: 2,
        wasCorrect: false,
        servedAt: new Date(clock.now().getTime() - 10000),
      },
    ]);

    const next1 = await next();
    expect(next1.difficulty).toBe(1);
  });

  it('questions recently served are not repeated while unseen ones remain', async () => {
    const q1 = await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });
    const q2 = await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });
    const q3 = await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });

    const s1 = await next();
    const s2 = await next();
    const s3 = await next();

    const ids = new Set([s1.questionId, s2.questionId, s3.questionId]);
    expect(ids.size).toBe(3);
    expect(ids.has(q1)).toBe(true);
    expect(ids.has(q2)).toBe(true);
    expect(ids.has(q3)).toBe(true);
  });

  it('exhausting a topic degrades to repetition rather than an error', async () => {
    await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });
    await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });

    const s1 = await next();
    const s2 = await next();
    const s3 = await next();
    const s4 = await next();

    expect(s3.questionId).toBeDefined();
    expect(s4.questionId).toBeDefined();

    const allIds = new Set([s1.questionId, s2.questionId]);
    expect(allIds.has(s3.questionId)).toBe(true);
    expect(allIds.has(s4.questionId)).toBe(true);
  });

  it('recording an outcome updates wasCorrect on the served record', async () => {
    await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });

    const s1 = await next();
    await answer(s1.servedId, true);

    const [row] = await database.db
      .select()
      .from(assessmentQuestionsServed)
      .where(eq(assessmentQuestionsServed.servedId, s1.servedId))
      .limit(1);

    expect(row.wasCorrect).toBe(true);
  });

  it('uses observed difficulty when enough attempts exist', async () => {
    for (let i = 0; i < 5; i += 1) {
      await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });
    }
    for (let i = 0; i < 5; i += 1) {
      await createQuestion(database, taxonomy, admin.userId, { difficulty: 3 });
    }

    const hardButObservedEasy = await createQuestion(database, taxonomy, admin.userId, {
      difficulty: 3,
    });

    await database.db
      .update(assessmentQuestions)
      .set({ observedDifficulty: '1.000', observedAttemptCount: 20 })
      .where(eq(assessmentQuestions.questionId, hardButObservedEasy));

    const s1 = await next();
    expect(s1.difficulty).toBe(1);
  });
});
