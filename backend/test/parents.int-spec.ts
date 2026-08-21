import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { and, eq, isNull, sql } from 'drizzle-orm';

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
  enrol,
  createSubject,
  createLesson,
} from './support/factories';
import {
  assessmentAttempts,
  assessmentTests,
  corporateContracts,
  corporateSeats,
  parentLinks,
} from '../src/database/schema';

describe('parent accounts', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let admin: TestActor;
  let student: TestActor;
  let parent: TestActor;
  let batchId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    clock.set('2027-03-01T09:00:00.000Z');
    app = await createTestApp(database, clock);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    parent = await createUser(database, 'PARENT');
    batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);
  });

  async function createLink(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/parents/links')
      .set(...authHeader(app, parent))
      .send({ studentUserId: student.userId })
      .expect(201);
    return res.body.linkId;
  }

  async function activateLink(linkId: string): Promise<void> {
    await request(app.getHttpServer())
      .post(`/parents/links/${linkId}/accept`)
      .set(...authHeader(app, student))
      .expect(201);
  }

  describe('link lifecycle', () => {
    it('only PARENT accounts can create a link', async () => {
      await request(app.getHttpServer())
        .post('/parents/links')
        .set(...authHeader(app, student))
        .send({ studentUserId: student.userId })
        .expect(403);
    });

    it('creates a PENDING link', async () => {
      const linkId = await createLink();
      expect(linkId).toEqual(expect.any(String));

      const links = await database.db
        .select()
        .from(parentLinks)
        .where(eq(parentLinks.linkId, linkId));
      expect(links[0].status).toBe('PENDING');
    });

    it('a PENDING link grants no read access to progress', async () => {
      await createLink();
      await request(app.getHttpServer())
        .get(`/parents/students/${student.userId}/batches/${batchId}/progress`)
        .set(...authHeader(app, parent))
        .expect(404);
    });

    it('a PENDING link grants no read access to attendance', async () => {
      await createLink();
      await request(app.getHttpServer())
        .get(`/parents/students/${student.userId}/batches/${batchId}/attendance`)
        .set(...authHeader(app, parent))
        .expect(404);
    });

    it('student accepts link request', async () => {
      const linkId = await createLink();
      await activateLink(linkId);

      const [link] = await database.db
        .select()
        .from(parentLinks)
        .where(eq(parentLinks.linkId, linkId));
      expect(link.status).toBe('ACTIVE');
      expect(link.consentedAt).not.toBeNull();
    });

    it('parent can revoke an active link', async () => {
      const linkId = await createLink();
      await activateLink(linkId);

      await request(app.getHttpServer())
        .post(`/parents/links/${linkId}/revoke`)
        .set(...authHeader(app, parent))
        .expect(201);

      const [link] = await database.db
        .select()
        .from(parentLinks)
        .where(eq(parentLinks.linkId, linkId));
      expect(link.status).toBe('REVOKED');
    });

    it('student can reject a pending request', async () => {
      const linkId = await createLink();

      await request(app.getHttpServer())
        .post(`/parents/links/${linkId}/reject`)
        .set(...authHeader(app, student))
        .expect(201);

      const [link] = await database.db
        .select()
        .from(parentLinks)
        .where(eq(parentLinks.linkId, linkId));
      expect(link.status).toBe('REVOKED');
    });

    it('student can list incoming requests', async () => {
      await createLink();

      const res = await request(app.getHttpServer())
        .get('/parents/students/me/link-requests')
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].studentUserId).toBe(student.userId);
    });
  });

  describe('parent reads student data after consent', () => {
    let linkId: string;

    beforeEach(async () => {
      linkId = await createLink();
      await activateLink(linkId);
    });

    it('reads progress for the linked student', async () => {
      const res = await request(app.getHttpServer())
        .get(`/parents/students/${student.userId}/batches/${batchId}/progress`)
        .set(...authHeader(app, parent))
        .expect(200);

      expect(res.body).toMatchObject({
        sessions: expect.objectContaining({ liveTotal: expect.any(Number) }),
        lessons: expect.objectContaining({ total: expect.any(Number) }),
        quizzes: expect.any(Object),
      });
    });

    it('reads attendance for the linked student', async () => {
      const res = await request(app.getHttpServer())
        .get(`/parents/students/${student.userId}/batches/${batchId}/attendance`)
        .set(...authHeader(app, parent))
        .expect(200);

      expect(res.body).toMatchObject({
        liveTotal: expect.any(Number),
        attended: expect.any(Number),
      });
    });

    it('reads assessment result for the linked student', async () => {
      const testId = randomUUID();
      await database.db.insert(assessmentTests).values({
        testId,
        title: 'Physics Test',
        createdBy: admin.userId,
      });

      const attemptId = randomUUID();
      await database.db.insert(assessmentAttempts).values({
        attemptId,
        testId,
        userId: student.userId,
        status: 'GRADED',
        expiresAt: new Date('2027-12-31T23:59:59Z'),
        finalScore: '85',
        maxScore: '100',
      });

      const res = await request(app.getHttpServer())
        .get(`/parents/students/${student.userId}/attempts/${attemptId}/result`)
        .set(...authHeader(app, parent))
        .expect(200);

      expect(res.body.attemptId).toBe(attemptId);
      expect(res.body.status).toBe('GRADED');
    });

    it('returns 404 after revocation', async () => {
      await request(app.getHttpServer())
        .post(`/parents/links/${linkId}/revoke`)
        .set(...authHeader(app, parent))
        .expect(201);

      await request(app.getHttpServer())
        .get(`/parents/students/${student.userId}/batches/${batchId}/progress`)
        .set(...authHeader(app, parent))
        .expect(404);
    });
  });

  describe('content access', () => {
    it('parent hitting a lesson endpoint gets same response as for a non-existent lesson', async () => {
      const linkId = await createLink();
      await activateLink(linkId);

      const subjectId = await createSubject(database, batchId);
      await createLesson(database, subjectId);

      const realBatch = await request(app.getHttpServer())
        .get(`/batches/${batchId}/content`)
        .set(...authHeader(app, parent));

      const missingBatch = await request(app.getHttpServer())
        .get(`/batches/${randomUUID()}/content`)
        .set(...authHeader(app, parent));

      expect(realBatch.status).toBe(404);
      expect(missingBatch.status).toBe(404);
      expect(realBatch.body.message).toBe(missingBatch.body.message);
    });

    it('parent hitting batch sessions endpoint gets 404 even for their child\'s batch', async () => {
      const linkId = await createLink();
      await activateLink(linkId);

      await request(app.getHttpServer())
        .get(`/batches/${batchId}/sessions`)
        .set(...authHeader(app, parent))
        .expect(404);
    });
  });

  describe('sibling isolation', () => {
    it('a parent cannot see a student they are not linked to', async () => {
      const sibling = await createUser(database, 'LEARNER');
      const siblingBatchId = await createBatch(database, admin.userId);
      await enrol(database, siblingBatchId, sibling.userId);

      const linkId = await createLink();
      await activateLink(linkId);

      await request(app.getHttpServer())
        .get(`/parents/students/${sibling.userId}/batches/${siblingBatchId}/progress`)
        .set(...authHeader(app, parent))
        .expect(404);
    });

    it('a parent sees nothing for the other student even if that student has an active link with a different parent', async () => {
      const otherParent = await createUser(database, 'PARENT');
      const sibling = await createUser(database, 'LEARNER');
      const siblingBatchId = await createBatch(database, admin.userId);
      await enrol(database, siblingBatchId, sibling.userId);

      const otherRes = await request(app.getHttpServer())
        .post('/parents/links')
        .set(...authHeader(app, otherParent))
        .send({ studentUserId: sibling.userId })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/parents/links/${otherRes.body.linkId}/accept`)
        .set(...authHeader(app, sibling))
        .expect(201);

      const linkId = await createLink();
      await activateLink(linkId);

      await request(app.getHttpServer())
        .get(`/parents/students/${sibling.userId}/batches/${siblingBatchId}/progress`)
        .set(...authHeader(app, parent))
        .expect(404);
    });
  });

  describe('corporate seat count', () => {
    it('a parent account does not consume a seat on a corporate contract', async () => {
      const companyId = randomUUID();
      const contractId = randomUUID();

      await database.db.execute(
        sql`INSERT INTO companies (company_id, name, email) VALUES (${companyId}, 'Test College', ${'college@example.test'})`,
      );
      await database.db.insert(corporateContracts).values({
        contractId,
        companyId,
        title: 'Test Contract',
        seatCount: 5,
        startsAt: new Date('2027-01-01'),
        endsAt: new Date('2028-01-01'),
        status: 'ACTIVE',
        createdBy: admin.userId,
      });
      await database.db.insert(corporateSeats).values({
        contractId,
        userId: student.userId,
      });

      const linkId = await createLink();
      await activateLink(linkId);

      const [{ consumed }] = await database.db
        .select({ consumed: sql<number>`count(*)::int` })
        .from(corporateSeats)
        .where(
          and(
            eq(corporateSeats.contractId, contractId),
            isNull(corporateSeats.releasedAt),
          ),
        );

      expect(consumed).toBe(1);

      const [parentSeat] = await database.db
        .select()
        .from(corporateSeats)
        .where(
          and(
            eq(corporateSeats.contractId, contractId),
            eq(corporateSeats.userId, parent.userId),
          ),
        );

      expect(parentSeat).toBeUndefined();
    });
  });
});
