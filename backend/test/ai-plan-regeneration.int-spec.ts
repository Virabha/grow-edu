import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { and, eq, isNull, isNotNull } from 'drizzle-orm';

import { MODEL_PROVIDER } from '../src/ai/model-provider';
import { STUDY_PLAN_REGEN_JOB } from '../src/ai/study-plan.service';
import { aiStudyPlans } from '../src/database/schema';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createBatch, createUser, enrol } from './support/factories';
import { makeModelProvider, RecordingModelProvider } from './support/ai-factories';

const VALID_PLAN_OUTPUT = {
  summary: 'Work through your scheduled reviews and weak topic practice.',
  items: [
    {
      kind: 'REVIEW',
      title: 'Daily review',
      durationMinutes: 30,
      rationale: 'Maintain retention of previously learned material.',
    },
  ],
};

describe('ai plan regeneration (ticket 23)', () => {
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

  it('a student is refused when attempting to force regeneration', async () => {
    await request(app.getHttpServer())
      .post('/ai/study-plans/regenerate')
      .set(...authHeader(app, student))
      .expect(403);
  });

  it('an instructor is refused when attempting to force regeneration', async () => {
    const instructor = await createUser(database, 'INSTRUCTOR');
    await request(app.getHttpServer())
      .post('/ai/study-plans/regenerate')
      .set(...authHeader(app, instructor))
      .expect(403);
  });

  it('a platform admin can trigger regeneration', async () => {
    await request(app.getHttpServer())
      .post('/ai/study-plans/regenerate')
      .set(...authHeader(app, admin))
      .expect(201);
  });

  it('a regeneration failure leaves the previous plan in place', async () => {
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const [originalPlan] = await database.db
      .select()
      .from(aiStudyPlans)
      .where(
        and(eq(aiStudyPlans.userId, student.userId), isNull(aiStudyPlans.supersededAt)),
      );

    expect(originalPlan).toBeDefined();
    const originalPlanId = originalPlan.planId;

    provider.failNext = true;

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const [stillActivePlan] = await database.db
      .select()
      .from(aiStudyPlans)
      .where(
        and(eq(aiStudyPlans.userId, student.userId), isNull(aiStudyPlans.supersededAt)),
      );

    expect(stillActivePlan).toBeDefined();
    expect(stillActivePlan.planId).toBe(originalPlanId);
  });

  it('a successful regeneration supersedes the previous plan', async () => {
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const [firstPlan] = await database.db
      .select()
      .from(aiStudyPlans)
      .where(
        and(eq(aiStudyPlans.userId, student.userId), isNull(aiStudyPlans.supersededAt)),
      );

    clock.advance(1000);

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const [newPlan] = await database.db
      .select()
      .from(aiStudyPlans)
      .where(
        and(eq(aiStudyPlans.userId, student.userId), isNull(aiStudyPlans.supersededAt)),
      );

    expect(newPlan.planId).not.toBe(firstPlan.planId);

    const [oldPlan] = await database.db
      .select()
      .from(aiStudyPlans)
      .where(
        and(eq(aiStudyPlans.userId, student.userId), isNotNull(aiStudyPlans.supersededAt)),
      );

    expect(oldPlan).toBeDefined();
    expect(oldPlan.planId).toBe(firstPlan.planId);
  });

  it('only one plan per student is active at a time after repeated regeneration', async () => {
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);

    for (let i = 0; i < 3; i += 1) {
      clock.advance(1000);
      await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);
    }

    const activePlans = await database.db
      .select()
      .from(aiStudyPlans)
      .where(
        and(eq(aiStudyPlans.userId, student.userId), isNull(aiStudyPlans.supersededAt)),
      );

    expect(activePlans).toHaveLength(1);
  });

  it('regeneration of one student does not affect another student plan', async () => {
    const otherStudent = await createUser(database, 'LEARNER');
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);
    await enrol(database, batchId, otherStudent.userId);

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const studentPlans = await database.db
      .select()
      .from(aiStudyPlans)
      .where(
        and(eq(aiStudyPlans.userId, student.userId), isNull(aiStudyPlans.supersededAt)),
      );

    const otherPlans = await database.db
      .select()
      .from(aiStudyPlans)
      .where(
        and(eq(aiStudyPlans.userId, otherStudent.userId), isNull(aiStudyPlans.supersededAt)),
      );

    expect(studentPlans).toHaveLength(1);
    expect(otherPlans).toHaveLength(1);
  });

  it('a plan generated for a student who fell behind records more review items due', async () => {
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const [firstPlan] = await database.db
      .select()
      .from(aiStudyPlans)
      .where(
        and(eq(aiStudyPlans.userId, student.userId), isNull(aiStudyPlans.supersededAt)),
      );

    expect(firstPlan.inputs.reviewItemsDue).toBe(0);

    const now = clock.now();
    const { reviewItems } = await import('../src/database/schema');
    await database.db.insert(reviewItems).values({
      userId: student.userId,
      questionId: 'q-overdue',
      source: 'BOOKMARKED_QUESTION',
      intervalDays: 1,
      easeFactor: '2.5',
      dueAt: new Date(now.getTime() - 1000),
      createdAt: now,
      updatedAt: now,
    });

    clock.advance(1000);
    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const [updatedPlan] = await database.db
      .select()
      .from(aiStudyPlans)
      .where(
        and(eq(aiStudyPlans.userId, student.userId), isNull(aiStudyPlans.supersededAt)),
      );

    expect(updatedPlan.inputs.reviewItemsDue).toBe(1);
    expect(updatedPlan.planId).not.toBe(firstPlan.planId);
  });
});
