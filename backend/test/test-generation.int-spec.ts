import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { and, eq, inArray } from 'drizzle-orm';

import {
  assessmentQuestions,
  assessmentTestQuestions,
  assessmentQuestionsServed,
} from '../src/database/schema';
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
  createQuestionGroup,
  createTaxonomy,
  seedDifficultyScale,
  Taxonomy,
} from './support/assessment-factories';

describe('test generation (ticket 17)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let student: TestActor;
  let taxonomy: Taxonomy;
  let taxonomy2: Taxonomy;

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
    taxonomy2 = await createTaxonomy(database, admin.userId);
  });

  async function generate(
    body: Record<string, unknown>,
    actor: TestActor = admin,
    expectedStatus = 201,
  ) {
    const { body: responseBody } = await request(app.getHttpServer())
      .post('/assessment/practice/generate')
      .set(...authHeader(app, actor))
      .send(body)
      .expect(expectedStatus);
    return responseBody;
  }

  async function questionsInTest(testId: string) {
    const placements = await database.db
      .select()
      .from(assessmentTestQuestions)
      .where(eq(assessmentTestQuestions.testId, testId));

    const questionIds = placements.map((p) => p.questionId);
    if (questionIds.length === 0) return [];

    return database.db
      .select()
      .from(assessmentQuestions)
      .where(inArray(assessmentQuestions.questionId, questionIds));
  }

  it('never serves part of a question group', async () => {
    const groupId = await createQuestionGroup(database, admin.userId);
    for (let i = 0; i < 4; i += 1) {
      await createQuestion(database, taxonomy, admin.userId, {
        difficulty: 1,
        groupId,
        groupOrder: i + 1,
      });
    }
    for (let i = 0; i < 3; i += 1) {
      await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });
    }

    const result = await generate({
      topicCounts: [{ topicId: taxonomy.topicId, count: 3 }],
      difficultyCounts: [{ ordinal: 1, count: 3 }],
    });

    const chosen = await questionsInTest(result.testId as string);
    expect(chosen).toHaveLength(3);
    for (const question of chosen) {
      expect(question.groupId).toBeNull();
    }
  });

  it('reports a shortage rather than splitting a group to fill the count', async () => {
    const groupId = await createQuestionGroup(database, admin.userId);
    for (let i = 0; i < 5; i += 1) {
      await createQuestion(database, taxonomy, admin.userId, {
        difficulty: 1,
        groupId,
        groupOrder: i + 1,
      });
    }
    await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });

    const body = await generate(
      {
        topicCounts: [{ topicId: taxonomy.topicId, count: 3 }],
        difficultyCounts: [{ ordinal: 1, count: 3 }],
      },
      admin,
      422,
    );

    expect(body.shortages).toBeDefined();
  });

  it('honours per-topic counts exactly', async () => {
    for (let i = 0; i < 5; i += 1) {
      await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });
    }
    for (let i = 0; i < 5; i += 1) {
      await createQuestion(database, taxonomy2, admin.userId, { difficulty: 1 });
    }

    const result = await generate({
      topicCounts: [
        { topicId: taxonomy.topicId, count: 3 },
        { topicId: taxonomy2.topicId, count: 2 },
      ],
      difficultyCounts: [{ ordinal: 1, count: 5 }],
    });

    expect(result.testId).toBeDefined();
    expect(result.questionCount).toBe(5);

    const questions = await questionsInTest(result.testId);
    const fromTopic1 = questions.filter(
      (q) => q.topicId === taxonomy.topicId,
    ).length;
    const fromTopic2 = questions.filter(
      (q) => q.topicId === taxonomy2.topicId,
    ).length;

    expect(fromTopic1).toBe(3);
    expect(fromTopic2).toBe(2);
  });

  it('honours per-difficulty-band counts exactly', async () => {
    for (let i = 0; i < 5; i += 1) {
      await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });
    }
    for (let i = 0; i < 5; i += 1) {
      await createQuestion(database, taxonomy, admin.userId, { difficulty: 2 });
    }
    for (let i = 0; i < 5; i += 1) {
      await createQuestion(database, taxonomy, admin.userId, { difficulty: 3 });
    }

    const result = await generate({
      topicCounts: [{ topicId: taxonomy.topicId, count: 6 }],
      difficultyCounts: [
        { ordinal: 1, count: 2 },
        { ordinal: 2, count: 2 },
        { ordinal: 3, count: 2 },
      ],
    });

    expect(result.questionCount).toBe(6);

    const questions = await questionsInTest(result.testId);
    const d1 = questions.filter((q) => q.authoredDifficulty === 1).length;
    const d2 = questions.filter((q) => q.authoredDifficulty === 2).length;
    const d3 = questions.filter((q) => q.authoredDifficulty === 3).length;

    expect(d1).toBe(2);
    expect(d2).toBe(2);
    expect(d3).toBe(2);
  });

  it('fails with what was short rather than returning fewer', async () => {
    await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });
    await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });

    const result = await generate(
      {
        topicCounts: [{ topicId: taxonomy.topicId, count: 5 }],
        difficultyCounts: [{ ordinal: 1, count: 5 }],
      },
      admin,
      422,
    );

    expect(result.shortages).toBeDefined();
    expect(Array.isArray(result.shortages)).toBe(true);
    expect(result.shortages.length).toBeGreaterThan(0);

    const shortage = result.shortages[0];
    expect(shortage.topicId).toBe(taxonomy.topicId);
    expect(shortage.difficultyOrdinal).toBe(1);
    expect(shortage.needed).toBe(5);
    expect(shortage.available).toBe(2);
  });

  it('excludes retired questions', async () => {
    await createQuestion(database, taxonomy, admin.userId, {
      difficulty: 1,
      isRetired: true,
    });
    await createQuestion(database, taxonomy, admin.userId, {
      difficulty: 1,
      isRetired: true,
    });
    const active = await createQuestion(database, taxonomy, admin.userId, {
      difficulty: 1,
    });

    const result = await generate({
      topicCounts: [{ topicId: taxonomy.topicId, count: 1 }],
      difficultyCounts: [{ ordinal: 1, count: 1 }],
    });

    const questions = await questionsInTest(result.testId);
    expect(questions).toHaveLength(1);
    expect(questions[0].questionId).toBe(active);
    expect(questions[0].isRetired).toBe(false);
  });

  it('can be asked to exclude questions a given student has recently seen', async () => {
    const q1 = await createQuestion(database, taxonomy, admin.userId, {
      difficulty: 1,
    });
    const q2 = await createQuestion(database, taxonomy, admin.userId, {
      difficulty: 1,
    });
    const q3 = await createQuestion(database, taxonomy, admin.userId, {
      difficulty: 1,
    });

    await database.db.insert(assessmentQuestionsServed).values({
      userId: student.userId,
      questionId: q1,
      topicId: taxonomy.topicId,
      difficulty: 1,
      servedAt: clock.now(),
    });
    await database.db.insert(assessmentQuestionsServed).values({
      userId: student.userId,
      questionId: q2,
      topicId: taxonomy.topicId,
      difficulty: 1,
      servedAt: clock.now(),
    });

    const result = await generate({
      topicCounts: [{ topicId: taxonomy.topicId, count: 1 }],
      difficultyCounts: [{ ordinal: 1, count: 1 }],
      excludeStudentId: student.userId,
    });

    const questions = await questionsInTest(result.testId);
    expect(questions).toHaveLength(1);
    expect(questions[0].questionId).toBe(q3);
  });

  it('rejects mismatched topic and difficulty totals', async () => {
    await generate(
      {
        topicCounts: [{ topicId: taxonomy.topicId, count: 5 }],
        difficultyCounts: [{ ordinal: 1, count: 3 }],
      },
      admin,
      400,
    );
  });
});
