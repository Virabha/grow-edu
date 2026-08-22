import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';
import { assessmentAttempts } from '../src/database/schema';

import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import {
  createBatch,
  createLesson,
  createSubject,
  createUser,
  enrol,
} from './support/factories';
import {
  Taxonomy,
  createQuestion,
  createTaxonomy,
  seedDifficultyScale,
  text,
} from './support/assessment-factories';

describe('rich content lessons', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;
  let batchId: string;
  let subjectId: string;
  let lessonId: string;
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
    batchId = await createBatch(database, admin.userId);
    subjectId = await createSubject(database, batchId);
    await enrol(database, batchId, student.userId);
    lessonId = await createLesson(database, subjectId, {
      type: 'RICH',
      order: 1,
    });
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, admin.userId);
  });

  function putContent(content: unknown) {
    return request(app.getHttpServer())
      .put(`/batches/${batchId}/lessons/${lessonId}/rich-content`)
      .set(...authHeader(app, admin))
      .send({ content });
  }

  function readContent(actor: TestActor) {
    return request(app.getHttpServer())
      .get(`/batches/${batchId}/lessons/${lessonId}/rich-content`)
      .set(...authHeader(app, actor));
  }

  it('round-trips rich content unchanged through authoring and reading', async () => {
    const content = [
      { type: 'TEXT', text: 'Newton second law' },
      { type: 'MATH', latex: 'F = ma' },
      { type: 'CODE', language: 'python', code: 'print(1)' },
      { type: 'IMAGE', fileId: 'files/diagram.png', alt: 'A diagram' },
      {
        type: 'TABLE',
        headers: ['Quantity', 'Unit'],
        rows: [
          ['Force', 'newton'],
          ['Mass', 'kilogram'],
        ],
      },
    ];

    await putContent(content).expect(200);

    const read = await readContent(student).expect(200);
    expect(read.body.blocks).toEqual(content);
  });

  it('reuses the phase 3 content-block parser rather than a second one', async () => {
    await putContent([{ type: 'TEXT', text: '' }]).expect(400);
    await putContent([{ type: 'MATH' }]).expect(400);
    await putContent([{ type: 'CODE', code: 'x = 1' }]).expect(400);
    await putContent([{ type: 'IMAGE', fileId: 'a.png', alt: 7 }]).expect(400);
  });

  it('refuses an unknown block type at authoring', async () => {
    await putContent([{ type: 'CAROUSEL', slides: [] }]).expect(400);

    const read = await readContent(admin).expect(200);
    expect(read.body.blocks).toEqual([]);
  });

  it('references a bank question rather than embedding a copy', async () => {
    const questionId = await createQuestion(database, taxonomy, admin.userId, {
      type: 'SINGLE_CORRECT',
      prompt: text('What is the unit of force?'),
    });

    await putContent([
      { type: 'TEXT', text: 'Try this' },
      {
        type: 'QUESTION',
        questionId,
        prompt: [{ type: 'TEXT', text: 'a copy' }],
      },
    ]).expect(400);

    await putContent([{ type: 'QUESTION', questionId: 'not-in-the-bank' }]).expect(400);

    await putContent([
      { type: 'TEXT', text: 'Try this' },
      { type: 'QUESTION', questionId },
    ]).expect(200);

    const asStudent = await readContent(student).expect(200);
    const block = asStudent.body.blocks[1];
    expect(block.questionId).toBe(questionId);
    expect(block.question.prompt).toEqual(text('What is the unit of force?'));
    expect(block.question.answerKey).toBeUndefined();

    const asStaff = await readContent(admin).expect(200);
    expect(asStaff.body.blocks[1].question.answerKey).toEqual({
      kind: 'SINGLE',
      optionId: 'a',
    });
  });

  it('records an inline answer against the student without creating a test attempt', async () => {
    const questionId = await createQuestion(database, taxonomy, admin.userId, {
      type: 'SINGLE_CORRECT',
    });
    await putContent([{ type: 'QUESTION', questionId }]).expect(200);

    const wrong = await request(app.getHttpServer())
      .post(`/batches/${batchId}/lessons/${lessonId}/inline-questions/${questionId}`)
      .set(...authHeader(app, student))
      .send({ response: 'b' })
      .expect(201);
    expect(wrong.body.outcome).toBe('WRONG');

    const right = await request(app.getHttpServer())
      .post(`/batches/${batchId}/lessons/${lessonId}/inline-questions/${questionId}`)
      .set(...authHeader(app, student))
      .send({ response: 'a' })
      .expect(201);
    expect(right.body.outcome).toBe('CORRECT');

    const mine = await request(app.getHttpServer())
      .get(`/batches/${batchId}/lessons/${lessonId}/inline-questions`)
      .set(...authHeader(app, student))
      .expect(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0]).toMatchObject({ questionId, outcome: 'CORRECT' });

    const attemptRows = await database.db
      .select()
      .from(assessmentAttempts)
      .where(eq(assessmentAttempts.userId, student.userId));
    expect(attemptRows).toHaveLength(0);
  });

  it('refuses an inline answer to a question that is not in the lesson', async () => {
    const inLesson = await createQuestion(database, taxonomy, admin.userId);
    const elsewhere = await createQuestion(database, taxonomy, admin.userId);
    await putContent([{ type: 'QUESTION', questionId: inLesson }]).expect(200);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/lessons/${lessonId}/inline-questions/${elsewhere}`)
      .set(...authHeader(app, student))
      .send({ response: 'a' })
      .expect(404);
  });

  it('refuses structured content on a lesson that is not rich', async () => {
    const videoId = await createLesson(database, subjectId, {
      type: 'VIDEO',
      duration: 100,
      order: 2,
    });

    await request(app.getHttpServer())
      .put(`/batches/${batchId}/lessons/${videoId}/rich-content`)
      .set(...authHeader(app, admin))
      .send({ content: [{ type: 'TEXT', text: 'nope' }] })
      .expect(400);
  });
});
