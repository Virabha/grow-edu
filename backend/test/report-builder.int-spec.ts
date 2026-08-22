import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';

import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { REPORT_MAX_ROWS } from '../src/reporting/report-builder.service';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import {
  createUser,
  createCompany,
  createCorporateAdmin,
  createBatch,
  enrol,
} from './support/factories';
import { users } from '../src/database/schema';

describe('report-builder', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let queue: InlineJobQueue;
  const clock = new TestClock();

  let admin: TestActor;
  let instructor: TestActor;
  let companyId: string;
  let corpAdmin: TestActor;
  let corpAdmin2: TestActor;
  let companyId2: string;

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
    instructor = await createUser(database, 'INSTRUCTOR');
    companyId = await createCompany(database);
    corpAdmin = await createCorporateAdmin(database, companyId);
    companyId2 = await createCompany(database);
    corpAdmin2 = await createCorporateAdmin(database, companyId2);
  });

  describe('GET /reports/palette', () => {
    it('returns the list of available dimensions and measures', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/palette')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(Array.isArray(res.body.dimensions)).toBe(true);
      expect(Array.isArray(res.body.measures)).toBe(true);
      expect(res.body.dimensions.length).toBeGreaterThan(0);
      expect(res.body.measures.length).toBeGreaterThan(0);
    });

    it('rejects non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/reports/palette')
        .set(...authHeader(app, instructor))
        .expect(403);
    });
  });

  describe('POST /reports/run', () => {
    it('runs a valid report and returns rows', async () => {
      const batchId = await createBatch(database, admin.userId);
      const student = await createUser(database, 'LEARNER');
      await enrol(database, batchId, student.userId, { source: 'SELF_PURCHASE' });

      const res = await request(app.getHttpServer())
        .post('/reports/run')
        .set(...authHeader(app, admin))
        .send({ dimensions: ['enrollment.source'], measures: ['enrollment.count'] })
        .expect(201);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]['enrollment.count']).toBeGreaterThanOrEqual(1);
    });

    it('returns empty array when no rows match', async () => {
      const res = await request(app.getHttpServer())
        .post('/reports/run')
        .set(...authHeader(app, admin))
        .send({
          dimensions: ['enrollment.source'],
          measures: ['enrollment.count'],
          fromDate: '2030-01-01',
          toDate: '2030-12-31',
        })
        .expect(201);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('rejects an unknown dimension', async () => {
      await request(app.getHttpServer())
        .post('/reports/run')
        .set(...authHeader(app, admin))
        .send({ dimensions: ['drop table users; --'], measures: ['enrollment.count'] })
        .expect(400);
    });

    it('rejects an unknown measure', async () => {
      await request(app.getHttpServer())
        .post('/reports/run')
        .set(...authHeader(app, admin))
        .send({ dimensions: ['enrollment.source'], measures: ['1=1; drop table users; --'] })
        .expect(400);
    });

    it('rejects non-admin/non-corp-admin', async () => {
      await request(app.getHttpServer())
        .post('/reports/run')
        .set(...authHeader(app, instructor))
        .send({ dimensions: [], measures: ['enrollment.count'] })
        .expect(403);
    });

    it('corporate admin sees only their company enrollments', async () => {
      const batchId = await createBatch(database, admin.userId);
      const student1 = await createUser(database, 'LEARNER');
      const student2 = await createUser(database, 'LEARNER');

      await database.db.update(users).set({ companyId }).where(eq(users.userId, student1.userId));
      await database.db.update(users).set({ companyId: companyId2 }).where(eq(users.userId, student2.userId));

      await enrol(database, batchId, student1.userId, { source: 'CORPORATE_SEAT' });
      await enrol(database, batchId, student2.userId, { source: 'CORPORATE_SEAT' });

      const resAdmin = await request(app.getHttpServer())
        .post('/reports/run')
        .set(...authHeader(app, admin))
        .send({ dimensions: [], measures: ['enrollment.count'] })
        .expect(201);

      const resCorp = await request(app.getHttpServer())
        .post('/reports/run')
        .set(...authHeader(app, corpAdmin))
        .send({ dimensions: [], measures: ['enrollment.count'] })
        .expect(201);

      const adminCount = resAdmin.body[0]?.['enrollment.count'] ?? 0;
      const corpCount = resCorp.body[0]?.['enrollment.count'] ?? 0;

      expect(adminCount).toBeGreaterThanOrEqual(2);
      expect(corpCount).toBeLessThan(adminCount);
      expect(corpCount).toBe(1);
    });
  });

  describe('saved reports — viewer scope', () => {
    it('owner saves a report', async () => {
      const res = await request(app.getHttpServer())
        .post('/reports/saved')
        .set(...authHeader(app, admin))
        .send({
          title: 'My Report',
          dimensions: ['enrollment.source'],
          measures: ['enrollment.count'],
        })
        .expect(201);

      expect(res.body.reportId).toBeDefined();
      expect(res.body.title).toBe('My Report');
    });

    it('shared report is evaluated against viewer scope, not author scope', async () => {
      const batchId = await createBatch(database, admin.userId);
      const student1 = await createUser(database, 'LEARNER');
      const student2 = await createUser(database, 'LEARNER');

      await database.db.update(users).set({ companyId }).where(eq(users.userId, student1.userId));
      await database.db.update(users).set({ companyId: companyId2 }).where(eq(users.userId, student2.userId));
      await enrol(database, batchId, student1.userId, { source: 'CORPORATE_SEAT' });
      await enrol(database, batchId, student2.userId, { source: 'CORPORATE_SEAT' });

      const saveRes = await request(app.getHttpServer())
        .post('/reports/saved')
        .set(...authHeader(app, admin))
        .send({ title: 'Shared', dimensions: [], measures: ['enrollment.count'] })
        .expect(201);

      const reportId = saveRes.body.reportId;

      await request(app.getHttpServer())
        .post(`/reports/saved/${reportId}/share`)
        .set(...authHeader(app, admin))
        .send({ grantedTo: corpAdmin.userId })
        .expect(201);

      const adminRun = await request(app.getHttpServer())
        .post(`/reports/saved/${reportId}/run`)
        .set(...authHeader(app, admin))
        .expect(201);

      const corpRun = await request(app.getHttpServer())
        .post(`/reports/saved/${reportId}/run`)
        .set(...authHeader(app, corpAdmin))
        .expect(201);

      const adminCount = adminRun.body[0]?.['enrollment.count'] ?? 0;
      const corpCount = corpRun.body[0]?.['enrollment.count'] ?? 0;

      expect(adminCount).toBeGreaterThanOrEqual(2);
      expect(corpCount).toBe(1);
    });

    it('revoking a share stops access immediately', async () => {
      const saveRes = await request(app.getHttpServer())
        .post('/reports/saved')
        .set(...authHeader(app, admin))
        .send({ title: 'Revocable', dimensions: [], measures: ['enrollment.count'] })
        .expect(201);

      const reportId = saveRes.body.reportId;

      await request(app.getHttpServer())
        .post(`/reports/saved/${reportId}/share`)
        .set(...authHeader(app, admin))
        .send({ grantedTo: corpAdmin.userId })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/reports/saved/${reportId}/run`)
        .set(...authHeader(app, corpAdmin))
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/reports/saved/${reportId}/share/${corpAdmin.userId}`)
        .set(...authHeader(app, admin))
        .expect(204);

      await request(app.getHttpServer())
        .post(`/reports/saved/${reportId}/run`)
        .set(...authHeader(app, corpAdmin))
        .expect(403);
    });

    it('non-owner cannot run a report they were not shared', async () => {
      const saveRes = await request(app.getHttpServer())
        .post('/reports/saved')
        .set(...authHeader(app, admin))
        .send({ title: 'Private', dimensions: [], measures: ['enrollment.count'] })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/reports/saved/${saveRes.body.reportId}/run`)
        .set(...authHeader(app, corpAdmin))
        .expect(403);
    });
  });

  describe('MAX_ROWS bound', () => {
    it('caps result at the configured max rows', async () => {
      const boundedApp = await createTestApp(database, clock, [
        { token: REPORT_MAX_ROWS, value: 3 },
      ]);

      try {
        const batchId = await createBatch(database, admin.userId);
        const months = [
          '2026-01-15T00:00:00Z',
          '2026-02-15T00:00:00Z',
          '2026-03-15T00:00:00Z',
          '2026-04-15T00:00:00Z',
        ];
        for (const month of months) {
          const student = await createUser(database, 'LEARNER');
          await enrol(database, batchId, student.userId, {
            source: 'SELF_PURCHASE',
            createdAt: new Date(month),
          });
        }

        const res = await request(boundedApp.getHttpServer())
          .post('/reports/run')
          .set(...authHeader(boundedApp, admin))
          .send({ dimensions: ['enrollment.month'], measures: ['enrollment.count'] })
          .expect(201);

        expect(res.body.length).toBeLessThanOrEqual(3);
      } finally {
        await boundedApp.close();
      }
    });
  });

  describe('scheduling', () => {
    const SCHEDULE_JOB = 'saved-reports.schedule';

    it('schedule() stores a schedule and the job runs it without failures', async () => {
      const saveRes = await request(app.getHttpServer())
        .post('/reports/saved')
        .set(...authHeader(app, admin))
        .send({ title: 'Scheduled', dimensions: [], measures: ['enrollment.count'] })
        .expect(201);

      const reportId = saveRes.body.reportId;

      const schedRes = await request(app.getHttpServer())
        .post(`/reports/saved/${reportId}/schedule`)
        .set(...authHeader(app, admin))
        .send({ cadence: 'DAILY' })
        .expect(201);

      expect(schedRes.body.scheduleId).toBeDefined();
      expect(schedRes.body.cadence).toBe('DAILY');

      const failuresBefore = queue.failureCount(SCHEDULE_JOB);
      clock.advance(25 * 60 * 60 * 1000);
      await queue.tick();

      expect(queue.failureCount(SCHEDULE_JOB)).toBe(failuresBefore);

      const schedState = await request(app.getHttpServer())
        .get(`/reports/saved/${reportId}/schedule`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(schedState.body.lastRunAt).toBeDefined();
    });
  });

  describe('export', () => {
    it('export produces the same rows as interactive run for the same viewer', async () => {
      const batchId = await createBatch(database, admin.userId);
      const student = await createUser(database, 'LEARNER');
      await enrol(database, batchId, student.userId, { source: 'SELF_PURCHASE' });

      const saveRes = await request(app.getHttpServer())
        .post('/reports/saved')
        .set(...authHeader(app, admin))
        .send({ title: 'Export Test', dimensions: ['enrollment.source'], measures: ['enrollment.count'] })
        .expect(201);

      const reportId = saveRes.body.reportId;

      const runRes = await request(app.getHttpServer())
        .post(`/reports/saved/${reportId}/run`)
        .set(...authHeader(app, admin))
        .expect(201);

      const exportRes = await request(app.getHttpServer())
        .get(`/reports/saved/${reportId}/export`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(exportRes.body).toEqual(runRes.body);
    });
  });
});
