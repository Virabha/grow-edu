import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';

import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser, createCompany, createCorporateAdmin } from './support/factories';
import { funnelEvents, users } from '../src/database/schema';

describe('funnel-analytics', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let queue: InlineJobQueue;
  const clock = new TestClock();

  let admin: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
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

  describe('POST /events (event capture)', () => {
    it('captures an event without requiring auth', async () => {
      await request(app.getHttpServer())
        .post('/events')
        .send({ kind: 'PAGE_VIEW', source: 'google' })
        .expect(202);
    });

    it('captures events with optional fields', async () => {
      await request(app.getHttpServer())
        .post('/events')
        .send({
          kind: 'CHECKOUT_START',
          batchId: 'some-batch',
          source: 'direct',
          sessionKey: 'anon-abc123',
        })
        .expect(202);
    });

    it('rejects unknown event kinds', async () => {
      await request(app.getHttpServer())
        .post('/events')
        .send({ kind: 'UNKNOWN_KIND' })
        .expect(400);
    });

    it('never fails the caller on malformed optional fields', async () => {
      await request(app.getHttpServer())
        .post('/events')
        .send({ kind: 'PAGE_VIEW' })
        .expect(202);
    });
  });

  describe('GET /reports/funnel', () => {
    it('returns all four stages', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/funnel')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(res.body.stages).toHaveLength(4);
      const kinds = res.body.stages.map((s: { kind: string }) => s.kind);
      expect(kinds).toContain('PAGE_VIEW');
      expect(kinds).toContain('CATALOGUE_VIEW');
      expect(kinds).toContain('CHECKOUT_START');
      expect(kinds).toContain('CHECKOUT_COMPLETE');
    });

    it('stages with no captured data read as null not zero', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/funnel')
        .set(...authHeader(app, admin))
        .expect(200);

      for (const stage of res.body.stages) {
        expect(stage.count).toBeNull();
      }
    });

    it('stages with captured data return a count', async () => {
      await request(app.getHttpServer())
        .post('/events')
        .send({ kind: 'PAGE_VIEW', source: 'google' })
        .expect(202);

      await request(app.getHttpServer())
        .post('/events')
        .send({ kind: 'PAGE_VIEW', source: 'google' })
        .expect(202);

      const res = await request(app.getHttpServer())
        .get('/reports/funnel')
        .set(...authHeader(app, admin))
        .expect(200);

      const pageView = res.body.stages.find((s: { kind: string }) => s.kind === 'PAGE_VIEW');
      expect(pageView.count).toBe(2);

      const checkout = res.body.stages.find((s: { kind: string }) => s.kind === 'CHECKOUT_START');
      expect(checkout.count).toBeNull();
    });

    it('filters by source', async () => {
      await request(app.getHttpServer())
        .post('/events')
        .send({ kind: 'PAGE_VIEW', source: 'google' })
        .expect(202);

      await request(app.getHttpServer())
        .post('/events')
        .send({ kind: 'PAGE_VIEW', source: 'direct' })
        .expect(202);

      const res = await request(app.getHttpServer())
        .get('/reports/funnel?source=google')
        .set(...authHeader(app, admin))
        .expect(200);

      const pageView = res.body.stages.find((s: { kind: string }) => s.kind === 'PAGE_VIEW');
      expect(pageView.count).toBe(1);
    });

    it('filters by date range', async () => {
      clock.set('2026-01-15T12:00:00Z');
      await request(app.getHttpServer())
        .post('/events')
        .send({ kind: 'PAGE_VIEW', source: 'google' })
        .expect(202);

      clock.set('2026-06-15T12:00:00Z');
      await request(app.getHttpServer())
        .post('/events')
        .send({ kind: 'PAGE_VIEW', source: 'google' })
        .expect(202);

      const res = await request(app.getHttpServer())
        .get('/reports/funnel?fromDate=2026-01-01&toDate=2026-03-01')
        .set(...authHeader(app, admin))
        .expect(200);

      const pageView = res.body.stages.find((s: { kind: string }) => s.kind === 'PAGE_VIEW');
      expect(pageView.count).toBe(1);
    });

    it('rejects non-admin users', async () => {
      const learner = await createUser(database, 'LEARNER');
      await request(app.getHttpServer())
        .get('/reports/funnel')
        .set(...authHeader(app, learner))
        .expect(403);
    });

    it('corporate admin sees only events attributed to their company students', async () => {
      const companyId = await createCompany(database);
      const corpAdmin = await createCorporateAdmin(database, companyId);
      const companyStudent = await createUser(database, 'LEARNER');
      await database.db
        .update(users)
        .set({ companyId })
        .where(eq(users.userId, companyStudent.userId));

      await database.db.insert(funnelEvents).values({
        kind: 'PAGE_VIEW' as never,
        source: 'google',
        userId: companyStudent.userId,
        capturedAt: clock.now(),
      });
      await database.db.insert(funnelEvents).values({
        kind: 'PAGE_VIEW' as never,
        source: 'google',
        userId: null,
        capturedAt: clock.now(),
      });

      const adminRes = await request(app.getHttpServer())
        .get('/reports/funnel')
        .set(...authHeader(app, admin))
        .expect(200);
      const adminPageView = adminRes.body.stages.find((s: { kind: string }) => s.kind === 'PAGE_VIEW');
      expect(adminPageView.count).toBe(2);

      const corpRes = await request(app.getHttpServer())
        .get('/reports/funnel')
        .set(...authHeader(app, corpAdmin))
        .expect(200);
      const corpPageView = corpRes.body.stages.find((s: { kind: string }) => s.kind === 'PAGE_VIEW');
      expect(corpPageView.count).toBe(1);
    });

    it('event pruning job removes old events', async () => {
      await request(app.getHttpServer())
        .post('/events')
        .send({ kind: 'PAGE_VIEW' })
        .expect(202);

      clock.advance((91 * 24 + 25) * 60 * 60 * 1000);
      await queue.tick();

      const res = await request(app.getHttpServer())
        .get('/reports/funnel')
        .set(...authHeader(app, admin))
        .expect(200);

      const pageView = res.body.stages.find((s: { kind: string }) => s.kind === 'PAGE_VIEW');
      expect(pageView.count).toBeNull();
    });
  });
});
