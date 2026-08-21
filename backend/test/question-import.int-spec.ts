import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { JOB_QUEUE, JobHandler, JobOptions, JobQueue } from '../src/jobs/job-queue';
import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import {
  seedDifficultyScale,
  createTaxonomy,
  text,
  Taxonomy,
} from './support/assessment-factories';
import { assessmentQuestions } from '../src/database/schema';

class DeferredJobQueue implements JobQueue {
  private readonly pending: Array<() => Promise<void>> = [];
  private readonly handlers = new Map<string, JobHandler<unknown>>();

  register<T>(name: string, handler: JobHandler<T>, _options?: JobOptions): void {
    this.handlers.set(name, handler as JobHandler<unknown>);
  }

  async enqueue<T>(name: string, payload: T): Promise<void> {
    const h = this.handlers.get(name);
    if (h !== undefined) {
      this.pending.push(() => h(payload as unknown));
    }
  }

  async drain(): Promise<void> {
    let job = this.pending.shift();
    while (job !== undefined) {
      await job();
      job = this.pending.shift();
    }
  }

  async repeat(_name: string, _everyMilliseconds: number): Promise<void> {}
}

function makeValidRow(
  subjectName: string,
  topicName: string,
  difficulty: number,
  subTopicName?: string,
) {
  return {
    type: 'SINGLE_CORRECT',
    subject: subjectName,
    topic: topicName,
    ...(subTopicName ? { subTopic: subTopicName } : {}),
    difficulty,
    prompt: text('What is 2 + 2?'),
    options: [
      { id: 'a', content: text('3') },
      { id: 'b', content: text('4') },
    ],
    correctAnswer: { optionId: 'b' },
    explanation: text('Because 2+2=4'),
  };
}

describe('question import (tickets 12 + 13)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let instructor: TestActor;
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
    instructor = await createUser(database, 'INSTRUCTOR');
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, admin.userId, {
      subject: 'Mathematics',
      topic: 'Algebra',
      subTopic: 'Quadratics',
    });
  });

  describe('Ticket 12 AC: a parsed file returns a per-row preview showing what would be created', () => {
    it('returns importId, rowCount, validCount, invalidCount, and per-row data', async () => {
      const row = makeValidRow('Mathematics', 'Algebra', 1, 'Quadratics');

      const { body } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows: [row] })
        .expect(201);

      expect(body.importId).toBeDefined();
      expect(body.rowCount).toBe(1);
      expect(body.validCount).toBe(1);
      expect(body.invalidCount).toBe(0);
      expect(body.status).toBe('PARSED');
      expect(body.rows).toHaveLength(1);
      expect(body.rows[0].rowNumber).toBe(1);
      expect(body.rows[0].isValid).toBe(true);
      expect(body.rows[0].errors).toHaveLength(0);
      expect(body.rows[0].parsed).not.toBeNull();
      expect(body.rows[0].parsed.subjectId).toBe(taxonomy.subjectId);
      expect(body.rows[0].parsed.topicId).toBe(taxonomy.topicId);
      expect(body.rows[0].parsed.subTopicId).toBe(taxonomy.subTopicId);
    });

    it('GET /assessment/imports/:importId returns the same preview', async () => {
      const row = makeValidRow('Mathematics', 'Algebra', 1);

      const { body: preview } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows: [row] })
        .expect(201);

      const { body: fetched } = await request(app.getHttpServer())
        .get(`/assessment/imports/${preview.importId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(fetched.importId).toBe(preview.importId);
      expect(fetched.rowCount).toBe(1);
      expect(fetched.rows).toHaveLength(1);
    });

    it('an INSTRUCTOR can also create a preview', async () => {
      const row = makeValidRow('Mathematics', 'Algebra', 1);

      await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, instructor))
        .send({ rows: [row] })
        .expect(201);
    });
  });

  describe('Ticket 12 AC: an untagged row is reported as invalid with its row number', () => {
    it('a row with a missing subject is marked invalid at the correct row number', async () => {
      const row = {
        type: 'SINGLE_CORRECT',
        topic: 'Algebra',
        difficulty: 1,
        prompt: text('What?'),
        options: [
          { id: 'a', content: text('A') },
          { id: 'b', content: text('B') },
        ],
        correctAnswer: { optionId: 'a' },
      };

      const { body } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows: [row] })
        .expect(201);

      expect(body.rows[0].rowNumber).toBe(1);
      expect(body.rows[0].isValid).toBe(false);
      expect(body.rows[0].errors.length).toBeGreaterThan(0);
    });

    it('a row with a missing topic is marked invalid', async () => {
      const row = {
        type: 'SINGLE_CORRECT',
        subject: 'Mathematics',
        difficulty: 1,
        prompt: text('What?'),
        options: [
          { id: 'a', content: text('A') },
          { id: 'b', content: text('B') },
        ],
        correctAnswer: { optionId: 'a' },
      };

      const { body } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows: [row] })
        .expect(201);

      expect(body.rows[0].isValid).toBe(false);
    });

    it('a row referencing a non-existent subject is invalid', async () => {
      const row = makeValidRow('NONEXISTENT_SUBJECT', 'Algebra', 1);

      const { body } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows: [row] })
        .expect(201);

      expect(body.rows[0].isValid).toBe(false);
      expect(body.rows[0].errors.some((e: string) => e.includes('NONEXISTENT_SUBJECT'))).toBe(true);
    });

    it('a row with a difficulty not on the scale is marked invalid', async () => {
      const row = makeValidRow('Mathematics', 'Algebra', 99);

      const { body } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows: [row] })
        .expect(201);

      expect(body.rows[0].isValid).toBe(false);
    });

    it('the invalid row number is 1-indexed and matches position in input', async () => {
      const validRow = makeValidRow('Mathematics', 'Algebra', 1);
      const invalidRow = makeValidRow('UNKNOWN', 'Algebra', 1);

      const { body } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows: [validRow, invalidRow] })
        .expect(201);

      expect(body.rows[0].rowNumber).toBe(1);
      expect(body.rows[0].isValid).toBe(true);
      expect(body.rows[1].rowNumber).toBe(2);
      expect(body.rows[1].isValid).toBe(false);
    });
  });

  describe('Ticket 12 AC: a malformed row does not abort the parse of the remaining rows', () => {
    it('later rows are parsed even when an earlier row is invalid', async () => {
      const badRow = makeValidRow('DOES_NOT_EXIST', 'Algebra', 1);
      const goodRow = makeValidRow('Mathematics', 'Algebra', 2);

      const { body } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows: [badRow, goodRow] })
        .expect(201);

      expect(body.rows).toHaveLength(2);
      expect(body.rows[0].isValid).toBe(false);
      expect(body.rows[1].isValid).toBe(true);
      expect(body.rows[1].parsed).not.toBeNull();
    });

    it('multiple invalid rows are each reported independently', async () => {
      const rows = [
        makeValidRow('UNKNOWN1', 'Algebra', 1),
        makeValidRow('Mathematics', 'Algebra', 1),
        makeValidRow('UNKNOWN3', 'Algebra', 1),
      ];

      const { body } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows })
        .expect(201);

      expect(body.rows).toHaveLength(3);
      expect(body.rows[0].isValid).toBe(false);
      expect(body.rows[1].isValid).toBe(true);
      expect(body.rows[2].isValid).toBe(false);
    });
  });

  describe('Ticket 12 AC: the preview reports counts of valid and invalid rows', () => {
    it('validCount and invalidCount sum to rowCount', async () => {
      const rows = [
        makeValidRow('Mathematics', 'Algebra', 1),
        makeValidRow('UNKNOWN', 'Algebra', 1),
        makeValidRow('Mathematics', 'Algebra', 2),
        makeValidRow('ALSO_UNKNOWN', 'Algebra', 1),
      ];

      const { body } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows })
        .expect(201);

      expect(body.rowCount).toBe(4);
      expect(body.validCount).toBe(2);
      expect(body.invalidCount).toBe(2);
      expect(body.validCount + body.invalidCount).toBe(body.rowCount);
    });
  });

  describe('Ticket 12 AC: no question exists in the bank after a preview', () => {
    it('assessmentQuestions table is empty after previewing even all-valid rows', async () => {
      const rows = [
        makeValidRow('Mathematics', 'Algebra', 1),
        makeValidRow('Mathematics', 'Algebra', 2),
      ];

      await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows })
        .expect(201);

      const existing = await database.db
        .select()
        .from(assessmentQuestions);

      expect(existing).toHaveLength(0);
    });
  });

  describe('Ticket 13 AC: committing a preview with invalid rows is refused and creates nothing', () => {
    it('returns 409 when the import contains invalid rows', async () => {
      const rows = [
        makeValidRow('Mathematics', 'Algebra', 1),
        makeValidRow('UNKNOWN', 'Algebra', 1),
      ];

      const { body: preview } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/imports/${preview.importId}/commit`)
        .set(...authHeader(app, admin))
        .expect(409);
    });

    it('no questions are created after a refused commit', async () => {
      const rows = [
        makeValidRow('Mathematics', 'Algebra', 1),
        makeValidRow('UNKNOWN', 'Algebra', 1),
      ];

      const { body: preview } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/imports/${preview.importId}/commit`)
        .set(...authHeader(app, admin))
        .expect(409);

      const existing = await database.db
        .select()
        .from(assessmentQuestions);

      expect(existing).toHaveLength(0);
    });
  });

  describe('Ticket 13 AC: a clean commit creates every question with its tags intact', () => {
    it('creates questions with correct subjectId, topicId, and difficulty', async () => {
      const rows = [
        makeValidRow('Mathematics', 'Algebra', 1, 'Quadratics'),
        makeValidRow('Mathematics', 'Algebra', 2),
      ];

      const { body: preview } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/imports/${preview.importId}/commit`)
        .set(...authHeader(app, admin))
        .expect(201);

      const { body: questions } = await request(app.getHttpServer())
        .get('/assessment/questions')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(questions.pagination.total).toBe(2);

      const q1 = questions.data.find(
        (q: { authoredDifficulty: number }) => q.authoredDifficulty === 1,
      );
      expect(q1).toBeDefined();
      expect(q1.subjectId).toBe(taxonomy.subjectId);
      expect(q1.topicId).toBe(taxonomy.topicId);
      expect(q1.subTopicId).toBe(taxonomy.subTopicId);

      const q2 = questions.data.find(
        (q: { authoredDifficulty: number }) => q.authoredDifficulty === 2,
      );
      expect(q2).toBeDefined();
      expect(q2.subjectId).toBe(taxonomy.subjectId);
      expect(q2.topicId).toBe(taxonomy.topicId);
      expect(q2.subTopicId).toBeNull();
    });

    it('import status moves to COMMITTED after the job runs', async () => {
      const row = makeValidRow('Mathematics', 'Algebra', 1);

      const { body: preview } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows: [row] })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/imports/${preview.importId}/commit`)
        .set(...authHeader(app, admin))
        .expect(201);

      const { body: committed } = await request(app.getHttpServer())
        .get(`/assessment/imports/${preview.importId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(committed.status).toBe('COMMITTED');
      expect(committed.processedCount).toBe(1);
      expect(committed.committedAt).not.toBeNull();
    });

    it('each committed row carries the questionId it created', async () => {
      const row = makeValidRow('Mathematics', 'Algebra', 1);

      const { body: preview } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows: [row] })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/imports/${preview.importId}/commit`)
        .set(...authHeader(app, admin))
        .expect(201);

      const { body: committed } = await request(app.getHttpServer())
        .get(`/assessment/imports/${preview.importId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(committed.rows[0].questionId).not.toBeNull();
    });
  });

  describe('Ticket 13 AC: request returns before import completes; draining completes it', () => {
    it('commit returns immediately with COMMITTING; drain transitions to COMMITTED', async () => {
      const deferredQueue = new DeferredJobQueue();
      const deferredApp = await createTestApp(database, clock, [
        { token: JOB_QUEUE, value: deferredQueue },
      ]);

      try {
        const row = makeValidRow('Mathematics', 'Algebra', 1);

        const { body: preview } = await request(deferredApp.getHttpServer())
          .post('/assessment/imports')
          .set(...authHeader(deferredApp, admin))
          .send({ rows: [row] })
          .expect(201);

        const { body: commitResult } = await request(deferredApp.getHttpServer())
          .post(`/assessment/imports/${preview.importId}/commit`)
          .set(...authHeader(deferredApp, admin))
          .expect(201);

        expect(commitResult.status).toBe('COMMITTING');

        const { body: duringCommit } = await request(deferredApp.getHttpServer())
          .get(`/assessment/imports/${preview.importId}`)
          .set(...authHeader(deferredApp, admin))
          .expect(200);

        expect(duringCommit.status).toBe('COMMITTING');

        const before = await database.db.select().from(assessmentQuestions);
        expect(before).toHaveLength(0);

        await deferredQueue.drain();

        const { body: afterDrain } = await request(deferredApp.getHttpServer())
          .get(`/assessment/imports/${preview.importId}`)
          .set(...authHeader(deferredApp, admin))
          .expect(200);

        expect(afterDrain.status).toBe('COMMITTED');
        expect(afterDrain.processedCount).toBe(1);

        const after = await database.db.select().from(assessmentQuestions);
        expect(after).toHaveLength(1);
      } finally {
        await deferredApp.close();
      }
    });
  });

  describe('Ticket 13 AC: progress is readable while the job runs and reports a terminal state when it ends', () => {
    it('status is COMMITTING before drain and COMMITTED with correct processedCount after drain', async () => {
      const deferredQueue = new DeferredJobQueue();
      const deferredApp = await createTestApp(database, clock, [
        { token: JOB_QUEUE, value: deferredQueue },
      ]);

      try {
        const rows = [
          makeValidRow('Mathematics', 'Algebra', 1),
          makeValidRow('Mathematics', 'Algebra', 2),
          makeValidRow('Mathematics', 'Algebra', 3),
        ];

        const { body: preview } = await request(deferredApp.getHttpServer())
          .post('/assessment/imports')
          .set(...authHeader(deferredApp, admin))
          .send({ rows })
          .expect(201);

        await request(deferredApp.getHttpServer())
          .post(`/assessment/imports/${preview.importId}/commit`)
          .set(...authHeader(deferredApp, admin))
          .expect(201);

        const { body: inProgress } = await request(deferredApp.getHttpServer())
          .get(`/assessment/imports/${preview.importId}`)
          .set(...authHeader(deferredApp, admin))
          .expect(200);

        expect(inProgress.status).toBe('COMMITTING');

        await deferredQueue.drain();

        const { body: done } = await request(deferredApp.getHttpServer())
          .get(`/assessment/imports/${preview.importId}`)
          .set(...authHeader(deferredApp, admin))
          .expect(200);

        expect(done.status).toBe('COMMITTED');
        expect(done.processedCount).toBe(3);
        expect(done.failureReason).toBeNull();
      } finally {
        await deferredApp.close();
      }
    });
  });

  describe('Ticket 13 AC: committing the same preview twice does not double-create', () => {
    it('second commit returns 409 and no extra questions are created', async () => {
      const rows = [
        makeValidRow('Mathematics', 'Algebra', 1),
        makeValidRow('Mathematics', 'Algebra', 2),
      ];

      const { body: preview } = await request(app.getHttpServer())
        .post('/assessment/imports')
        .set(...authHeader(app, admin))
        .send({ rows })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/imports/${preview.importId}/commit`)
        .set(...authHeader(app, admin))
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/imports/${preview.importId}/commit`)
        .set(...authHeader(app, admin))
        .expect(409);

      const created = await database.db.select().from(assessmentQuestions);
      expect(created).toHaveLength(2);
    });

    it('committing an already-committing import returns 409', async () => {
      const deferredQueue = new DeferredJobQueue();
      const deferredApp = await createTestApp(database, clock, [
        { token: JOB_QUEUE, value: deferredQueue },
      ]);

      try {
        const row = makeValidRow('Mathematics', 'Algebra', 1);

        const { body: preview } = await request(deferredApp.getHttpServer())
          .post('/assessment/imports')
          .set(...authHeader(deferredApp, admin))
          .send({ rows: [row] })
          .expect(201);

        await request(deferredApp.getHttpServer())
          .post(`/assessment/imports/${preview.importId}/commit`)
          .set(...authHeader(deferredApp, admin))
          .expect(201);

        await request(deferredApp.getHttpServer())
          .post(`/assessment/imports/${preview.importId}/commit`)
          .set(...authHeader(deferredApp, admin))
          .expect(409);

        await deferredQueue.drain();

        const created = await database.db.select().from(assessmentQuestions);
        expect(created).toHaveLength(1);
      } finally {
        await deferredApp.close();
      }
    });
  });
});
