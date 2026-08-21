import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import {
  createUser,
  createBatch,
  createLesson,
  createSubject,
  enrol,
  assignInstructor,
} from './support/factories';
import { batchQuizzes, batchQuizQuestions } from '../src/database/schema';

describe('anchored doubts', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;
  let instructor: TestActor;
  let batchId: string;
  let subjectId: string;
  let lessonId: string;

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
    instructor = await createUser(database, 'INSTRUCTOR');
    batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);
    await assignInstructor(database, batchId, instructor.userId, 'LEAD');
    subjectId = await createSubject(database, batchId);
    lessonId = await createLesson(database, subjectId, {
      title: 'Motion in a Straight Line',
      status: 'READY',
    });
  });

  async function createDoubt(
    actor: TestActor,
    body: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts`)
      .set(...authHeader(app, actor))
      .send(body);
  }

  async function getDoubt(actor: TestActor, doubtId: string) {
    return request(app.getHttpServer())
      .get(`/batches/${batchId}/doubts/${doubtId}`)
      .set(...authHeader(app, actor));
  }

  async function listDoubts(
    actor: TestActor,
    query: Record<string, string> = {},
  ) {
    return request(app.getHttpServer())
      .get(`/batches/${batchId}/doubts`)
      .query(query)
      .set(...authHeader(app, actor));
  }

  async function addReply(
    actor: TestActor,
    doubtId: string,
    body: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${doubtId}/replies`)
      .set(...authHeader(app, actor))
      .send(body);
  }

  describe('anchor creation', () => {
    it('creates a batch-level doubt when no anchor is specified', async () => {
      const { body, status } = await createDoubt(student, {
        title: 'Why is energy conserved?',
        body: 'I do not understand the derivation.',
      });

      expect(status).toBe(201);
      expect(body.anchorType).toBe('BATCH');
      expect(body.anchorId).toBeNull();
    });

    it('creates a lesson-anchored doubt with a lesson in this batch', async () => {
      const { body, status } = await createDoubt(student, {
        title: 'Confused about velocity',
        body: 'The formula is not clicking.',
        anchorType: 'LESSON',
        anchorId: lessonId,
      });

      expect(status).toBe(201);
      expect(body.anchorType).toBe('LESSON');
      expect(body.anchorId).toBe(lessonId);
    });

    it('creates a question-anchored doubt with a question in this batch', async () => {
      const quizId = randomUUID();
      await database.db.insert(batchQuizzes).values({
        quizId,
        batchId,
        title: 'Chapter 1 Test',
        createdBy: admin.userId,
      });
      const questionId = randomUUID();
      await database.db.insert(batchQuizQuestions).values({
        questionId,
        quizId,
        order: 1,
        type: 'MCQ_SINGLE',
        prompt: 'What is the SI unit of velocity?',
        correctAnswer: 'ms-1',
      });

      const { body, status } = await createDoubt(student, {
        title: 'About the velocity question',
        body: 'Is ms-1 the same as m/s?',
        anchorType: 'QUESTION',
        anchorId: questionId,
      });

      expect(status).toBe(201);
      expect(body.anchorType).toBe('QUESTION');
      expect(body.anchorId).toBe(questionId);
    });

    it('refuses a lesson anchor pointing to a lesson in another batch', async () => {
      const otherBatchId = await createBatch(database, admin.userId);
      const otherSubjectId = await createSubject(database, otherBatchId);
      const otherLessonId = await createLesson(database, otherSubjectId, {
        title: 'Optics',
        status: 'READY',
      });

      const { status } = await createDoubt(student, {
        title: 'Cross-batch lesson doubt',
        body: 'This should be refused.',
        anchorType: 'LESSON',
        anchorId: otherLessonId,
      });

      expect(status).toBe(400);
    });

    it('refuses a question anchor pointing to a quiz in another batch', async () => {
      const otherBatchId = await createBatch(database, admin.userId);
      const otherQuizId = randomUUID();
      await database.db.insert(batchQuizzes).values({
        quizId: otherQuizId,
        batchId: otherBatchId,
        title: 'Other Batch Quiz',
        createdBy: admin.userId,
      });
      const otherQuestionId = randomUUID();
      await database.db.insert(batchQuizQuestions).values({
        questionId: otherQuestionId,
        quizId: otherQuizId,
        order: 1,
        type: 'MCQ_SINGLE',
        prompt: 'Cross-batch question',
        correctAnswer: 'A',
      });

      const { status } = await createDoubt(student, {
        title: 'Cross-batch question doubt',
        body: 'Should be refused.',
        anchorType: 'QUESTION',
        anchorId: otherQuestionId,
      });

      expect(status).toBe(400);
    });

    it('requires anchorId when anchorType is LESSON', async () => {
      const { status } = await createDoubt(student, {
        title: 'Missing anchor id',
        body: 'Should be refused.',
        anchorType: 'LESSON',
      });

      expect(status).toBe(400);
    });
  });

  describe('anchor context on read', () => {
    it('returns the lesson title when reading a lesson-anchored doubt', async () => {
      const { body: created } = await createDoubt(student, {
        title: 'Confused on lesson content',
        body: 'Please help.',
        anchorType: 'LESSON',
        anchorId: lessonId,
      });

      const { body, status } = await getDoubt(student, created.doubtId);

      expect(status).toBe(200);
      expect(body.anchorContext).not.toBeNull();
      expect(body.anchorContext.type).toBe('LESSON');
      expect(body.anchorContext.lessonId).toBe(lessonId);
      expect(body.anchorContext.title).toBe('Motion in a Straight Line');
    });

    it('returns the question prompt when reading a question-anchored doubt', async () => {
      const quizId = randomUUID();
      await database.db.insert(batchQuizzes).values({
        quizId,
        batchId,
        title: 'Chapter Test',
        createdBy: admin.userId,
      });
      const questionId = randomUUID();
      const prompt = 'What is Newton\'s first law?';
      await database.db.insert(batchQuizQuestions).values({
        questionId,
        quizId,
        order: 1,
        type: 'MCQ_SINGLE',
        prompt,
        correctAnswer: 'inertia',
      });

      const { body: created } = await createDoubt(student, {
        title: 'Question about Newton',
        body: 'I am confused.',
        anchorType: 'QUESTION',
        anchorId: questionId,
      });

      const { body, status } = await getDoubt(student, created.doubtId);

      expect(status).toBe(200);
      expect(body.anchorContext).not.toBeNull();
      expect(body.anchorContext.type).toBe('QUESTION');
      expect(body.anchorContext.questionId).toBe(questionId);
      expect(body.anchorContext.prompt).toBe(prompt);
    });

    it('returns null anchorContext for a batch-level doubt', async () => {
      const { body: created } = await createDoubt(student, {
        title: 'General batch doubt',
        body: 'No anchor.',
      });

      const { body, status } = await getDoubt(student, created.doubtId);

      expect(status).toBe(200);
      expect(body.anchorContext).toBeNull();
    });
  });

  describe('images on doubts and replies', () => {
    it('stores attachments on a doubt and returns them', async () => {
      const attachments = [
        'https://cdn.example.com/img1.jpg',
        'https://cdn.example.com/img2.png',
      ];

      const { body: created } = await createDoubt(student, {
        title: 'My working with image',
        body: 'See attached.',
        attachments,
      });

      expect(created.attachments).toEqual(attachments);

      const { body: fetched } = await getDoubt(student, created.doubtId);
      expect(fetched.attachments).toEqual(attachments);
    });

    it('stores attachments on a reply and returns them', async () => {
      const { body: doubt } = await createDoubt(student, {
        title: 'Need help',
        body: 'See my working.',
      });

      const replyAttachments = ['https://cdn.example.com/solution.jpg'];

      const { body: reply, status } = await addReply(instructor, doubt.doubtId, {
        body: 'Here is the solution.',
        attachments: replyAttachments,
      });

      expect(status).toBe(201);
      expect(reply.attachments).toEqual(replyAttachments);

      const { body: fetched } = await getDoubt(student, doubt.doubtId);
      expect(fetched.replies[0].attachments).toEqual(replyAttachments);
    });
  });

  describe('cross-batch isolation', () => {
    it('allows an enrolled student to list doubts in their batch', async () => {
      await createDoubt(student, {
        title: 'My doubt',
        body: 'In my batch.',
      });

      const { body, status } = await listDoubts(student);

      expect(status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].title).toBe('My doubt');
    });

    it('prevents a student from seeing doubts in another batch', async () => {
      const otherBatchId = await createBatch(database, admin.userId);
      const outsider = await createUser(database, 'LEARNER');
      await enrol(database, otherBatchId, outsider.userId);

      await createDoubt(student, {
        title: 'Private doubt in my batch',
        body: 'Outsider should not see this.',
      });

      const { status } = await request(app.getHttpServer())
        .get(`/batches/${batchId}/doubts`)
        .set(...authHeader(app, outsider));

      expect(status).toBe(404);
    });

    it('filters doubts by anchor when anchorId is provided', async () => {
      const anotherLessonId = await createLesson(database, subjectId, {
        title: 'Projectile Motion',
        status: 'READY',
      });

      await createDoubt(student, {
        title: 'About lesson 1',
        body: 'For lesson 1.',
        anchorType: 'LESSON',
        anchorId: lessonId,
      });

      await createDoubt(student, {
        title: 'About lesson 2',
        body: 'For lesson 2.',
        anchorType: 'LESSON',
        anchorId: anotherLessonId,
      });

      const { body, status } = await listDoubts(student, {
        anchorId: lessonId,
      });

      expect(status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].title).toBe('About lesson 1');
    });
  });

  describe('notification on reply', () => {
    it('notifies the asker when an instructor answers their doubt', async () => {
      const { body: doubt } = await createDoubt(student, {
        title: 'Please explain entropy',
        body: 'I am lost.',
      });

      await addReply(instructor, doubt.doubtId, {
        body: 'Entropy is disorder. Here is the formal definition.',
      });

      const { body: notifications, status } = await request(
        app.getHttpServer(),
      )
        .get('/notifications')
        .set(...authHeader(app, student));

      expect(status).toBe(200);
      const doubtNotif = (
        notifications.data as Array<{ type: string; title: string }>
      ).find((n) => n.type === 'BATCH_DOUBT_REPLY');
      expect(doubtNotif).toBeDefined();
      expect(doubtNotif?.title).toContain('Please explain entropy');
    });

    it('does not notify the asker when they reply to their own doubt', async () => {
      const { body: doubt } = await createDoubt(student, {
        title: 'Self-reply test',
        body: 'I will reply to myself.',
      });

      await addReply(student, doubt.doubtId, {
        body: 'Updating with more context.',
      });

      const { body: notifications } = await request(app.getHttpServer())
        .get('/notifications')
        .set(...authHeader(app, student));

      const doubtNotif = (
        notifications.data as Array<{ type: string }>
      ).find((n) => n.type === 'BATCH_DOUBT_REPLY');
      expect(doubtNotif).toBeUndefined();
    });
  });
});
