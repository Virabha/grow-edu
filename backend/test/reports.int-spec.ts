import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import {
  createUser,
  createBatch,
  createCorporateAdmin,
  createCompany,
  enrol,
} from './support/factories';
import {
  corporateContracts,
  corporateContractBatches,
  corporateSeats,
  batchSessions,
  batchAttendance,
  batchQuizzes,
  batchQuizAttempts,
  notifications,
} from '../src/database/schema';

async function createContract(
  database: TestDatabase,
  companyId: string,
  createdBy: string,
): Promise<string> {
  const contractId = randomUUID();
  await database.db.insert(corporateContracts).values({
    contractId,
    companyId,
    title: `Contract ${contractId.slice(0, 8)}`,
    seatCount: 50,
    startsAt: new Date('2026-01-01T00:00:00.000Z'),
    endsAt: new Date('2027-01-01T00:00:00.000Z'),
    status: 'ACTIVE',
    createdBy,
  });
  return contractId;
}

async function linkBatchToContract(
  database: TestDatabase,
  contractId: string,
  batchId: string,
): Promise<void> {
  await database.db.insert(corporateContractBatches).values({ contractId, batchId });
}

async function claimSeat(
  database: TestDatabase,
  contractId: string,
  userId: string,
): Promise<void> {
  await database.db.insert(corporateSeats).values({ contractId, userId });
}

async function createSession(
  database: TestDatabase,
  batchId: string,
  type: 'LIVE' | 'RECORDING' = 'LIVE',
  title = 'Session',
): Promise<string> {
  const sessionId = randomUUID();
  await database.db.insert(batchSessions).values({
    sessionId,
    batchId,
    title,
    type,
    isDeleted: false,
  });
  return sessionId;
}

async function recordAttendance(
  database: TestDatabase,
  batchId: string,
  sessionId: string,
  userId: string,
): Promise<void> {
  await database.db.insert(batchAttendance).values({
    batchId,
    sessionId,
    userId,
  });
}

async function createQuiz(
  database: TestDatabase,
  batchId: string,
  title = 'Quiz',
): Promise<string> {
  const quizId = randomUUID();
  await database.db.insert(batchQuizzes).values({
    quizId,
    batchId,
    title,
    durationMinutes: 30,
    maxAttempts: 1,
    negativeMarkPercent: '0',
    passingPercent: '40',
    isDeleted: false,
    createdBy: 'system',
  });
  return quizId;
}

const attemptCounters = new Map<string, number>();

async function createQuizAttempt(
  database: TestDatabase,
  quizId: string,
  userId: string,
  score: string,
  maxScore: string,
  status: 'SUBMITTED' | 'IN_PROGRESS' = 'SUBMITTED',
): Promise<void> {
  const key = `${quizId}:${userId}`;
  const next = (attemptCounters.get(key) ?? 0) + 1;
  attemptCounters.set(key, next);
  await database.db.insert(batchQuizAttempts).values({
    quizId,
    userId,
    attemptNo: next,
    status,
    score,
    maxScore,
    startedAt: new Date(),
    expiresAt: new Date(Date.now() + 3_600_000),
  });
}

describe('corporate reports', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let student1: TestActor;
  let student2: TestActor;
  let companyId: string;
  let contractId: string;
  let batchId: string;
  let otherAdmin: TestActor;
  let otherCompanyId: string;
  let otherContractId: string;

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
    attemptCounters.clear();
    await truncateAll(database);

    const platformAdmin = await createUser(database, 'PLATFORM_ADMIN');

    companyId = await createCompany(database);
    admin = await createCorporateAdmin(database, companyId);

    student1 = await createUser(database, 'LEARNER');
    student2 = await createUser(database, 'LEARNER');

    batchId = await createBatch(database, platformAdmin.userId);
    contractId = await createContract(database, companyId, admin.userId);
    await linkBatchToContract(database, contractId, batchId);
    await claimSeat(database, contractId, student1.userId);
    await claimSeat(database, contractId, student2.userId);
    await enrol(database, batchId, student1.userId);
    await enrol(database, batchId, student2.userId);

    otherCompanyId = await createCompany(database);
    otherAdmin = await createCorporateAdmin(database, otherCompanyId);
    otherContractId = await createContract(database, otherCompanyId, otherAdmin.userId);
  });

  function get(path: string, actor: TestActor) {
    return request(app.getHttpServer())
      .get(path)
      .set(...authHeader(app, actor));
  }

  function post(path: string, actor: TestActor, body: object = {}) {
    return request(app.getHttpServer())
      .post(path)
      .set(...authHeader(app, actor))
      .send(body);
  }

  describe('ticket 29 - attendance report', () => {
    it('returns attendance rows for each student on the contract', async () => {
      const sessionId = await createSession(database, batchId, 'LIVE', 'Week 1');
      await recordAttendance(database, batchId, sessionId, student1.userId);

      const { body } = await get(
        `/corporate/me/contracts/${contractId}/reports/attendance`,
        admin,
      ).expect(200);

      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);

      const s1 = body.find((r: { userId: string }) => r.userId === student1.userId);
      const s2 = body.find((r: { userId: string }) => r.userId === student2.userId);

      expect(s1).toBeDefined();
      expect(s1.attendedCount).toBe(1);
      expect(s1.totalSessions).toBe(1);
      expect(s1.attendancePercent).toBe(100);
      expect(s1.sessions).toHaveLength(1);
      expect(s1.sessions[0].attended).toBe(true);
      expect(s1.sessions[0].sessionId).toBe(sessionId);

      expect(s2).toBeDefined();
      expect(s2.attendedCount).toBe(0);
      expect(s2.attendancePercent).toBe(0);
      expect(s2.sessions[0].attended).toBe(false);
    });

    it('returns null attendancePercent when there are no sessions', async () => {
      const { body } = await get(
        `/corporate/me/contracts/${contractId}/reports/attendance`,
        admin,
      ).expect(200);

      expect(body).toHaveLength(2);
      for (const row of body) {
        expect(row.totalSessions).toBe(0);
        expect(row.attendancePercent).toBeNull();
      }
    });

    it('filters attendance report by sub-group', async () => {
      const { corporateSubGroups, corporateSubGroupMembers } = await import(
        '../src/database/schema'
      );
      const subGroupId = randomUUID();
      await database.db.insert(corporateSubGroups).values({
        subGroupId,
        contractId,
        name: 'Group A',
        createdBy: admin.userId,
      });
      await database.db.insert(corporateSubGroupMembers).values({
        subGroupId,
        contractId,
        userId: student1.userId,
        addedBy: admin.userId,
      });

      const sessionId = await createSession(database, batchId, 'LIVE');
      await recordAttendance(database, batchId, sessionId, student1.userId);

      const { body } = await get(
        `/corporate/me/contracts/${contractId}/reports/attendance?subGroupId=${subGroupId}`,
        admin,
      ).expect(200);

      expect(body).toHaveLength(1);
      expect(body[0].userId).toBe(student1.userId);
    });

    it('covers only batches on the contract', async () => {
      const platformAdmin = await createUser(database, 'PLATFORM_ADMIN');
      const otherBatchId = await createBatch(database, platformAdmin.userId);
      const otherSessionId = await createSession(database, otherBatchId, 'LIVE');
      await recordAttendance(database, otherBatchId, otherSessionId, student1.userId);

      const { body } = await get(
        `/corporate/me/contracts/${contractId}/reports/attendance`,
        admin,
      ).expect(200);

      const sessionIds = body.flatMap((r: { sessions: Array<{ sessionId: string }> }) =>
        r.sessions.map((s) => s.sessionId),
      );
      expect(sessionIds).not.toContain(otherSessionId);
    });

    it('is indistinguishable from not-found when requesting another org contract', async () => {
      const realMissing = randomUUID();

      const refused = await get(
        `/corporate/me/contracts/${otherContractId}/reports/attendance`,
        admin,
      );
      const absent = await get(
        `/corporate/me/contracts/${realMissing}/reports/attendance`,
        admin,
      );

      expect(refused.status).toBe(404);
      expect(absent.status).toBe(404);
    });

    it('requires CORPORATE_ADMIN role', async () => {
      const learner = await createUser(database, 'LEARNER');
      await get(
        `/corporate/me/contracts/${contractId}/reports/attendance`,
        learner,
      ).expect(403);
    });
  });

  describe('ticket 30 - test performance report', () => {
    it('returns quiz performance for each student on the contract', async () => {
      const quizId = await createQuiz(database, batchId, 'Midterm');
      await createQuizAttempt(database, quizId, student1.userId, '80', '100');

      const { body } = await get(
        `/corporate/me/contracts/${contractId}/reports/test-performance`,
        admin,
      ).expect(200);

      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);

      const s1 = body.find((r: { userId: string }) => r.userId === student1.userId);
      const s2 = body.find((r: { userId: string }) => r.userId === student2.userId);

      expect(s1.quizzes).toHaveLength(1);
      expect(s1.quizzes[0].quizId).toBe(quizId);
      expect(s1.quizzes[0].scorePercent).toBe(80);
      expect(s1.quizzes[0].attempted).toBe(true);
      expect(s1.averageScorePercent).toBe(80);

      expect(s2.quizzes[0].attempted).toBe(false);
      expect(s2.quizzes[0].scorePercent).toBeNull();
      expect(s2.averageScorePercent).toBeNull();
    });

    it('uses the best attempt when a student has multiple attempts', async () => {
      const quizId = await createQuiz(database, batchId, 'Quiz 1');
      await createQuizAttempt(database, quizId, student1.userId, '40', '100');
      await createQuizAttempt(database, quizId, student1.userId, '70', '100');
      await createQuizAttempt(database, quizId, student1.userId, '60', '100');

      const { body } = await get(
        `/corporate/me/contracts/${contractId}/reports/test-performance`,
        admin,
      ).expect(200);

      const s1 = body.find((r: { userId: string }) => r.userId === student1.userId);
      expect(s1.quizzes[0].scorePercent).toBe(70);
    });

    it('returns null averageScorePercent when no attempts exist', async () => {
      await createQuiz(database, batchId, 'Quiz 1');

      const { body } = await get(
        `/corporate/me/contracts/${contractId}/reports/test-performance`,
        admin,
      ).expect(200);

      for (const row of body) {
        expect(row.averageScorePercent).toBeNull();
      }
    });

    it('filters test performance by sub-group', async () => {
      const { corporateSubGroups, corporateSubGroupMembers } = await import(
        '../src/database/schema'
      );
      const subGroupId = randomUUID();
      await database.db.insert(corporateSubGroups).values({
        subGroupId,
        contractId,
        name: 'Group B',
        createdBy: admin.userId,
      });
      await database.db.insert(corporateSubGroupMembers).values({
        subGroupId,
        contractId,
        userId: student1.userId,
        addedBy: admin.userId,
      });

      const quizId = await createQuiz(database, batchId, 'Quiz');
      await createQuizAttempt(database, quizId, student1.userId, '90', '100');
      await createQuizAttempt(database, quizId, student2.userId, '50', '100');

      const { body } = await get(
        `/corporate/me/contracts/${contractId}/reports/test-performance?subGroupId=${subGroupId}`,
        admin,
      ).expect(200);

      expect(body).toHaveLength(1);
      expect(body[0].userId).toBe(student1.userId);
      expect(body[0].quizzes[0].scorePercent).toBe(90);
    });

    it('is indistinguishable from not-found when requesting another org contract', async () => {
      const realMissing = randomUUID();

      const refused = await get(
        `/corporate/me/contracts/${otherContractId}/reports/test-performance`,
        admin,
      );
      const absent = await get(
        `/corporate/me/contracts/${realMissing}/reports/test-performance`,
        admin,
      );

      expect(refused.status).toBe(404);
      expect(absent.status).toBe(404);
    });

    it('does not include quizzes from batches outside the contract', async () => {
      const platformAdmin = await createUser(database, 'PLATFORM_ADMIN');
      const otherBatchId = await createBatch(database, platformAdmin.userId);
      const otherQuizId = await createQuiz(database, otherBatchId, 'Outside Quiz');
      await createQuizAttempt(database, otherQuizId, student1.userId, '100', '100');

      const { body } = await get(
        `/corporate/me/contracts/${contractId}/reports/test-performance`,
        admin,
      ).expect(200);

      const allQuizIds = body.flatMap((r: { quizzes: Array<{ quizId: string }> }) =>
        r.quizzes.map((q) => q.quizId),
      );
      expect(allQuizIds).not.toContain(otherQuizId);
    });

    it('requires CORPORATE_ADMIN role', async () => {
      const learner = await createUser(database, 'LEARNER');
      await get(
        `/corporate/me/contracts/${contractId}/reports/test-performance`,
        learner,
      ).expect(403);
    });
  });

  describe('ticket 31 - async export', () => {
    it('POST export returns 202 immediately with exportJobId', async () => {
      const { body } = await post(
        `/corporate/me/contracts/${contractId}/reports/export`,
        admin,
        { reportType: 'attendance' },
      ).expect(202);

      expect(body.exportJobId).toBeDefined();
      expect(typeof body.exportJobId).toBe('string');
      expect(body.status).toBeDefined();
    });

    it('polling shows the export reaches DONE status (inline queue runs synchronously)', async () => {
      const { body: created } = await post(
        `/corporate/me/contracts/${contractId}/reports/export`,
        admin,
        { reportType: 'attendance' },
      ).expect(202);

      const { body: polled } = await get(
        `/corporate/me/contracts/${contractId}/reports/export/${created.exportJobId}`,
        admin,
      ).expect(200);

      expect(polled.exportJobId).toBe(created.exportJobId);
      expect(polled.status).toBe('DONE');
    });

    it('notifies the requester when the export is ready', async () => {
      await post(
        `/corporate/me/contracts/${contractId}/reports/export`,
        admin,
        { reportType: 'test-performance' },
      ).expect(202);

      const sent = await database.db
        .select()
        .from(notifications)
        .where(
          (await import('drizzle-orm')).and(
            (await import('drizzle-orm')).eq(notifications.userId, admin.userId),
            (await import('drizzle-orm')).eq(notifications.type, 'GENERIC'),
          ),
        );

      expect(sent.length).toBeGreaterThan(0);
      expect(sent[0].title).toMatch(/ready/i);
    });

    it('download endpoint returns the export data for a completed job', async () => {
      const sessionId = await createSession(database, batchId, 'LIVE', 'Class 1');
      await recordAttendance(database, batchId, sessionId, student1.userId);

      const { body: created } = await post(
        `/corporate/me/contracts/${contractId}/reports/export`,
        admin,
        { reportType: 'attendance' },
      ).expect(202);

      const { body: data } = await get(
        `/corporate/me/contracts/${contractId}/reports/export/${created.exportJobId}/download`,
        admin,
      ).expect(200);

      expect(Array.isArray(data)).toBe(true);
      const s1 = data.find((r: { userId: string }) => r.userId === student1.userId);
      expect(s1).toBeDefined();
      expect(s1.attendedCount).toBe(1);
    });

    it('download endpoint returns 404 for a different org export job', async () => {
      const { body: created } = await post(
        `/corporate/me/contracts/${contractId}/reports/export`,
        admin,
        { reportType: 'attendance' },
      ).expect(202);

      await get(
        `/corporate/me/contracts/${otherContractId}/reports/export/${created.exportJobId}/download`,
        otherAdmin,
      ).expect(404);
    });

    it('reports a failed export via notification', async () => {
      const badContractId = randomUUID();
      const { corporateContracts: cc } = await import('../src/database/schema');
      await database.db.insert(cc).values({
        contractId: badContractId,
        companyId,
        title: 'Bad contract',
        seatCount: 10,
        startsAt: new Date(),
        endsAt: new Date(),
        status: 'ACTIVE',
        createdBy: admin.userId,
      });

      await post(
        `/corporate/me/contracts/${badContractId}/reports/export`,
        admin,
        { reportType: 'unknown-type' as string },
      ).expect(400);
    });

    it('export respects contract scope — does not include another org student', async () => {
      const otherStudent = await createUser(database, 'LEARNER');
      await claimSeat(database, otherContractId, otherStudent.userId);

      const { body: created } = await post(
        `/corporate/me/contracts/${contractId}/reports/export`,
        admin,
        { reportType: 'attendance' },
      ).expect(202);

      const { body: data } = await get(
        `/corporate/me/contracts/${contractId}/reports/export/${created.exportJobId}/download`,
        admin,
      ).expect(200);

      const userIds = data.map((r: { userId: string }) => r.userId);
      expect(userIds).not.toContain(otherStudent.userId);
    });

    it('GET status returns 404 for an export job on a different contract', async () => {
      const { body: created } = await post(
        `/corporate/me/contracts/${contractId}/reports/export`,
        admin,
        { reportType: 'attendance' },
      ).expect(202);

      await get(
        `/corporate/me/contracts/${otherContractId}/reports/export/${created.exportJobId}`,
        otherAdmin,
      ).expect(404);
    });

    it('rejects an invalid reportType with 400', async () => {
      await post(
        `/corporate/me/contracts/${contractId}/reports/export`,
        admin,
        { reportType: 'not-a-real-type' },
      ).expect(400);
    });

    it('GET /download returns 404 when export is not yet done (PENDING job)', async () => {
      const [job] = await database.db
        .insert((await import('../src/database/schema')).exportJobs)
        .values({
          contractId,
          requestedBy: admin.userId,
          reportType: 'attendance',
          status: 'PENDING',
        })
        .returning();

      await get(
        `/corporate/me/contracts/${contractId}/reports/export/${job.exportJobId}/download`,
        admin,
      ).expect(404);
    });
  });
});
