import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { batchCertificates, batchEnrollments } from '../src/database/schema';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import {
  createBatch,
  createLesson,
  createSubject,
  createUser,
  enrol,
} from './support/factories';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { CERTIFICATE_ISSUANCE_JOB } from '../src/batches/certificates/certificate-issuance.service';

describe('certificate issuance and verification', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let queue: InlineJobQueue;
  let admin: TestActor;
  let student: TestActor;
  let batchId: string;

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
    student = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);
  });

  async function setCriteria(
    body: {
      minLessonCompletionPercent: number;
      minAttendancePercent: number;
      minTestAveragePercent: number;
    },
  ) {
    return request(app.getHttpServer())
      .put(`/batches/${batchId}/completion-criteria`)
      .set(...authHeader(app, admin))
      .send(body)
      .expect(200);
  }

  async function runIssuanceJob() {
    await queue.enqueue(CERTIFICATE_ISSUANCE_JOB, undefined);
  }

  async function getCertificates() {
    return database.db
      .select()
      .from(batchCertificates)
      .where(eq(batchCertificates.batchId, batchId));
  }

  describe('admin criteria management', () => {
    it('returns null when no criteria are configured', async () => {
      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/completion-criteria`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(Object.keys(res.body)).toHaveLength(0);
    });

    it('lets admin set completion criteria and reads them back', async () => {
      await setCriteria({
        minLessonCompletionPercent: 80,
        minAttendancePercent: 60,
        minTestAveragePercent: 40,
      });

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/completion-criteria`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(res.body.minLessonCompletionPercent).toBe(80);
      expect(res.body.minAttendancePercent).toBe(60);
      expect(res.body.minTestAveragePercent).toBe(40);
    });

    it('can update criteria in-place (upsert)', async () => {
      await setCriteria({
        minLessonCompletionPercent: 50,
        minAttendancePercent: 0,
        minTestAveragePercent: 0,
      });

      await setCriteria({
        minLessonCompletionPercent: 90,
        minAttendancePercent: 0,
        minTestAveragePercent: 0,
      });

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/completion-criteria`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(res.body.minLessonCompletionPercent).toBe(90);
    });

    it('rejects values outside 0–100', async () => {
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/completion-criteria`)
        .set(...authHeader(app, admin))
        .send({ minLessonCompletionPercent: 110, minAttendancePercent: 0, minTestAveragePercent: 0 })
        .expect(400);
    });

    it('blocks a learner from reading criteria', async () => {
      await request(app.getHttpServer())
        .get(`/batches/${batchId}/completion-criteria`)
        .set(...authHeader(app, student))
        .expect(404);
    });
  });

  describe('issuance job — lesson completion gating', () => {
    it('issues nothing when no criteria are set', async () => {
      await runIssuanceJob();
      expect(await getCertificates()).toHaveLength(0);
    });

    it('issues a certificate when lesson criteria are fully met', async () => {
      const subjectId = await createSubject(database, batchId);
      const lessonId = await createLesson(database, subjectId, {
        type: 'TEXT',
        textContent: 'hello',
        order: 1,
      });

      await setCriteria({ minLessonCompletionPercent: 100, minAttendancePercent: 0, minTestAveragePercent: 0 });

      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${lessonId}/progress`)
        .set(...authHeader(app, student))
        .send({ completed: true })
        .expect(200);

      await runIssuanceJob();

      const certs = await getCertificates();
      expect(certs).toHaveLength(1);
      expect(certs[0].userId).toBe(student.userId);
    });

    it('issuance is recorded in the audit log', async () => {
      const subjectId = await createSubject(database, batchId);
      const lessonId = await createLesson(database, subjectId, {
        type: 'TEXT',
        textContent: 'hello',
        order: 1,
      });

      await setCriteria({ minLessonCompletionPercent: 100, minAttendancePercent: 0, minTestAveragePercent: 0 });

      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${lessonId}/progress`)
        .set(...authHeader(app, student))
        .send({ completed: true })
        .expect(200);

      await runIssuanceJob();

      const certs = await getCertificates();
      expect(certs).toHaveLength(1);
      const certificateId = certs[0].certificateId;

      const { auditLog } = await import('../src/database/schema');
      const entries = await database.db
        .select()
        .from(auditLog)
        .where(
          and(
            eq(auditLog.action, 'certificate.issued'),
            eq(auditLog.targetId, certificateId),
          ),
        );

      expect(entries).toHaveLength(1);
      expect(entries[0].targetType).toBe('batch_certificate');
    });

    it('does not issue when lesson completion is below threshold', async () => {
      const subjectId = await createSubject(database, batchId);
      await createLesson(database, subjectId, { type: 'TEXT', textContent: 'a', order: 1 });
      await createLesson(database, subjectId, { type: 'TEXT', textContent: 'b', order: 2 });

      await setCriteria({ minLessonCompletionPercent: 100, minAttendancePercent: 0, minTestAveragePercent: 0 });

      await runIssuanceJob();

      expect(await getCertificates()).toHaveLength(0);
    });

    it('is idempotent — running twice issues exactly one certificate', async () => {
      const subjectId = await createSubject(database, batchId);
      const lessonId = await createLesson(database, subjectId, {
        type: 'TEXT',
        textContent: 'hello',
        order: 1,
      });

      await setCriteria({ minLessonCompletionPercent: 100, minAttendancePercent: 0, minTestAveragePercent: 0 });

      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${lessonId}/progress`)
        .set(...authHeader(app, student))
        .send({ completed: true })
        .expect(200);

      await runIssuanceJob();
      await runIssuanceJob();

      const certs = await getCertificates();
      expect(certs).toHaveLength(1);
    });
  });

  describe('corporate student — same issuance path', () => {
    it('issues a certificate to a corporate-seat student identically to a direct student', async () => {
      const corporateStudent = await createUser(database, 'LEARNER');
      await enrol(database, batchId, corporateStudent.userId, { source: 'CORPORATE_SEAT' });

      const subjectId = await createSubject(database, batchId);
      const lessonId = await createLesson(database, subjectId, {
        type: 'TEXT',
        textContent: 'hello',
        order: 1,
      });

      await setCriteria({ minLessonCompletionPercent: 100, minAttendancePercent: 0, minTestAveragePercent: 0 });

      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${lessonId}/progress`)
        .set(...authHeader(app, corporateStudent))
        .send({ completed: true })
        .expect(200);

      await runIssuanceJob();

      const allCerts = await database.db
        .select()
        .from(batchCertificates)
        .where(eq(batchCertificates.batchId, batchId));

      const corpCert = allCerts.find((c) => c.userId === corporateStudent.userId);
      expect(corpCert).toBeDefined();

      const enrollment = await database.db
        .select({ source: batchEnrollments.source })
        .from(batchEnrollments)
        .where(eq(batchEnrollments.userId, corporateStudent.userId))
        .limit(1);
      expect(enrollment[0].source).toBe('CORPORATE_SEAT');
    });
  });

  describe('students cannot create certificates via read routes', () => {
    it('GET my-certificate returns null when none exists — never creates a row', async () => {
      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/my-certificate`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body.certificate).toBeNull();
      expect(await getCertificates()).toHaveLength(0);
    });

    it('student cannot POST to the admin issue endpoint', async () => {
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/certificates/${student.userId}`)
        .set(...authHeader(app, student))
        .send({})
        .expect(403);

      expect(await getCertificates()).toHaveLength(0);
    });

    it('student hitting all readable certificate routes does not create rows when criteria unmet', async () => {
      await setCriteria({ minLessonCompletionPercent: 100, minAttendancePercent: 0, minTestAveragePercent: 0 });

      await request(app.getHttpServer())
        .get(`/batches/${batchId}/my-certificate`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(await getCertificates()).toHaveLength(0);
    });
  });

  describe('public certificate verification', () => {
    async function issueCertificate(): Promise<string> {
      const subjectId = await createSubject(database, batchId);
      const lessonId = await createLesson(database, subjectId, {
        type: 'TEXT',
        textContent: 'hello',
        order: 1,
      });

      await setCriteria({ minLessonCompletionPercent: 100, minAttendancePercent: 0, minTestAveragePercent: 0 });

      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${lessonId}/progress`)
        .set(...authHeader(app, student))
        .send({ completed: true })
        .expect(200);

      await runIssuanceJob();

      const certs = await getCertificates();
      expect(certs).toHaveLength(1);
      return certs[0].verificationCode;
    }

    it('verifies a certificate without authentication', async () => {
      const code = await issueCertificate();

      const res = await request(app.getHttpServer())
        .get(`/verify/certificates/${code}`)
        .expect(200);

      expect(res.body.holderName).toBeDefined();
      expect(res.body.batchTitle).toBeDefined();
      expect(res.body.issuedAt).toBeDefined();
      expect(res.body.issuerName).toBeDefined();
      expect(res.body.revoked).toBe(false);
      expect(res.body.revokedAt).toBeNull();
    });

    it('discloses only holder name, batch title, issue date and issuer — no email, userId, number or scores', async () => {
      const code = await issueCertificate();

      const res = await request(app.getHttpServer())
        .get(`/verify/certificates/${code}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).not.toHaveProperty('email');
      expect(body).not.toHaveProperty('userId');
      expect(body).not.toHaveProperty('certificateNumber');
      expect(body).not.toHaveProperty('verificationCode');
      expect(body).not.toHaveProperty('attendancePercent');
      expect(body).not.toHaveProperty('score');
      expect(body).not.toHaveProperty('scores');
    });

    it('reports a revoked certificate as revoked rather than returning 404', async () => {
      const code = await issueCertificate();

      await request(app.getHttpServer())
        .delete(`/batches/${batchId}/certificates/${student.userId}`)
        .set(...authHeader(app, admin))
        .send({ reason: 'Academic misconduct' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/verify/certificates/${code}`)
        .expect(200);

      expect(res.body.revoked).toBe(true);
      expect(res.body.revokedAt).not.toBeNull();
    });

    it('returns 404 for an unknown verification code without revealing pattern', async () => {
      const fakeCode = randomUUID().replace(/-/g, '');

      await request(app.getHttpServer())
        .get(`/verify/certificates/${fakeCode}`)
        .expect(404);
    });

    it('returns 404 for an entirely invalid code', async () => {
      await request(app.getHttpServer())
        .get('/verify/certificates/not-a-real-code')
        .expect(404);
    });
  });

  describe('criteria: all-zeros means all-pass', () => {
    it('issues when all thresholds are 0 and student is enrolled', async () => {
      await setCriteria({ minLessonCompletionPercent: 0, minAttendancePercent: 0, minTestAveragePercent: 0 });

      await runIssuanceJob();

      const certs = await getCertificates();
      expect(certs).toHaveLength(1);
    });
  });
});
