import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { MODEL_PROVIDER } from '../src/ai/model-provider';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { makeModelProvider, RecordingModelProvider } from './support/ai-factories';
import {
  createUser,
  createBatch,
  createSubject,
  createLesson,
  enrol,
  assignInstructor,
} from './support/factories';
import { DOUBT_DRAIN_JOB } from '../src/batches/engagement/doubt-answer.service';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { aiDoubtAnswers, aiDoubtDrafts, batchDoubts, notifications } from '../src/database/schema';
import { eq } from 'drizzle-orm';

describe('ai-escalation: escalation, drafts and unhelpful report', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let provider: RecordingModelProvider;
  let clock: TestClock;
  let queue: InlineJobQueue;

  let admin: TestActor;
  let instructor: TestActor;
  let student: TestActor;
  let batchId: string;
  let subjectId: string;
  let lessonId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
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
    provider.batches = [];
    provider.failNext = false;
    provider.structuredFor = (req) => {
      if (req.feature === 'doubt.answer') {
        return {
          answer: 'This is the AI generated answer for the student question',
          citations: [],
        };
      }
      return {
        draft: 'This is the AI generated draft reply for the instructor to review',
      };
    };

    admin = await createUser(database, 'PLATFORM_ADMIN');
    instructor = await createUser(database, 'INSTRUCTOR');
    student = await createUser(database, 'LEARNER');

    batchId = await createBatch(database, admin.userId);
    subjectId = await createSubject(database, batchId);
    lessonId = await createLesson(database, subjectId, {
      title: 'Course lesson',
      textContent: 'Course content for grounding',
      status: 'READY',
    });

    await enrol(database, batchId, student.userId);
    await assignInstructor(database, batchId, instructor.userId);
  });

  async function createAnsweredDoubt(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts`)
      .set(...authHeader(app, student))
      .send({ title: 'My doubt question', body: 'Please help me understand' })
      .expect(201);

    const doubtId = response.body.doubtId;

    await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

    const [aiAnswer] = await database.db
      .select()
      .from(aiDoubtAnswers)
      .where(eq(aiDoubtAnswers.doubtId, doubtId))
      .limit(1);

    expect(aiAnswer.status).toBe('ANSWERED');
    return doubtId;
  }

  describe('ticket 11 — escalation', () => {
    it('marks the answer unhelpful and reaches a human', async () => {
      const doubtId = await createAnsweredDoubt();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      const [aiAnswer] = await database.db
        .select()
        .from(aiDoubtAnswers)
        .where(eq(aiDoubtAnswers.doubtId, doubtId))
        .limit(1);

      expect(aiAnswer.status).toBe('ESCALATED');
      expect(aiAnswer.markedUnhelpfulAt).not.toBeNull();
    });

    it('the escalated doubt carries the automated answer', async () => {
      const doubtId = await createAnsweredDoubt();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      const [aiAnswer] = await database.db
        .select()
        .from(aiDoubtAnswers)
        .where(eq(aiDoubtAnswers.doubtId, doubtId))
        .limit(1);

      expect(aiAnswer.answerText).toBeTruthy();
      expect(aiAnswer.status).toBe('ESCALATED');
    });

    it('only the original student can escalate', async () => {
      const doubtId = await createAnsweredDoubt();

      const otherStudent = await createUser(database, 'LEARNER');
      await enrol(database, batchId, otherStudent.userId);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, otherStudent))
        .expect(403);
    });

    it('cannot escalate a doubt that has not been answered by AI', async () => {
      const response = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'Question', body: 'Detail' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${response.body.doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(404);
    });

    it('cannot escalate twice', async () => {
      const doubtId = await createAnsweredDoubt();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(400);
    });

    it('student is told a human has been reached after escalation', async () => {
      const doubtId = await createAnsweredDoubt();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      const studentNotifs = await database.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, student.userId));

      const humanNotif = studentNotifs.find(
        (n) => n.type === 'BATCH_DOUBT_REPLY' && n.title.includes('instructor'),
      );
      expect(humanNotif).toBeDefined();
    });

    it('an escalated doubt cannot be answered automatically a second time', async () => {
      const doubtId = await createAnsweredDoubt();

      provider.calls = [];

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const allAnswers = await database.db
        .select()
        .from(aiDoubtAnswers)
        .where(eq(aiDoubtAnswers.doubtId, doubtId));

      expect(allAnswers).toHaveLength(1);
      expect(allAnswers[0].status).toBe('ESCALATED');

      const answerFeatureCalls = provider.calls.filter(
        (c) => c.feature === 'doubt.answer',
      );
      expect(answerFeatureCalls).toHaveLength(0);
    });
  });

  describe('ticket 12 — draft replies', () => {
    it('draft is generated for the instructor after escalation', async () => {
      const doubtId = await createAnsweredDoubt();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const [draft] = await database.db
        .select()
        .from(aiDoubtDrafts)
        .where(eq(aiDoubtDrafts.doubtId, doubtId))
        .limit(1);

      expect(draft).toBeDefined();
      expect(draft.status).toBe('PENDING');
      expect(draft.draftText).toBeTruthy();
    });

    it('draft is not visible to the student', async () => {
      const doubtId = await createAnsweredDoubt();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      await request(app.getHttpServer())
        .get(`/batches/${batchId}/doubts/${doubtId}/draft`)
        .set(...authHeader(app, student))
        .expect(403);
    });

    it('instructor can read the draft', async () => {
      const doubtId = await createAnsweredDoubt();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const response = await request(app.getHttpServer())
        .get(`/batches/${batchId}/doubts/${doubtId}/draft`)
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(response.body.draftText).toBeTruthy();
    });

    it('committed draft reply is attributed to the instructor', async () => {
      const doubtId = await createAnsweredDoubt();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/draft/commit`)
        .set(...authHeader(app, instructor))
        .expect(201);

      const { batchDoubtReplies: repliesTable } = await import('../src/database/schema');
      const { eq: deq } = await import('drizzle-orm');
      const replies = await database.db
        .select()
        .from(repliesTable)
        .where(deq(repliesTable.doubtId, doubtId));

      expect(replies).toHaveLength(1);
      expect(replies[0].authorId).toBe(instructor.userId);
    });

    it('instructor can discard the draft', async () => {
      const doubtId = await createAnsweredDoubt();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      await request(app.getHttpServer())
        .delete(`/batches/${batchId}/doubts/${doubtId}/draft`)
        .set(...authHeader(app, instructor))
        .expect(200);

      const [draft] = await database.db
        .select()
        .from(aiDoubtDrafts)
        .where(eq(aiDoubtDrafts.doubtId, doubtId))
        .limit(1);

      expect(draft.isDiscarded).toBe(true);
    });

    it('failed draft leaves the doubt answerable rather than blocked', async () => {
      provider.structuredFor = (req) => {
        if (req.feature === 'doubt.answer') {
          return {
            answer: 'This is the AI answer for the question posed',
            citations: [],
          };
        }
        return null;
      };
      provider.failNext = false;

      const doubtId = await createAnsweredDoubt();

      provider.failNext = true;

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const [doubt] = await database.db
        .select()
        .from(batchDoubts)
        .where(eq(batchDoubts.doubtId, doubtId))
        .limit(1);

      expect(doubt.status).toBe('OPEN');

      const draftResponse = await request(app.getHttpServer())
        .get(`/batches/${batchId}/doubts/${doubtId}/draft`)
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(draftResponse.body.draftId).toBeUndefined();
    });
  });

  describe('ticket 13 — unhelpful signal report', () => {
    it('owner can read the unhelpful report', async () => {
      const doubtId = await createAnsweredDoubt();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/ai/doubts/unhelpful')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].doubtId).toBe(doubtId);
      expect(response.body[0].batchId).toBe(batchId);
      expect(response.body[0].aiAnswer).toBeTruthy();
    });

    it('student cannot read the unhelpful report', async () => {
      await request(app.getHttpServer())
        .get('/ai/doubts/unhelpful')
        .set(...authHeader(app, student))
        .expect(403);
    });

    it('instructor cannot read the owner unhelpful report', async () => {
      await request(app.getHttpServer())
        .get('/ai/doubts/unhelpful')
        .set(...authHeader(app, instructor))
        .expect(403);
    });

    it('report includes the question and AI answer that was rejected', async () => {
      const doubtId = await createAnsweredDoubt();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/ai/doubts/unhelpful')
        .set(...authHeader(app, admin))
        .expect(200);

      const item = response.body[0];
      expect(item.question).toBeDefined();
      expect(item.questionTitle).toBeDefined();
      expect(item.markedUnhelpfulAt).toBeDefined();
    });

    it('report is empty when no doubts have been marked unhelpful', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/doubts/unhelpful')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('report includes topicId grouping field', async () => {
      const doubtId = await createAnsweredDoubt();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/ai/doubts/unhelpful')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(response.body[0]).toHaveProperty('topicId');
      expect(response.body[0]).toHaveProperty('subjectId');
      expect(response.body[0]).toHaveProperty('batchId');
    });

    it('report distinguishes unhelpful answers from failed ones with category field', async () => {
      const doubtId = await createAnsweredDoubt();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      provider.failNext = true;
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'Failed doubt', body: 'Provider will fail for this one' })
        .expect(201);
      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const response = await request(app.getHttpServer())
        .get('/ai/doubts/unhelpful')
        .set(...authHeader(app, admin))
        .expect(200);

      const unhelpfulItem = response.body.find(
        (item: { doubtId: string }) => item.doubtId === doubtId,
      );
      const failedItem = response.body.find(
        (item: { category: string }) => item.category === 'FAILED',
      );

      expect(unhelpfulItem.category).toBe('UNHELPFUL');
      expect(failedItem).toBeDefined();
    });

    it('instructor can read the unhelpful report for their own batches', async () => {
      const doubtId = await createAnsweredDoubt();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/ai/doubts/unhelpful/mine')
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].doubtId).toBe(doubtId);
      expect(response.body[0].batchId).toBe(batchId);
    });

    it('instructor cannot see unhelpful doubts from another instructor batches', async () => {
      const doubtId = await createAnsweredDoubt();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      const otherInstructor = await createUser(database, 'INSTRUCTOR');

      const response = await request(app.getHttpServer())
        .get('/ai/doubts/unhelpful/mine')
        .set(...authHeader(app, otherInstructor))
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('student cannot access the instructor unhelpful report', async () => {
      await request(app.getHttpServer())
        .get('/ai/doubts/unhelpful/mine')
        .set(...authHeader(app, student))
        .expect(403);
    });
  });
});
