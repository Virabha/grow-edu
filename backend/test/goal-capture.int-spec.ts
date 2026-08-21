import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createBatch, createUser } from './support/factories';
import { eq } from 'drizzle-orm';
import { studentProfiles, users } from '../src/database/schema';

describe('Goal Capture (Ticket 28)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let student: TestActor;
  let admin: TestActor;

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

  it('GET /me/goal/options returns owner-managed goal list', async () => {
    const res = await request(app.getHttpServer())
      .get('/me/goal/options')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toMatchObject({ key: expect.any(String), label: expect.any(String) });
  });

  it('requires authentication to set a goal', async () => {
    await request(app.getHttpServer())
      .put('/me/goal')
      .send({ goalKey: 'JEE' })
      .expect(401);
  });

  it('requires authentication to get a goal', async () => {
    await request(app.getHttpServer())
      .get('/me/goal')
      .expect(401);
  });

  it('sets a valid goal', async () => {
    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'JEE' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/me/goal')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.goalKey).toBe('JEE');
  });

  it('rejects a goal key not in the configured set', async () => {
    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'INVALID_GOAL_XYZ' })
      .expect(400);
  });

  it('editing the goal updates immediately', async () => {
    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'JEE' })
      .expect(200);

    await request(app.getHttpServer())
      .put('/me/goal')
      .set(...authHeader(app, student))
      .send({ goalKey: 'NEET' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/me/goal')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.goalKey).toBe('NEET');
  });

  it('catalogue defaults to student goal when signed in', async () => {
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

  it('student without a goal still gets an unfiltered catalogue', async () => {
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'JEE' });
    await createBatch(database, admin.userId, '0', { status: 'ONGOING' as never, goalKey: 'NEET' });

    const res = await request(app.getHttpServer())
      .get('/catalogue')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.data.length).toBe(2);
  });
  it('captures a goal at sign-up and stores it against the account', async () => {
    const email = `signup-goal-${Date.now()}@example.test`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Str0ng!Pass', firstName: 'Ada', goalKey: 'NEET' })
      .expect(201);

    const [created] = await database.db
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.email, email));

    const [profile] = await database.db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, created.userId));

    expect(profile.goalKey).toBe('NEET');
  });

  it('refuses a sign-up goal that is not in the owner-managed set', async () => {
    const email = `signup-bad-goal-${Date.now()}@example.test`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Str0ng!Pass', goalKey: 'ASTROPHYSICS' })
      .expect(400);

    const rows = await database.db
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.email, email));
    expect(rows).toEqual([]);
  });
});
