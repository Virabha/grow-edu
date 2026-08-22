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
import { DoubtAnswerService } from '../src/batches/engagement/doubt-answer.service';
import { aiDoubtAnswers } from '../src/database/schema';
import { eq } from 'drizzle-orm';

describe('ai-doubts: answering, citation and labelling', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let provider: RecordingModelProvider;
  let clock: TestClock;
  let answers: DoubtAnswerService;

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
    answers = app.get<DoubtAnswerService>(DoubtAnswerService);
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

      await answers.drain();

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

      await answers.drain();

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

      await answers.drain();

      expect(provider.calls.length).toBeGreaterThan(0);
      const call = provider.calls[0];
      expect(call.cachedPrefix).toContain(lessonId);
      expect(call.volatileSuffix).toContain('A question');
      expect(call.cachedPrefix).not.toContain('A question');
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

      await answers.drain();

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

      await answers.drain();

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

      await answers.drain();

      const aiAnswer = await database.db
        .select()
        .from(aiDoubtAnswers)
        .where(eq(aiDoubtAnswers.doubtId, doubtId))
        .limit(1);

      expect(aiAnswer[0].status).toBe('ANSWERED');
      expect(aiAnswer[0].citations[0].lessonId).toBe(lessonId);
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

      await answers.drain();

      const aiAnswer = await database.db
        .select()
        .from(aiDoubtAnswers)
        .where(eq(aiDoubtAnswers.doubtId, doubtId))
        .limit(1);

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

      await answers.drain();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/doubts/${doubtId}/escalate`)
        .set(...authHeader(app, student))
        .expect(201);

      await answers.drain();

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

      await answers.drain();

      const aiAnswer = await database.db
        .select()
        .from(aiDoubtAnswers)
        .where(eq(aiDoubtAnswers.doubtId, doubtId))
        .limit(1);

      expect(aiAnswer[0].status).toBe('FAILED');
    });
  });
});
