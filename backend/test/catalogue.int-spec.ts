import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createBatch, createUser } from './support/factories';

describe('Catalogue (Ticket 24)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

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
  });

  it('is publicly readable without a token', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, visibility: 'PUBLIC' as never });

    const res = await request(app.getHttpServer()).get('/catalogue').expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('excludes draft batches', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    await createBatch(database, admin.userId, '0', { status: 'DRAFT' as never });

    const res = await request(app.getHttpServer()).get('/catalogue').expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('excludes deleted batches', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, isDeleted: true });

    const res = await request(app.getHttpServer()).get('/catalogue').expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('excludes CORPORATE_ONLY batches', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, visibility: 'CORPORATE_ONLY' as never });

    const res = await request(app.getHttpServer()).get('/catalogue').expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('filters compose: goalKey AND language narrow results', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    await createBatch(database, admin.userId, '0', {
      status: 'ONGOING' as never,
      goalKey: 'JEE',
      language: 'Hindi',
    });
    await createBatch(database, admin.userId, '0', {
      status: 'ONGOING' as never,
      goalKey: 'NEET',
      language: 'Hindi',
    });
    await createBatch(database, admin.userId, '0', {
      status: 'ONGOING' as never,
      goalKey: 'JEE',
      language: 'English',
    });

    const res = await request(app.getHttpServer())
      .get('/catalogue?goalKey=JEE&language=Hindi')
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].goalKey).toBe('JEE');
    expect(res.body.data[0].language).toBe('Hindi');
  });

  it('paginates stably under repeated requests', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    for (let i = 0; i < 5; i++) {
      await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });
    }

    const res1 = await request(app.getHttpServer()).get('/catalogue?limit=3&page=1').expect(200);
    const res2 = await request(app.getHttpServer()).get('/catalogue?limit=3&page=1').expect(200);
    expect(res1.body.data.map((b: { batchId: string }) => b.batchId))
      .toEqual(res2.body.data.map((b: { batchId: string }) => b.batchId));
    expect(res1.body.data).toHaveLength(3);
  });

  it('does not leak compareAtPrice, capacity, createdBy, or enrolment data', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    await createBatch(database, admin.userId, '0', {
      status: 'ONGOING' as never,
      compareAtPrice: '999',
      capacity: 100,
    });

    const res = await request(app.getHttpServer()).get('/catalogue').expect(200);
    const batch = res.body.data[0];
    expect(batch).toBeDefined();
    expect(batch.compareAtPrice).toBeUndefined();
    expect(batch.capacity).toBeUndefined();
    expect(batch.createdBy).toBeUndefined();
    expect(batch.enrollmentCount).toBeUndefined();
    expect(batch.enrollments).toBeUndefined();
  });

  it('uses signed-in student goal as default filter when no goal param provided', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const student: TestActor = await createUser(database, 'LEARNER');

    await createBatch(database, admin.userId, '0', {
      status: 'ONGOING' as never,
      goalKey: 'JEE',
    });
    await createBatch(database, admin.userId, '0', {
      status: 'ONGOING' as never,
      goalKey: 'NEET',
    });

    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'JEE' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/catalogue')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach((b: { goalKey: string }) => expect(b.goalKey).toBe('JEE'));
  });

  it('returns unfiltered catalogue when signed-in student has no goal', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const student: TestActor = await createUser(database, 'LEARNER');

    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'JEE' });
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'NEET' });

    const res = await request(app.getHttpServer())
      .get('/catalogue')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.data.length).toBe(2);
  });
});
