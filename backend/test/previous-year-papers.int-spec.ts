import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTaxonomy,
  createQuestion,
  createTest,
  placeQuestion,
  seedDifficultyScale,
  Taxonomy,
} from './support/assessment-factories';
import { createBatch, createUser } from './support/factories';
import { authHeader, TestActor } from './support/test-app';
import { createTestApp } from './support/test-app';
import { createTestDatabase, TestDatabase, truncateAll } from './support/test-database';
import { TestClock } from './support/test-clock';

describe('previous-year papers (ticket 19)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let admin: TestActor;
  let learner: TestActor;
  let taxonomy: Taxonomy;

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    app = await createTestApp(database, clock);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    await truncateAll(database);
    clock.set('2026-01-01T00:00:00.000Z');
    admin = await createUser(database, 'PLATFORM_ADMIN');
    learner = await createUser(database, 'LEARNER');
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, admin.userId);
  });

  it('a test can carry exam, year, and paper-label metadata', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/assessment/tests')
      .set(...authHeader(app, admin))
      .send({
        title: 'JEE Mains 2023 Paper 1',
        examLabel: 'JEE_MAINS',
        examYear: 2023,
        paperLabel: 'PAPER_1',
      })
      .expect(201);

    expect(body.examLabel).toBe('JEE_MAINS');
    expect(body.examYear).toBe(2023);
    expect(body.paperLabel).toBe('PAPER_1');
  });

  it('a learner can list available papers', async () => {
    await request(app.getHttpServer())
      .post('/assessment/tests')
      .set(...authHeader(app, admin))
      .send({
        title: 'JEE Mains 2023 Paper 1',
        examLabel: 'JEE_MAINS',
        examYear: 2023,
        paperLabel: 'PAPER_1',
      })
      .expect(201);

    const { body } = await request(app.getHttpServer())
      .get('/assessment/papers')
      .set(...authHeader(app, learner))
      .expect(200);

    expect(body).toHaveLength(1);
    expect(body[0].examLabel).toBe('JEE_MAINS');
  });

  it('papers can be filtered by examLabel', async () => {
    await request(app.getHttpServer())
      .post('/assessment/tests')
      .set(...authHeader(app, admin))
      .send({
        title: 'JEE Mains 2023',
        examLabel: 'JEE_MAINS',
        examYear: 2023,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/assessment/tests')
      .set(...authHeader(app, admin))
      .send({
        title: 'NEET 2023',
        examLabel: 'NEET',
        examYear: 2023,
      })
      .expect(201);

    const { body } = await request(app.getHttpServer())
      .get('/assessment/papers?examLabel=JEE_MAINS')
      .set(...authHeader(app, learner))
      .expect(200);

    expect(body).toHaveLength(1);
    expect(body[0].examLabel).toBe('JEE_MAINS');
  });

  it('papers can be filtered by examYear', async () => {
    await request(app.getHttpServer())
      .post('/assessment/tests')
      .set(...authHeader(app, admin))
      .send({ title: 'JEE 2022', examLabel: 'JEE_MAINS', examYear: 2022 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/assessment/tests')
      .set(...authHeader(app, admin))
      .send({ title: 'JEE 2023', examLabel: 'JEE_MAINS', examYear: 2023 })
      .expect(201);

    const { body } = await request(app.getHttpServer())
      .get('/assessment/papers?examYear=2023')
      .set(...authHeader(app, learner))
      .expect(200);

    expect(body).toHaveLength(1);
    expect(body[0].examYear).toBe(2023);
  });

  it('a test without exam metadata does not appear in the papers listing', async () => {
    await request(app.getHttpServer())
      .post('/assessment/tests')
      .set(...authHeader(app, admin))
      .send({ title: 'Practice test without exam label' })
      .expect(201);

    const { body } = await request(app.getHttpServer())
      .get('/assessment/papers')
      .set(...authHeader(app, learner))
      .expect(200);

    expect(body).toHaveLength(0);
  });

  it('the metadata is optional and its absence changes nothing about test creation', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/assessment/tests')
      .set(...authHeader(app, admin))
      .send({ title: 'Regular test' })
      .expect(201);

    expect(body.examLabel).toBeNull();
    expect(body.examYear).toBeNull();
    expect(body.paperLabel).toBeNull();
  });

  it('a paper is not listed as a batch test unless assigned to that batch', async () => {
    const batchId = await createBatch(database, admin.userId, '0');

    await request(app.getHttpServer())
      .post('/assessment/tests')
      .set(...authHeader(app, admin))
      .send({ title: 'JEE 2023 standalone', examLabel: 'JEE_MAINS', examYear: 2023 })
      .expect(201);

    const { body: allPapers } = await request(app.getHttpServer())
      .get('/assessment/papers')
      .set(...authHeader(app, learner))
      .expect(200);

    const { body: batchTests } = await request(app.getHttpServer())
      .get(`/assessment/tests?batchId=${batchId}`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(allPapers).toHaveLength(1);
    expect(batchTests).toHaveLength(0);
  });

  it('a paper assigned to a batch appears in that batch test list', async () => {
    const batchId = await createBatch(database, admin.userId, '0');
    const testId = await createTest(database, admin.userId, {
      examLabel: 'JEE_MAINS',
      examYear: 2024,
      batchId,
    });

    const { body: batchTests } = await request(app.getHttpServer())
      .get(`/assessment/tests?batchId=${batchId}`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(batchTests.some((t: { testId: string }) => t.testId === testId)).toBe(true);
  });
});
