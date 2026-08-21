import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';

import { studentProfiles } from '../src/database/schema';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import {
  Taxonomy,
  answerQuestion,
  createQuestion,
  createTaxonomy,
  openAttempt,
  seedDifficultyScale,
  submitAttempt,
} from './support/assessment-factories';

describe('diagnostic placement test', () => {
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

  async function setGoal(goalKey: string) {
    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey })
      .expect(200);
  }

  async function generateDiagnostic(count: number): Promise<string> {
    const questionIds: string[] = [];
    for (let index = 0; index < count; index += 1) {
      questionIds.push(
        await createQuestion(database, taxonomy, admin.userId, {
          type: 'SINGLE_CORRECT',
          difficulty: 1,
        }),
      );
    }

    const generated = await request(app.getHttpServer())
      .post('/assessment/practice/generate')
      .set(...authHeader(app, admin))
      .send({
        topicCounts: [{ topicId: taxonomy.topicId, count }],
        difficultyCounts: [{ ordinal: 1, count }],
      })
      .expect(201);

    return generated.body.testId;
  }

  async function registerDiagnostic(goalKey: string, testId: string) {
    await request(app.getHttpServer())
      .put('/settings/discovery')
      .set(...authHeader(app, admin))
      .send({ diagnosticTests: `${goalKey}|${testId}` })
      .expect(200);
  }

  async function sit(testId: string, correctCount: number) {
    const attempt = await openAttempt<{
      attemptId: string;
      questions: { placementId: string }[];
    }>(app, testId, student);

    attempt.questions.forEach(() => undefined);
    for (const [index, question] of attempt.questions.entries()) {
      await answerQuestion(
        app,
        attempt.attemptId,
        question.placementId,
        index < correctCount ? 'a' : 'b',
        student,
      );
    }
    await submitAttempt(app, attempt.attemptId, student);
    return attempt.attemptId;
  }

  it('is assembled by the existing criteria generation, not a new mechanism', async () => {
    const testId = await generateDiagnostic(4);
    await setGoal('JEE');
    await registerDiagnostic('JEE', testId);

    const offered = await request(app.getHttpServer())
      .get('/diagnostic/test')
      .set(...authHeader(app, student))
      .expect(200);

    expect(offered.body.testId).toBe(testId);
    expect(offered.body.goalKey).toBe('JEE');
  });

  it('produces a level and what it means, not a leaderboard position', async () => {
    const testId = await generateDiagnostic(4);
    await setGoal('JEE');
    await registerDiagnostic('JEE', testId);

    const attemptId = await sit(testId, 4);

    const result = await request(app.getHttpServer())
      .post('/diagnostic/results')
      .set(...authHeader(app, student))
      .send({ attemptId })
      .expect(201);

    expect(result.body.level).toBe('ADVANCED');
    expect(typeof result.body.meaning).toBe('string');
    expect(result.body).not.toHaveProperty('scoredPercent');
    expect(result.body).not.toHaveProperty('rank');
    expect(result.body).not.toHaveProperty('finalScore');
  });

  it('shows the student their level and what it means, not a raw mark', async () => {
    const testId = await generateDiagnostic(4);
    await setGoal('JEE');
    await registerDiagnostic('JEE', testId);
    const attemptId = await sit(testId, 1);

    await request(app.getHttpServer())
      .post('/diagnostic/results')
      .set(...authHeader(app, student))
      .send({ attemptId })
      .expect(201);

    const mine = await request(app.getHttpServer())
      .get('/diagnostic/me')
      .set(...authHeader(app, student))
      .expect(200);

    expect(mine.body.level).toBe('FOUNDATION');
    expect(mine.body.meaning).toContain('fundamentals');
    expect(mine.body).not.toHaveProperty('scoredPercent');
  });

  it('stores the level against the account so it can drive recommendations', async () => {
    const testId = await generateDiagnostic(4);
    await setGoal('JEE');
    await registerDiagnostic('JEE', testId);
    const attemptId = await sit(testId, 4);

    await request(app.getHttpServer())
      .post('/diagnostic/results')
      .set(...authHeader(app, student))
      .send({ attemptId })
      .expect(201);

    const [profile] = await database.db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, student.userId));

    expect(profile.level).toBe('ADVANCED');
    expect(profile.goalKey).toBe('JEE');

    await request(app.getHttpServer())
      .get('/me/recommendations')
      .set(...authHeader(app, student))
      .expect(200);
  });

  it('replaces the level on a retake rather than appending a second one', async () => {
    const testId = await generateDiagnostic(4);
    await setGoal('JEE');
    await registerDiagnostic('JEE', testId);

    const first = await sit(testId, 1);
    await request(app.getHttpServer())
      .post('/diagnostic/results')
      .set(...authHeader(app, student))
      .send({ attemptId: first })
      .expect(201);

    const before = await request(app.getHttpServer())
      .get('/diagnostic/me')
      .set(...authHeader(app, student))
      .expect(200);
    expect(before.body.level).toBe('FOUNDATION');

    const second = await sit(testId, 4);
    await request(app.getHttpServer())
      .post('/diagnostic/results')
      .set(...authHeader(app, student))
      .send({ attemptId: second })
      .expect(201);

    const after = await request(app.getHttpServer())
      .get('/diagnostic/me')
      .set(...authHeader(app, student))
      .expect(200);
    expect(after.body.level).toBe('ADVANCED');

    const [profile] = await database.db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, student.userId));
    expect(profile.level).toBe('ADVANCED');
  });

  it('refuses an attempt that is not the placement test for the goal', async () => {
    const diagnostic = await generateDiagnostic(4);
    const other = await generateDiagnostic(4);
    await setGoal('JEE');
    await registerDiagnostic('JEE', diagnostic);

    const strayAttempt = await sit(other, 2);

    await request(app.getHttpServer())
      .post('/diagnostic/results')
      .set(...authHeader(app, student))
      .send({ attemptId: strayAttempt })
      .expect(400);
  });

  it('reports no level for a student who has not sat it', async () => {
    const mine = await request(app.getHttpServer())
      .get('/diagnostic/me')
      .set(...authHeader(app, student))
      .expect(200);
    expect(mine.body.level).toBeNull();
  });
});
