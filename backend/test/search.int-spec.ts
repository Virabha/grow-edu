import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { sql } from 'drizzle-orm';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { createTestApp, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createBatch, createUser } from './support/factories';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';

describe('Search (Ticket 25)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let queue: InlineJobQueue;
  let admin: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    app = await createTestApp(database, clock);
    queue = app.get<InlineJobQueue>(JOB_QUEUE);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
  });

  async function triggerSync() {
    await queue.enqueue('discovery.search.sync', undefined);
  }

  it('finds a batch by title using full-text stemming (learning finds Learn)', async () => {
    await createBatch(database, admin.userId, '0', {
      title: 'Learn Physics with Motion',
      status: 'ONGOING' as never,
    });

    await triggerSync();

    const res = await request(app.getHttpServer())
      .get('/search?q=learning+physics')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.some((r: { title: string }) => r.title.includes('Physics'));
    expect(found).toBe(true);
  });

  it('finds a batch by description (full-text, word-order independent)', async () => {
    await createBatch(database, admin.userId, '0', {
      title: 'Chemistry Batch',
      description: 'Master organic reactions for competitive exams',
      status: 'ONGOING' as never,
    });

    await triggerSync();

    const res = await request(app.getHttpServer())
      .get('/search?q=reactions+organic')
      .expect(200);

    const found = res.body.some((r: { title: string }) => r.title.includes('Chemistry'));
    expect(found).toBe(true);
  });

  it('finds an instructor by name', async () => {
    const instructor = await createUser(database, 'INSTRUCTOR');
    await database.db.execute(
      sql`INSERT INTO instructor_profiles (profile_id, user_id, is_active, created_at, updated_at)
          VALUES (gen_random_uuid(), ${instructor.userId}, true, now(), now())
          ON CONFLICT DO NOTHING`,
    );
    await database.db.execute(
      sql`UPDATE users SET first_name = 'Ramanujan', last_name = 'Sharma' WHERE user_id = ${instructor.userId}`,
    );

    await triggerSync();

    const res = await request(app.getHttpServer())
      .get('/search?q=ramanujan&kind=INSTRUCTOR')
      .expect(200);

    const found = res.body.some((r: { title: string }) => r.title.includes('Ramanujan'));
    expect(found).toBe(true);
  });

  it('excludes unpublished batches from search', async () => {
    await createBatch(database, admin.userId, '0', {
      title: 'Hidden Draft Batch XQZ',
      status: 'DRAFT' as never,
    });

    await triggerSync();

    const res = await request(app.getHttpServer())
      .get('/search?q=hidden+draft+XQZ')
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it('excludes CORPORATE_ONLY batches from search', async () => {
    await createBatch(database, admin.userId, '0', {
      title: 'Corporate Secret Batch ZQX',
      status: 'ONGOING' as never,
      visibility: 'CORPORATE_ONLY' as never,
    });

    await triggerSync();

    const res = await request(app.getHttpServer())
      .get('/search?q=corporate+secret+ZQX')
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it('returns 400 for an empty query string', async () => {
    await request(app.getHttpServer())
      .get('/search?q=')
      .expect(400);
  });

  it('returns empty for nonsense query with no matching tokens', async () => {
    await createBatch(database, admin.userId, '0', {
      title: 'Physics Batch',
      status: 'ONGOING' as never,
    });
    await triggerSync();

    const res = await request(app.getHttpServer())
      .get('/search?q=xyzqrtnblorgfoobar')
      .expect(200);

    expect(res.body).toHaveLength(0);
  });
});
