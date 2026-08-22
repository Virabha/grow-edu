import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { sql } from 'drizzle-orm';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createBatch, createUser, enrol } from './support/factories';

describe('Wishlist (Ticket 27)', () => {
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
    await request(app.getHttpServer()).get('/me/wishlist').expect(401);
  });

  it('saves a batch to the wishlist', async () => {
    const batchId = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });

    await request(app.getHttpServer())
      .post(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    const res = await request(app.getHttpServer())
      .get('/me/wishlist')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].batchId).toBe(batchId);
  });

  it('saving the same batch twice does not duplicate', async () => {
    const batchId = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });

    await request(app.getHttpServer())
      .post(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    await request(app.getHttpServer())
      .post(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    const res = await request(app.getHttpServer())
      .get('/me/wishlist')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body).toHaveLength(1);
  });

  it('unsaves a batch', async () => {
    const batchId = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });

    await request(app.getHttpServer())
      .post(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    const res = await request(app.getHttpServer())
      .get('/me/wishlist')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it('list is private — another student cannot see it', async () => {
    const other: TestActor = await createUser(database, 'LEARNER');
    const batchId = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });

    await request(app.getHttpServer())
      .post(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    const res = await request(app.getHttpServer())
      .get('/me/wishlist')
      .set(...authHeader(app, other))
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it('a saved batch that stops being published stops appearing in the list', async () => {
    const batchId = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });

    await request(app.getHttpServer())
      .post(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    await database.db.execute(
      sql`UPDATE batches SET status = 'DRAFT' WHERE batch_id = ${batchId}`,
    );

    const res = await request(app.getHttpServer())
      .get('/me/wishlist')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it('enrolling does not remove the wishlist entry', async () => {
    const batchId = await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never });

    await request(app.getHttpServer())
      .post(`/me/wishlist/${batchId}`)
      .set(...authHeader(app, student))
      .expect(204);

    await enrol(database, batchId, student.userId);

    const res = await request(app.getHttpServer())
      .get('/me/wishlist')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body).toHaveLength(1);
  });
});
