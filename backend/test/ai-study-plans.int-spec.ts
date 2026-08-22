import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';

import { MODEL_PROVIDER } from '../src/ai/model-provider';
import { STUDY_PLAN_REGEN_JOB } from '../src/ai/study-plan.service';
import {
  aiStudyPlans,
  assessmentWeakTopics,
  reviewItems,
  studentProfiles,
} from '../src/database/schema';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import {
  createBatch,
  createUser,
  enrol,
} from './support/factories';
import { makeModelProvider, RecordingModelProvider } from './support/ai-factories';

const VALID_PLAN_OUTPUT = {
  summary: 'Focus on your weak topics today and complete your spaced-repetition reviews.',
  items: [
    {
      kind: 'REVIEW',
      title: 'Spaced-repetition review session',
      durationMinutes: 20,
      rationale: 'Keep knowledge fresh by completing due review items.',
    },
    {
      kind: 'WEAK_TOPIC',
      title: 'Practice weak topic area',
      durationMinutes: 30,
      rationale: 'Strengthen areas where accuracy is below target.',
    },
  ],
};

describe('ai study plans (ticket 22)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let provider: RecordingModelProvider;
  let queue: InlineJobQueue;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
    provider = makeModelProvider();
    app = await createTestApp(database, clock, [
      { token: MODEL_PROVIDER, value: provider },
    ]);
    queue = app.get<InlineJobQueue>(JOB_QUEUE);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    provider.calls = [];
    provider.failNext = false;
    provider.structuredFor = () => VALID_PLAN_OUTPUT;
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
  });

  it('returns 404 when no plan exists for the student', async () => {
    await request(app.getHttpServer())
      .get('/ai/study-plans/mine')
      .set(...authHeader(app, student))
      .expect(404);
  });

  it('a student can update their available study time', async () => {
    const { body } = await request(app.getHttpServer())
      .put('/ai/study-plans/preferences')
      .set(...authHeader(app, student))
      .send({ availableMinutesPerDay: 90 })
      .expect(200);

    expect(body.availableMinutesPerDay).toBe(90);
  });

  it('rejects a preference update with invalid available time', async () => {
    await request(app.getHttpServer())
      .put('/ai/study-plans/preferences')
      .set(...authHeader(app, student))
      .send({ availableMinutesPerDay: 5 })
      .expect(400);
  });

  it('rejects a preference update with excessive available time', async () => {
    await request(app.getHttpServer())
      .put('/ai/study-plans/preferences')
      .set(...authHeader(app, student))
      .send({ availableMinutesPerDay: 500 })
      .expect(400);
  });

  it('rejects a preference update with unknown fields', async () => {
    await request(app.getHttpServer())
      .put('/ai/study-plans/preferences')
      .set(...authHeader(app, student))
      .send({ availableMinutesPerDay: 60, unknownField: true })
      .expect(400);
  });

  it('a new student with no history still gets a plan after the job runs', async () => {
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const { body } = await request(app.getHttpServer())
      .get('/ai/study-plans/mine')
      .set(...authHeader(app, student))
      .expect(200);

    expect(body.planId).toBeDefined();
    expect(body.summary).toBeDefined();
    expect(body.items).toBeDefined();
    expect(body.generatedAt).toBeDefined();
  });

  it('records that zero review items were due for a new student', async () => {
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const [plan] = await database.db
      .select()
      .from(aiStudyPlans)
      .where(eq(aiStudyPlans.userId, student.userId));

    expect(plan.inputs.reviewItemsDue).toBe(0);
  });

  it('records the correct number of due review items in plan inputs', async () => {
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);

    const now = clock.now();
    await database.db.insert(reviewItems).values([
      {
        userId: student.userId,
        questionId: 'q-001',
        source: 'BOOKMARKED_QUESTION',
        intervalDays: 1,
        easeFactor: '2.5',
        dueAt: new Date(now.getTime() - 1000),
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: student.userId,
        questionId: 'q-002',
        source: 'BOOKMARKED_QUESTION',
        intervalDays: 1,
        easeFactor: '2.5',
        dueAt: new Date(now.getTime() - 2000),
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const [plan] = await database.db
      .select()
      .from(aiStudyPlans)
      .where(eq(aiStudyPlans.userId, student.userId));

    expect(plan.inputs.reviewItemsDue).toBe(2);
  });

  it('records the number of weak topics in plan inputs', async () => {
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);

    const now = clock.now();
    await database.db.insert(assessmentWeakTopics).values({
      userId: student.userId,
      topicId: 'topic-algebra',
      attempted: 10,
      correct: 3,
      accuracy: '0.3000',
      computedAt: now,
    });

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const [plan] = await database.db
      .select()
      .from(aiStudyPlans)
      .where(eq(aiStudyPlans.userId, student.userId));

    expect(plan.inputs.weakTopicCount).toBe(1);
  });

  it('uses the declared available time in plan inputs', async () => {
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);

    await request(app.getHttpServer())
      .put('/ai/study-plans/preferences')
      .set(...authHeader(app, student))
      .send({ availableMinutesPerDay: 120 })
      .expect(200);

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const [plan] = await database.db
      .select()
      .from(aiStudyPlans)
      .where(eq(aiStudyPlans.userId, student.userId));

    expect(plan.inputs.availableMinutesPerDay).toBe(120);
  });

  it('uses the default 60-minute available time when no preference is set', async () => {
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const [plan] = await database.db
      .select()
      .from(aiStudyPlans)
      .where(eq(aiStudyPlans.userId, student.userId));

    expect(plan.inputs.availableMinutesPerDay).toBe(60);
  });

  it('records the student goal from their profile', async () => {
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);

    const now = clock.now();
    await database.db.insert(studentProfiles).values({
      userId: student.userId,
      goalKey: 'JEE_ADVANCED',
      goalSetAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const [plan] = await database.db
      .select()
      .from(aiStudyPlans)
      .where(eq(aiStudyPlans.userId, student.userId));

    expect(plan.inputs.goalKey).toBe('JEE_ADVANCED');
  });

  it('does not generate a plan for a student with no active enrollment', async () => {
    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const plans = await database.db
      .select()
      .from(aiStudyPlans)
      .where(eq(aiStudyPlans.userId, student.userId));

    expect(plans).toHaveLength(0);
  });

  it('calls the model with the study-plan feature label', async () => {
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].feature).toBe('study-plan');
  });

  it('student cannot access another student plan', async () => {
    const otherStudent = await createUser(database, 'LEARNER');
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, otherStudent.userId);

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    await request(app.getHttpServer())
      .get('/ai/study-plans/mine')
      .set(...authHeader(app, student))
      .expect(404);
  });
});
