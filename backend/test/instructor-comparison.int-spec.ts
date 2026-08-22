import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import {
  createUser,
  createBatch,
  enrol,
  assignInstructor,
} from './support/factories';
import {
  batchAttendance,
  batchDoubts,
  batchDoubtReplies,
  batchSessions,
} from '../src/database/schema';

describe('instructor-comparison', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let instructor1: TestActor;
  let instructor2: TestActor;

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
    instructor1 = await createUser(database, 'INSTRUCTOR');
    instructor2 = await createUser(database, 'INSTRUCTOR');
  });

  describe('GET /reports/instructors', () => {
    it('response includes attendance rate, completion rate and responsiveness per instructor', async () => {
      const batchId = await createBatch(database, admin.userId);
      await assignInstructor(database, batchId, instructor1.userId);
      const student = await createUser(database, 'LEARNER');
      await enrol(database, batchId, student.userId);

      const sessionId = crypto.randomUUID();
      await database.db.insert(batchSessions).values({
        sessionId,
        batchId,
        title: 'Session 1',
        type: 'LIVE' as never,
        status: 'COMPLETED' as never,
      });
      await database.db.insert(batchAttendance).values({
        batchId,
        sessionId,
        userId: student.userId,
        joinedAt: clock.now(),
      });

      const res = await request(app.getHttpServer())
        .get('/reports/instructors')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const stat = res.body.find((s: { instructorId: string }) => s.instructorId === instructor1.userId);
      expect(stat).toBeDefined();
      expect(stat.batchCount).toBe(1);
      expect(stat).toHaveProperty('attendanceRate');
      expect(stat).toHaveProperty('completionRate');
      expect(stat).toHaveProperty('avgDoubtResponseSeconds');
    });

    it('responsiveness derives from recorded timestamps not editable fields', async () => {
      const batchId = await createBatch(database, admin.userId);
      await assignInstructor(database, batchId, instructor1.userId);
      const student = await createUser(database, 'LEARNER');
      await enrol(database, batchId, student.userId);

      const doubtId = crypto.randomUUID();
      const doubtCreatedAt = new Date('2026-01-01T10:00:00Z');
      const replyCreatedAt = new Date('2026-01-01T11:00:00Z');

      await database.db.insert(batchDoubts).values({
        doubtId,
        batchId,
        askedBy: student.userId,
        title: 'Question',
        body: 'Body',
        createdAt: doubtCreatedAt,
      });
      await database.db.insert(batchDoubtReplies).values({
        doubtId,
        authorId: instructor1.userId,
        body: 'Reply',
        isOfficial: true,
        createdAt: replyCreatedAt,
      });

      const res = await request(app.getHttpServer())
        .get('/reports/instructors')
        .set(...authHeader(app, admin))
        .expect(200);

      const stat = res.body.find((s: { instructorId: string }) => s.instructorId === instructor1.userId);
      expect(stat).toBeDefined();
      expect(typeof stat.avgDoubtResponseSeconds).toBe('number');
      expect(stat.avgDoubtResponseSeconds).toBeCloseTo(3600, 0);
    });

    it('an instructor with no batches still appears with batchCount 0', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/instructors')
        .set(...authHeader(app, admin))
        .expect(200);

      const ids = res.body.map((s: { instructorId: string }) => s.instructorId);
      expect(ids).toContain(instructor1.userId);
      expect(ids).toContain(instructor2.userId);

      const stat1 = res.body.find((s: { instructorId: string }) => s.instructorId === instructor1.userId);
      expect(stat1.batchCount).toBe(0);
    });

    it('an INSTRUCTOR role user cannot read the comparison', async () => {
      await request(app.getHttpServer())
        .get('/reports/instructors')
        .set(...authHeader(app, instructor1))
        .expect(403);
    });

    it('the date range filters which batches are counted for each instructor', async () => {
      const earlyBatch = await createBatch(database, admin.userId, '0', {
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-06-30T00:00:00Z'),
      });
      const lateBatch = await createBatch(database, admin.userId, '0', {
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2026-06-30T00:00:00Z'),
      });

      await assignInstructor(database, earlyBatch, instructor1.userId);
      await assignInstructor(database, lateBatch, instructor1.userId);

      const allRes = await request(app.getHttpServer())
        .get('/reports/instructors')
        .set(...authHeader(app, admin))
        .expect(200);

      const allStat = allRes.body.find((s: { instructorId: string }) => s.instructorId === instructor1.userId);
      expect(allStat.batchCount).toBe(2);

      const filteredRes = await request(app.getHttpServer())
        .get('/reports/instructors?fromDate=2026-01-01&toDate=2026-12-31')
        .set(...authHeader(app, admin))
        .expect(200);

      const filteredStat = filteredRes.body.find((s: { instructorId: string }) => s.instructorId === instructor1.userId);
      expect(filteredStat.batchCount).toBe(1);
    });
  });
});
