import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';

import {
  assessmentAttemptAnswers,
  assessmentAttempts,
  assessmentQuestions,
  assessmentTestQuestions,
  assessmentTests,
} from '../src/database/schema';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';
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
} from './support/assessment-factories';

describe('observed difficulty calibration (ticket 39)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
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
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, admin.userId);
  });

  async function recalibrate(expectedStatus = 200) {
    const { body } = await request(app.getHttpServer())
      .post('/assessment/practice/calibration/recalibrate')
      .set(...authHeader(app, admin))
      .expect(expectedStatus);
    return body;
  }

  async function divergent(threshold?: number) {
    const url = threshold !== undefined
      ? `/assessment/practice/calibration/divergent?threshold=${threshold}`
      : '/assessment/practice/calibration/divergent';

    const { body } = await request(app.getHttpServer())
      .get(url)
      .set(...authHeader(app, admin))
      .expect(200);
    return body as { questionId: string; authoredDifficulty: number; observedDifficulty: number; divergence: number }[];
  }

  async function seedAnswers(
    questionId: string,
    total: number,
    correctCount: number,
  ) {
    const testId = await createTest(database, admin.userId, {
      publishedAt: clock.now(),
      durationMinutes: 120,
      maxAttempts: 1,
    });
    const placementId = await placeQuestion(database, testId, questionId);

    for (let i = 0; i < total; i += 1) {
      const learner = await createUser(database, 'LEARNER');
      const isCorrect = i < correctCount;

      const attemptId = randomUUID();
      await database.db.insert(assessmentAttempts).values({
        attemptId,
        testId,
        userId: learner.userId,
        attemptNo: 1,
        status: 'GRADED',
        startedAt: clock.now(),
        expiresAt: new Date(clock.now().getTime() + 7200000),
        submittedAt: clock.now(),
        gradedAt: clock.now(),
        maxScore: '1.00',
        provisionalScore: isCorrect ? '1.00' : '0.00',
        finalScore: isCorrect ? '1.00' : '0.00',
        pendingMarks: '0',
        correctCount: isCorrect ? 1 : 0,
        wrongCount: isCorrect ? 0 : 1,
        skippedCount: 0,
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });

      await database.db.insert(assessmentAttemptAnswers).values({
        answerId: randomUUID(),
        attemptId,
        placementId,
        questionId,
        questionVersion: 1,
        response: isCorrect ? 'a' : 'b',
        isSkipped: false,
        isCorrect,
        awardedMarks: isCorrect ? '1.00' : '0.00',
        status: 'AUTO_SCORED',
        elapsedSeconds: 10,
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });
    }
  }

  it('observed difficulty is derived from outcomes and updated by a scheduled job', async () => {
    const questionId = await createQuestion(database, taxonomy, admin.userId, {
      difficulty: 1,
    });

    await seedAnswers(questionId, 15, 9);

    await recalibrate();

    const [row] = await database.db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.questionId, questionId))
      .limit(1);

    expect(row.observedDifficulty).not.toBeNull();
    expect(row.observedAttemptCount).toBe(15);
    const observed = Number(row.observedDifficulty);
    expect(observed).toBeGreaterThan(1);
    expect(observed).toBeLessThan(3);
  });

  it('a question below the attempt threshold reports no observed value', async () => {
    const questionId = await createQuestion(database, taxonomy, admin.userId, {
      difficulty: 1,
    });

    await seedAnswers(questionId, 5, 2);

    await recalibrate();

    const [row] = await database.db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.questionId, questionId))
      .limit(1);

    expect(row.observedDifficulty).toBeNull();
    expect(row.observedAttemptCount).toBe(5);
  });

  it('an author cannot set or overwrite the observed value through any interface', async () => {
    const questionId = await createQuestion(database, taxonomy, admin.userId, {
      difficulty: 2,
    });

    await request(app.getHttpServer())
      .patch(`/assessment/questions/${questionId}/tags`)
      .set(...authHeader(app, admin))
      .send({ observedDifficulty: 1 })
      .expect(400);

    const [row] = await database.db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.questionId, questionId))
      .limit(1);

    expect(row.observedDifficulty).toBeNull();
  });

  it('questions whose observed difficulty diverges from authored are discoverable', async () => {
    const easyQuestion = await createQuestion(database, taxonomy, admin.userId, {
      difficulty: 1,
    });

    await seedAnswers(easyQuestion, 15, 0);

    await recalibrate();

    const results = await divergent(0.5);

    const found = results.find((r) => r.questionId === easyQuestion);
    expect(found).toBeDefined();
    expect(found?.divergence).toBeGreaterThan(0.5);
    expect(found?.authoredDifficulty).toBe(1);
  });

  it('recalibration does not alter the score of any submitted attempt', async () => {
    const questionId = await createQuestion(database, taxonomy, admin.userId, {
      difficulty: 1,
    });

    const student = await createUser(database, 'LEARNER');
    const testId = await createTest(database, admin.userId, {
      publishedAt: clock.now(),
      durationMinutes: 120,
    });
    const placementId = await placeQuestion(database, testId, questionId, {
      marks: '4',
    });

    const mainAttemptId = randomUUID();
    await database.db.insert(assessmentAttempts).values({
      attemptId: mainAttemptId,
      testId,
      userId: student.userId,
      attemptNo: 1,
      status: 'GRADED',
      startedAt: clock.now(),
      expiresAt: new Date(clock.now().getTime() + 7200000),
      submittedAt: clock.now(),
      gradedAt: clock.now(),
      maxScore: '4.00',
      provisionalScore: '4.00',
      finalScore: '4.00',
      pendingMarks: '0',
      correctCount: 1,
      wrongCount: 0,
      skippedCount: 0,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    await database.db.insert(assessmentAttemptAnswers).values({
      answerId: randomUUID(),
      attemptId: mainAttemptId,
      placementId,
      questionId,
      questionVersion: 1,
      response: 'a',
      isSkipped: false,
      isCorrect: true,
      awardedMarks: '4.00',
      status: 'AUTO_SCORED',
      elapsedSeconds: 30,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    await seedAnswers(questionId, 14, 0);

    await recalibrate();

    const [updatedAttempt] = await database.db
      .select()
      .from(assessmentAttempts)
      .where(eq(assessmentAttempts.attemptId, mainAttemptId))
      .limit(1);

    expect(Number(updatedAttempt.finalScore)).toBe(4);
    expect(Number(updatedAttempt.provisionalScore)).toBe(4);
    expect(updatedAttempt.correctCount).toBe(1);

    const [updatedAnswer] = await database.db
      .select()
      .from(assessmentAttemptAnswers)
      .where(eq(assessmentAttemptAnswers.attemptId, mainAttemptId))
      .limit(1);

    expect(Number(updatedAnswer.awardedMarks)).toBe(4);
    expect(updatedAnswer.isCorrect).toBe(true);
  });

  it('scheduled job fires when clock advances past repeat interval', async () => {
    const questionId = await createQuestion(database, taxonomy, admin.userId, {
      difficulty: 1,
    });

    await seedAnswers(questionId, 12, 6);

    const jobQueue = app.get<InlineJobQueue>(JOB_QUEUE, { strict: false });

    clock.advance(61 * 60 * 1000);
    await jobQueue.tick();

    const [row] = await database.db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.questionId, questionId))
      .limit(1);

    expect(row.observedDifficulty).not.toBeNull();
    expect(row.observedAttemptCount).toBe(12);
  });
});
