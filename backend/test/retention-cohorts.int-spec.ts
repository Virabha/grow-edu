import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';

import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { RetentionService } from '../src/reporting/retention.service';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import {
  createUser,
  createBatch,
  enrol,
  createCompany,
  createCorporateAdmin,
} from './support/factories';
import { users } from '../src/database/schema';

const COHORT_JOB = 'retention-cohorts.compute';

describe('retention-cohorts', () => {
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

  describe('GET /reports/retention', () => {
    it('returns empty when no cohorts computed yet', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/retention')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('serves materialized rows after job runs', async () => {
      const batchId = await createBatch(database, admin.userId);
      const student1 = await createUser(database, 'LEARNER');
      const student2 = await createUser(database, 'LEARNER');

      await enrol(database, batchId, student1.userId, { source: 'SELF_PURCHASE' });
      await enrol(database, batchId, student2.userId, { source: 'CORPORATE_SEAT' });

      await queue.enqueue(COHORT_JOB, undefined);

      const res = await request(app.getHttpServer())
        .get('/reports/retention')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].activeCount).toBeGreaterThanOrEqual(1);
    });

    it('does not recompute on read - serves stored rows only', async () => {
      const batchId = await createBatch(database, admin.userId);
      const student1 = await createUser(database, 'LEARNER');
      clock.set(new Date('2026-01-15T00:00:00Z'));
      await enrol(database, batchId, student1.userId, {
        source: 'SELF_PURCHASE',
        createdAt: clock.now(),
      });

      await queue.enqueue(COHORT_JOB, undefined);

      const snapshot1 = await request(app.getHttpServer())
        .get('/reports/retention')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(snapshot1.body.filter((r: { cohortMonth: string }) => r.cohortMonth === '2026-01').length)
        .toBeGreaterThan(0);

      const student2 = await createUser(database, 'LEARNER');
      await enrol(database, batchId, student2.userId, {
        source: 'SELF_PURCHASE',
        createdAt: new Date('2026-02-15T00:00:00Z'),
      });

      const snapshot2 = await request(app.getHttpServer())
        .get('/reports/retention')
        .set(...authHeader(app, admin))
        .expect(200);

      const feb2026Count = snapshot2.body.filter((r: { cohortMonth: string }) => r.cohortMonth === '2026-02').length;
      expect(feb2026Count).toBe(0);
      expect(snapshot2.body.length).toBe(snapshot1.body.length);
    });

    it('a computation failure leaves previous rows readable', async () => {
      const batchId = await createBatch(database, admin.userId);
      const student = await createUser(database, 'LEARNER');
      clock.set(new Date('2026-01-15T00:00:00Z'));
      await enrol(database, batchId, student.userId, {
        source: 'SELF_PURCHASE',
        createdAt: clock.now(),
      });

      await queue.enqueue(COHORT_JOB, undefined);

      const firstRead = await request(app.getHttpServer())
        .get('/reports/retention')
        .set(...authHeader(app, admin))
        .expect(200);
      expect(firstRead.body.length).toBeGreaterThan(0);
      const originalCount = firstRead.body.length;

      const retentionService = app.get(RetentionService);
      const spy = jest.spyOn(retentionService, 'computeCohorts').mockRejectedValue(
        new Error('simulated db failure'),
      );
      await queue.enqueue(COHORT_JOB, undefined);
      spy.mockRestore();

      const secondRead = await request(app.getHttpServer())
        .get('/reports/retention')
        .set(...authHeader(app, admin))
        .expect(200);
      expect(secondRead.body.length).toBe(originalCount);
    });

    it('includes cohort breakdown by source', async () => {
      const batchId = await createBatch(database, admin.userId);

      const s1 = await createUser(database, 'LEARNER');
      const s2 = await createUser(database, 'LEARNER');
      await enrol(database, batchId, s1.userId, { source: 'SELF_PURCHASE' });
      await enrol(database, batchId, s2.userId, { source: 'CORPORATE_SEAT' });

      await queue.enqueue(COHORT_JOB, undefined);

      const res = await request(app.getHttpServer())
        .get('/reports/retention')
        .set(...authHeader(app, admin))
        .expect(200);

      const sources = res.body.map((r: { source: string }) => r.source);
      expect(sources).toContain('SELF_PURCHASE');
      expect(sources).toContain('CORPORATE_SEAT');
    });

    it('includes cohort month and period offset in rows', async () => {
      const batchId = await createBatch(database, admin.userId);
      const student = await createUser(database, 'LEARNER');
      const jan2026 = new Date('2026-01-15T00:00:00Z');
      await enrol(database, batchId, student.userId, {
        source: 'SELF_PURCHASE',
        createdAt: jan2026,
      });

      clock.set(new Date('2026-04-01T00:00:00Z'));
      await queue.enqueue(COHORT_JOB, undefined);

      const res = await request(app.getHttpServer())
        .get('/reports/retention')
        .set(...authHeader(app, admin))
        .expect(200);

      const janRow = res.body.find(
        (r: { cohortMonth: string; source: string }) =>
          r.cohortMonth === '2026-01' && r.source === 'SELF_PURCHASE',
      );

      expect(janRow).toBeDefined();
      expect(janRow.periodOffset).toBe(3);
    });

    it('the job is registered with the queue and fires on schedule', async () => {
      const failuresBefore = queue.failureCount(COHORT_JOB);

      const batchId = await createBatch(database, admin.userId);
      const student = await createUser(database, 'LEARNER');
      await enrol(database, batchId, student.userId, { source: 'SELF_PURCHASE' });

      clock.advance(25 * 60 * 60 * 1000);
      await queue.tick();

      expect(queue.failureCount(COHORT_JOB)).toBe(failuresBefore);
    });

    it('rejects non-admin users', async () => {
      const learner = await createUser(database, 'LEARNER');
      await request(app.getHttpServer())
        .get('/reports/retention')
        .set(...authHeader(app, learner))
        .expect(403);
    });

    it('corporate admin sees only their company cohort rows', async () => {
      const companyId1 = await createCompany(database);
      const companyId2 = await createCompany(database);
      const corpAdmin1 = await createCorporateAdmin(database, companyId1);
      const corpAdmin2 = await createCorporateAdmin(database, companyId2);

      const batchId = await createBatch(database, admin.userId);

      const student1 = await createUser(database, 'LEARNER');
      const student2 = await createUser(database, 'LEARNER');
      await database.db.update(users).set({ companyId: companyId1 }).where(eq(users.userId, student1.userId));
      await database.db.update(users).set({ companyId: companyId2 }).where(eq(users.userId, student2.userId));

      await enrol(database, batchId, student1.userId, {
        source: 'CORPORATE_SEAT',
        createdAt: new Date('2026-01-15T00:00:00Z'),
      });
      await enrol(database, batchId, student2.userId, {
        source: 'CORPORATE_SEAT',
        createdAt: new Date('2026-01-15T00:00:00Z'),
      });

      clock.set(new Date('2026-01-15T00:00:00Z'));
      await queue.enqueue(COHORT_JOB, undefined);

      const adminRes = await request(app.getHttpServer())
        .get('/reports/retention')
        .set(...authHeader(app, admin))
        .expect(200);
      expect(adminRes.body.length).toBeGreaterThanOrEqual(2);

      const corp1Res = await request(app.getHttpServer())
        .get('/reports/retention')
        .set(...authHeader(app, corpAdmin1))
        .expect(200);
      const corp1Companies = corp1Res.body.map((r: { companyId: string }) => r.companyId);
      expect(corp1Companies.every((id: string) => id === companyId1)).toBe(true);

      const corp2Res = await request(app.getHttpServer())
        .get('/reports/retention')
        .set(...authHeader(app, corpAdmin2))
        .expect(200);
      const corp2Companies = corp2Res.body.map((r: { companyId: string }) => r.companyId);
      expect(corp2Companies.every((id: string) => id === companyId2)).toBe(true);

      expect(corp1Res.body.length).toBeLessThan(adminRes.body.length);
    });
  });
});
