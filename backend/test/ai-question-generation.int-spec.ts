import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { MODEL_PROVIDER } from '../src/ai/model-provider';
import { BATCH_RECONCILE_JOB } from '../src/ai/batch.service';
import { assessmentQuestions, notifications } from '../src/database/schema';
import { eq } from 'drizzle-orm';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import { makeModelProvider, RecordingModelProvider } from './support/ai-factories';
import {
  createTaxonomy,
  seedDifficultyScale,
  Taxonomy,
} from './support/assessment-factories';

describe('ai question generation (tickets 14, 16)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let provider: RecordingModelProvider;
  let queue: InlineJobQueue;
  const clock = new TestClock();

  let instructor: TestActor;
  let taxonomy: Taxonomy;

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
    provider.batches = [];
    provider.failNext = false;
    provider.batchComplete = true;
    provider.batchOutcomeFor = () => 'SUCCEEDED';
    instructor = await createUser(database, 'INSTRUCTOR');
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, instructor.userId);
  });

  const validGenerationOutput = {
    questions: [
      {
        statement: 'What is the primary purpose of a function in programming?',
        optionA: 'To store data',
        optionB: 'To encapsulate reusable logic',
        optionC: 'To define types',
        optionD: 'To allocate memory',
        correctIndex: 1,
        explanation: 'Functions encapsulate reusable logic that can be called multiple times.',
      },
      {
        statement: 'Which of the following is a valid variable name in most languages?',
        optionA: '2variable',
        optionB: 'variable-name',
        optionC: 'variableName',
        optionD: 'variable name',
        correctIndex: 2,
        explanation: 'camelCase names like variableName are valid in most languages.',
      },
    ],
  };

  describe('ticket 14 — synchronous generation from a lesson', () => {
    it('generates draft questions and marks them UNREVIEWED', async () => {
      provider.structuredFor = () => validGenerationOutput;

      const { body } = await request(app.getHttpServer())
        .post('/assessment/questions/generate')
        .set(...authHeader(app, instructor))
        .send({
          lessonId: 'lesson-1',
          subjectId: taxonomy.subjectId,
          topicId: taxonomy.topicId,
          difficulty: 1,
          count: 2,
        })
        .expect(201);

      expect(body.questionIds).toHaveLength(2);

      for (const questionId of body.questionIds) {
        const [q] = await database.db
          .select()
          .from(assessmentQuestions)
          .where(eq(assessmentQuestions.questionId, questionId));
        expect(q).toBeDefined();
        expect(q.reviewStatus).toBe('UNREVIEWED');
        expect(q.subjectId).toBe(taxonomy.subjectId);
        expect(q.topicId).toBe(taxonomy.topicId);
        expect(q.authoredDifficulty).toBe(1);
      }
    });

    it('persists nothing when AI returns malformed output', async () => {
      provider.structuredFor = () => ({ not: 'valid' });

      const before = await database.db
        .select({ questionId: assessmentQuestions.questionId })
        .from(assessmentQuestions);

      await request(app.getHttpServer())
        .post('/assessment/questions/generate')
        .set(...authHeader(app, instructor))
        .send({
          lessonId: 'lesson-1',
          subjectId: taxonomy.subjectId,
          topicId: taxonomy.topicId,
          difficulty: 1,
          count: 2,
        })
        .expect(422);

      const after = await database.db
        .select({ questionId: assessmentQuestions.questionId })
        .from(assessmentQuestions);

      expect(after.length).toBe(before.length);
    });

    it('forbids students from generating questions', async () => {
      const student = await createUser(database, 'LEARNER');
      await request(app.getHttpServer())
        .post('/assessment/questions/generate')
        .set(...authHeader(app, student))
        .send({
          subjectId: taxonomy.subjectId,
          topicId: taxonomy.topicId,
          difficulty: 1,
          count: 2,
        })
        .expect(403);
    });
  });

  describe('ticket 16 — bulk batch generation', () => {
    const singleQuestionOutput = {
      statement: 'What does HTML stand for?',
      optionA: 'Hypertext Markup Language',
      optionB: 'High-level Transfer Markup Language',
      optionC: 'Hyperlink and Text Markup Language',
      optionD: 'Home Tool Markup Language',
      correctIndex: 0,
      explanation: 'HTML stands for Hypertext Markup Language.',
    };

    it('submits a batch and creates UNREVIEWED questions after reconciliation', async () => {
      provider.structuredFor = () => singleQuestionOutput;

      const { body: submitBody } = await request(app.getHttpServer())
        .post('/assessment/questions/bulk-generate')
        .set(...authHeader(app, instructor))
        .send({
          subjectId: taxonomy.subjectId,
          topicId: taxonomy.topicId,
          difficulty: 1,
          count: 3,
        })
        .expect(201);

      expect(submitBody.batchId).toBeDefined();

      await queue.enqueue(BATCH_RECONCILE_JOB, undefined);

      const created = await database.db
        .select()
        .from(assessmentQuestions)
        .where(eq(assessmentQuestions.topicId, taxonomy.topicId));

      expect(created.length).toBe(3);
      for (const q of created) {
        expect(q.reviewStatus).toBe('UNREVIEWED');
        expect(q.subjectId).toBe(taxonomy.subjectId);
        expect(q.topicId).toBe(taxonomy.topicId);
      }
    });

    it('instructor is notified when bulk generation completes after BATCH_RECONCILE_JOB', async () => {
      provider.structuredFor = () => singleQuestionOutput;

      await request(app.getHttpServer())
        .post('/assessment/questions/bulk-generate')
        .set(...authHeader(app, instructor))
        .send({
          subjectId: taxonomy.subjectId,
          topicId: taxonomy.topicId,
          difficulty: 1,
          count: 1,
        })
        .expect(201);

      await queue.enqueue(BATCH_RECONCILE_JOB, undefined);

      const rows = await database.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, instructor.userId));

      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].type).toBe('GENERIC');
    });

    it('keeps successful questions when some batch items fail', async () => {
      provider.structuredFor = () => singleQuestionOutput;
      provider.batchOutcomeFor = (ref) =>
        ref.includes('-0') ? 'FAILED' : 'SUCCEEDED';

      await request(app.getHttpServer())
        .post('/assessment/questions/bulk-generate')
        .set(...authHeader(app, instructor))
        .send({
          subjectId: taxonomy.subjectId,
          topicId: taxonomy.topicId,
          difficulty: 1,
          count: 3,
        })
        .expect(201);

      await queue.enqueue(BATCH_RECONCILE_JOB, undefined);

      const created = await database.db
        .select()
        .from(assessmentQuestions)
        .where(eq(assessmentQuestions.topicId, taxonomy.topicId));

      expect(created.length).toBe(2);
      for (const q of created) {
        expect(q.reviewStatus).toBe('UNREVIEWED');
      }
    });
  });
});
