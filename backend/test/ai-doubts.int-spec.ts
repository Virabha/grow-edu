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
import { aiDoubtAnswers, notifications } from '../src/database/schema';
import { eq } from 'drizzle-orm';

describe('ai-doubts: answering, citation and labelling', () => {
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

    admin = await createUser(database, 'PLATFORM_ADMIN');
    instructor = await createUser(database, 'INSTRUCTOR');
    student = await createUser(database, 'LEARNER');

    batchId = await createBatch(database, admin.userId);
    subjectId = await createSubject(database, batchId);
    lessonId = await createLesson(database, subjectId, {
      title: 'Lesson on the topic',
      textContent: 'Detailed explanation of the topic',
      status: 'READY',
    });

    await enrol(database, batchId, student.userId);
    await assignInstructor(database, batchId, instructor.userId);
  });

  describe('ticket 08 — doubt returns immediately with pending state', () => {
    it('posting a doubt returns 201 immediately without waiting for AI', async () => {
      provider.structuredFor = () => ({
        answer: 'This is the AI answer for the question posed by the student',
        citations: [{ lessonId, title: 'Lesson on the topic' }],
      });

      const response = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'My question', body: 'Please explain this concept' })
        .expect(201);

      expect(response.body.status).toBe('OPEN');
      expect(response.body.doubtId).toBeDefined();

      const aiAnswer = await database.db
        .select()
        .from(aiDoubtAnswers)
        .where(eq(aiDoubtAnswers.doubtId, response.body.doubtId))
        .limit(1);

      expect(aiAnswer.length).toBe(0);
    });

    it('drain produces the AI answer and transitions doubt to ANSWERED', async () => {
      provider.structuredFor = () => ({
        answer: 'This is the AI answer for the question posed by the student',
        citations: [{ lessonId, title: 'Lesson on the topic' }],
      });

      const response = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'My question', body: 'Please explain this concept' })
        .expect(201);

      const doubtId = response.body.doubtId;

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const aiAnswer = await database.db
        .select()
        .from(aiDoubtAnswers)
        .where(eq(aiDoubtAnswers.doubtId, doubtId))
        .limit(1);

      expect(aiAnswer[0].status).toBe('ANSWERED');
      expect(aiAnswer[0].answerText).toContain('AI answer');
      expect(aiAnswer[0].citations).toHaveLength(1);
      expect(aiAnswer[0].citations[0].lessonId).toBe(lessonId);
    });

    it('AI call uses OPUS for doubt answering', async () => {
      provider.structuredFor = () => ({
        answer: 'Sufficient answer about the lesson content provided',
        citations: [{ lessonId, title: 'Lesson on the topic' }],
      });

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'My question', body: 'Please explain this concept' })
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      expect(provider.calls.length).toBeGreaterThan(0);
      expect(provider.calls[0].model).toBe('claude-opus-5');
    });

    it('grounding sources appear in the cached prefix not the volatile suffix', async () => {
      provider.structuredFor = () => ({
        answer: 'The answer grounded in course content is detailed enough',
        citations: [{ lessonId, title: 'Lesson on the topic' }],
      });

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'A question', body: 'Detail about it' })
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      expect(provider.calls.length).toBeGreaterThan(0);
      const call = provider.calls[0];
      expect(call.cachedPrefix).toContain(lessonId);
      expect(call.volatileSuffix).toContain('A question');
      expect(call.cachedPrefix).not.toContain('A question');
    });

    it('student is notified when the AI answer arrives', async () => {
      provider.structuredFor = () => ({
        answer: 'This is the AI answer for the question posed by the student',
        citations: [{ lessonId, title: 'Lesson on the topic' }],
      });

      const response = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'My answered question', body: 'Please explain' })
        .expect(201);

      const doubtId = response.body.doubtId;

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const studentNotifs = await database.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, student.userId));

      const answerNotif = studentNotifs.find(
        (n) => n.type === 'BATCH_DOUBT_REPLY' && n.title.includes('answered'),
      );
      expect(answerNotif).toBeDefined();
      expect(answerNotif?.batchId).toBe(batchId);
    });
  });

  describe('ticket 09 — citation integrity', () => {
    it('rejects an answer that cites a non-existent lesson and routes doubt to human', async () => {
      const fakeId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      provider.structuredFor = () => ({
        answer: 'An answer citing a lesson that does not exist',
        citations: [{ lessonId: fakeId, title: 'Made-up lesson' }],
      });

      const response = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'My question', body: 'Please explain' })
        .expect(201);

      const doubtId = response.body.doubtId;

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const aiAnswer = await database.db
        .select()
        .from(aiDoubtAnswers)
        .where(eq(aiDoubtAnswers.doubtId, doubtId))
        .limit(1);

      expect(aiAnswer[0].status).toBe('REJECTED');
      expect(aiAnswer[0].answerText).toBeNull();
    });

    it('rejects an answer citing a lesson from another batch', async () => {
      const otherBatch = await createBatch(database, admin.userId);
      const otherSubject = await createSubject(database, otherBatch);
      const otherLessonId = await createLesson(database, otherSubject, {
        title: 'Inaccessible lesson',
        textContent: 'Content not accessible to this student',
        status: 'READY',
      });

      provider.structuredFor = () => ({
        answer: 'An answer citing a lesson the student cannot access',
        citations: [{ lessonId: otherLessonId, title: 'Inaccessible lesson' }],
      });

      const response = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'My question', body: 'Please explain' })
        .expect(201);

      const doubtId = response.body.doubtId;

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const aiAnswer = await database.db
        .select()
        .from(aiDoubtAnswers)
        .where(eq(aiDoubtAnswers.doubtId, doubtId))
        .limit(1);

      expect(aiAnswer[0].status).toBe('REJECTED');
    });

    it('accepts an answer with valid citations from the enrolled batch', async () => {
      provider.structuredFor = () => ({
        answer: 'A valid answer citing only accessible lesson content from the course',
        citations: [{ lessonId, title: 'Lesson on the topic' }],
      });

      const response = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'My question', body: 'Please explain' })
        .expect(201);

      const doubtId = response.body.doubtId;

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const aiAnswer = await database.db
        .select()
        .from(aiDoubtAnswers)
        .where(eq(aiDoubtAnswers.doubtId, doubtId))
        .limit(1);

      expect(aiAnswer[0].status).toBe('ANSWERED');
      expect(aiAnswer[0].citations[0].lessonId).toBe(lessonId);
    });

    it('instructor is notified when a rejected answer routes doubt to human', async () => {
      const fakeId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      provider.structuredFor = () => ({
        answer: 'An answer citing a lesson that does not exist',
        citations: [{ lessonId: fakeId, title: 'Made-up lesson' }],
      });

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'Rejected question', body: 'Please explain' })
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const instructorNotifs = await database.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, instructor.userId));

      const routedNotif = instructorNotifs.find(
        (n) => n.type === 'BATCH_DOUBT_REPLY',
      );
      expect(routedNotif).toBeDefined();
    });
  });

  describe('ticket 10 — answer labelling', () => {
    it('AI answer has source=AI on the stored record', async () => {
      provider.structuredFor = () => ({
        answer: 'The AI answer that is clearly labelled as AI generated content',
        citations: [{ lessonId, title: 'Lesson on the topic' }],
      });

      const response = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'My question', body: 'Please explain' })
        .expect(201);

      const doubtId = response.body.doubtId;

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const aiAnswer = await database.db
        .select()
        .from(aiDoubtAnswers)
        .where(eq(aiDoubtAnswers.doubtId, doubtId))
        .limit(1);

      expect(aiAnswer[0].source).toBe('AI');
      expect(aiAnswer[0].status).toBe('ANSWERED');
    });

    it('instructor commits a draft and the reply is attributed to the instructor, not AI', async () => {
      provider.structuredFor = (req) => {
        if (req.feature === 'doubt.answer') {
          return {
            answer: 'AI answer that student marks unhelpful in the test scenario',
            citations: [{ lessonId, title: 'Lesson on the topic' }],
          };
        }
        return {
          draft: 'Draft reply from AI for the instructor to review and send',
        };
      };

      const createResponse = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'My question', body: 'Please explain' })
        .expect(201);

      const doubtId = createResponse.body.doubtId;

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const commitResponse = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/draft/commit`)
        .set(...authHeader(app, instructor))
        .expect(201);

      expect(commitResponse.body.committed).toBe(true);

      const { batchDoubtReplies: repliesTable } = await import('../src/database/schema');
      const { eq: deq } = await import('drizzle-orm');
      const replies = await database.db
        .select()
        .from(repliesTable)
        .where(deq(repliesTable.doubtId, doubtId));

      expect(replies).toHaveLength(1);
      expect(replies[0].authorId).toBe(instructor.userId);
    });

    it('student cannot set the automation source on a reply', async () => {
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'My question', body: 'Please explain', aiSource: 'INSTRUCTOR' })
        .expect(400);
    });

    it('client cannot inject source marker through the reply route', async () => {
      const response = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'My question', body: 'Please explain' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${response.body.doubtId}/replies`)
        .set(...authHeader(app, student))
        .send({ body: 'My reply', source: 'AI' })
        .expect(400);
    });

    it('GET doubt shows AI answer labeled source=AI distinct from instructor reply', async () => {
      provider.structuredFor = (req) => {
        if (req.feature === 'doubt.answer') {
          return {
            answer: 'Automated AI answer for the student question here',
            citations: [{ lessonId, title: 'Lesson on the topic' }],
          };
        }
        return {
          draft: 'Draft reply from AI that instructor will commit and send',
        };
      };

      const createResponse = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'My question', body: 'Please explain' })
        .expect(201);

      const doubtId = createResponse.body.doubtId;

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/draft/commit`)
        .set(...authHeader(app, instructor))
        .expect(201);

      const getResponse = await request(app.getHttpServer())
        .get(`/batches/${batchId}/doubts/${doubtId}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(getResponse.body.aiAnswer).toBeDefined();
      expect(getResponse.body.aiAnswer.source).toBe('AI');

      expect(getResponse.body.replies).toHaveLength(1);
      expect(getResponse.body.replies[0].authorId).toBe(instructor.userId);
    });

    it('doubt answered automatically then escalated shows both answers distinctly', async () => {
      provider.structuredFor = (req) => {
        if (req.feature === 'doubt.answer') {
          return {
            answer: 'Automated AI answer that the student found unhelpful here',
            citations: [{ lessonId, title: 'Lesson on the topic' }],
          };
        }
        return {
          draft: 'Instructor draft reply generated after escalation',
        };
      };

      const createResponse = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'Complex question', body: 'Needs more explanation' })
        .expect(201);

      const doubtId = createResponse.body.doubtId;

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const afterAi = await request(app.getHttpServer())
        .get(`/batches/${batchId}/doubts/${doubtId}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(afterAi.body.aiAnswer.source).toBe('AI');
      expect(afterAi.body.aiAnswer.status).toBe('ANSWERED');
      expect(afterAi.body.replies).toHaveLength(0);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/draft/commit`)
        .set(...authHeader(app, instructor))
        .expect(201);

      const afterCommit = await request(app.getHttpServer())
        .get(`/batches/${batchId}/doubts/${doubtId}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(afterCommit.body.aiAnswer.source).toBe('AI');
      expect(afterCommit.body.aiAnswer.status).toBe('ESCALATED');
      expect(afterCommit.body.replies[0].authorId).toBe(instructor.userId);
    });
  });

  describe('provider failure degradation', () => {
    it('routes doubt to human when AI provider fails', async () => {
      provider.failNext = true;

      const response = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'My question', body: 'Please explain' })
        .expect(201);

      const doubtId = response.body.doubtId;

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const aiAnswer = await database.db
        .select()
        .from(aiDoubtAnswers)
        .where(eq(aiDoubtAnswers.doubtId, doubtId))
        .limit(1);

      expect(aiAnswer[0].status).toBe('FAILED');
    });

    it('student is notified when automation fails', async () => {
      provider.failNext = true;

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'Failed question', body: 'Please explain' })
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const studentNotifs = await database.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, student.userId));

      const failNotif = studentNotifs.find(
        (n) => n.type === 'BATCH_DOUBT_REPLY' && n.title.includes('could not'),
      );
      expect(failNotif).toBeDefined();
    });

    it('provider timeout leaves a visible FAILED state on the doubt answer', async () => {
      provider.failNext = true;

      const response = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'Timed out question', body: 'Please explain' })
        .expect(201);

      const doubtId = response.body.doubtId;

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const getResponse = await request(app.getHttpServer())
        .get(`/batches/${batchId}/doubts/${doubtId}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(getResponse.body.aiAnswer).toBeDefined();
      expect(getResponse.body.aiAnswer.status).toBe('FAILED');
    });

    it('repeated provider failure does not retry without bound', async () => {
      provider.structuredFor = () => null;

      const response = await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'Shape failing question', body: 'Please explain' })
        .expect(201);

      const doubtId = response.body.doubtId;

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);
      const callsAfterFirst = provider.calls.length;
      expect(callsAfterFirst).toBe(2);

      provider.calls = [];
      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);
      expect(provider.calls.length).toBe(0);

      const aiAnswer = await database.db
        .select()
        .from(aiDoubtAnswers)
        .where(eq(aiDoubtAnswers.doubtId, doubtId))
        .limit(1);

      expect(aiAnswer[0].status).toBe('FAILED');
    });
  });

  describe('ticket 05 — structured output rejection', () => {
    it('shape-rejected response writes an aiModelCalls row with outcome REJECTED', async () => {
      provider.structuredFor = () => null;

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'Shape test', body: 'Shape rejection test question' })
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const { aiModelCalls } = await import('../src/database/schema');
      const { eq: deq, and: dand } = await import('drizzle-orm');

      const rejected = await database.db
        .select()
        .from(aiModelCalls)
        .where(dand(
          deq(aiModelCalls.feature, 'doubt.answer'),
          deq(aiModelCalls.outcome, 'REJECTED'),
        ));

      expect(rejected.length).toBeGreaterThan(0);
    });

    it('exactly two attempts are recorded before giving up on shape failure', async () => {
      provider.structuredFor = () => null;

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, student))
        .send({ title: 'Two attempts test', body: 'Shape retry bounded test question' })
        .expect(201);

      await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

      const { aiModelCalls } = await import('../src/database/schema');
      const { eq: deq, and: dand } = await import('drizzle-orm');

      const rejectedRows = await database.db
        .select()
        .from(aiModelCalls)
        .where(dand(
          deq(aiModelCalls.feature, 'doubt.answer'),
          deq(aiModelCalls.outcome, 'REJECTED'),
        ));

      expect(rejectedRows.length).toBe(2);

      const aiAnswer = await database.db
        .select()
        .from(aiDoubtAnswers)
        .limit(1);

      expect(aiAnswer[0].answerText).toBeNull();
    });
  });
});
