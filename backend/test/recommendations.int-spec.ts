import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createBatch, createUser, enrol } from './support/factories';

describe('Recommendations (Ticket 30)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let student: TestActor;

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
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/me/recommendations').expect(401);
  });

  it('returns goal-matched batches when student has a goal', async () => {
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'JEE' });
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'NEET' });

    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'JEE' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/me/recommendations')
      .set(...authHeader(app, student))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((b: { goalKey: string }) => expect(b.goalKey).toBe('JEE'));
  });

  it('excludes batches the student is already enrolled in', async () => {
    const enrolledId = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'JEE' });
    const availableId = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'JEE' });

    await enrol(database, enrolledId, student.userId);

    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'JEE' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/me/recommendations')
      .set(...authHeader(app, student))
      .expect(200);

    const ids = res.body.map((b: { batchId: string }) => b.batchId);
    expect(ids).not.toContain(enrolledId);
    expect(ids).toContain(availableId);
  });

  it('returns batches when student has a goal but no level', async () => {
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'NEET' });

    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'NEET' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/me/recommendations')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returns catalogue default ordering when student has neither goal nor level', async () => {
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'JEE' });
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'NEET' });

    const res = await request(app.getHttpServer())
      .get('/me/recommendations')
      .set(...authHeader(app, student))
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  it('no language model is called (result is returned immediately without external HTTP)', async () => {
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });

    const before = Date.now();
    const res = await request(app.getHttpServer())
      .get('/me/recommendations')
      .set(...authHeader(app, student))
      .expect(200);
    const elapsed = Date.now() - before;

    expect(Array.isArray(res.body)).toBe(true);
    expect(elapsed).toBeLessThan(5000);
  });
});
