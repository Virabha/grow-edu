import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import {
  learningPaths,
  pathCertificates,
  pathCompletionCriteria,
  pathEnrolments,
  pathStageProgress,
  pathStages,
} from '../src/database/schema';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { PATH_CERTIFICATE_ISSUANCE_JOB } from '../src/credentials/path-certificate-issuance.service';

describe('path certificates and capstone gating', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let queue: InlineJobQueue;
  let admin: TestActor;
  let student: TestActor;
  let pathId: string;
  let regularStageId: string;
  let capstoneStageId: string;

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

    const now = clock.now();
    pathId = randomUUID();
    await database.db.insert(learningPaths).values({
      pathId,
      title: 'Full Stack Bootcamp',
      slug: `path-${randomUUID().slice(0, 8)}`,
      createdBy: admin.userId,
      createdAt: now,
      updatedAt: now,
    });

    regularStageId = randomUUID();
    await database.db.insert(pathStages).values({
      stageId: regularStageId,
      pathId,
      ordinal: 1,
      kind: 'BATCH' as never,
      title: 'Core Modules',
      isCapstone: false,
      createdAt: now,
      updatedAt: now,
    });

    capstoneStageId = randomUUID();
    await database.db.insert(pathStages).values({
      stageId: capstoneStageId,
      pathId,
      ordinal: 2,
      kind: 'PROJECT' as never,
      title: 'Capstone Project',
      isCapstone: true,
      createdAt: now,
      updatedAt: now,
    });

    await database.db.insert(pathEnrolments).values({
      pathId,
      userId: student.userId,
      enrolledAt: now,
    });
  });

  async function runIssuanceJob() {
    await queue.enqueue(PATH_CERTIFICATE_ISSUANCE_JOB, undefined);
  }

  async function getCertificates() {
    return database.db
      .select()
      .from(pathCertificates)
      .where(eq(pathCertificates.pathId, pathId));
  }

  async function completeStage(userId: string, stageId: string) {
    const now = clock.now();
    await database.db
      .insert(pathStageProgress)
      .values({
        pathId,
        stageId,
        userId,
        state: 'COMPLETE' as never,
        completedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [pathStageProgress.stageId, pathStageProgress.userId],
        set: { state: 'COMPLETE' as never, completedAt: now, updatedAt: now },
      });
  }

  async function setCriteria(body: {
    requireCapstone: boolean;
    minStagesCompletePercent: number;
  }) {
    return request(app.getHttpServer())
      .put(`/paths/${pathId}/completion-criteria`)
      .set(...authHeader(app, admin))
      .send(body)
      .expect(200);
  }

  describe('path completion criteria management', () => {
    it('returns empty response when no criteria configured', async () => {
      const res = await request(app.getHttpServer())
        .get(`/paths/${pathId}/completion-criteria`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(Object.keys(res.body)).toHaveLength(0);
    });

    it('admin can set and read back completion criteria', async () => {
      await setCriteria({ requireCapstone: true, minStagesCompletePercent: 100 });

      const res = await request(app.getHttpServer())
        .get(`/paths/${pathId}/completion-criteria`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(res.body.requireCapstone).toBe(true);
      expect(res.body.minStagesCompletePercent).toBe(100);
    });

    it('can upsert criteria in-place', async () => {
      await setCriteria({ requireCapstone: true, minStagesCompletePercent: 100 });
      await setCriteria({ requireCapstone: false, minStagesCompletePercent: 80 });

      const res = await request(app.getHttpServer())
        .get(`/paths/${pathId}/completion-criteria`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(res.body.requireCapstone).toBe(false);
      expect(res.body.minStagesCompletePercent).toBe(80);
    });

    it('blocks a learner from reading or writing criteria', async () => {
      await request(app.getHttpServer())
        .get(`/paths/${pathId}/completion-criteria`)
        .set(...authHeader(app, student))
        .expect(403);

      await request(app.getHttpServer())
        .put(`/paths/${pathId}/completion-criteria`)
        .set(...authHeader(app, student))
        .send({ requireCapstone: true, minStagesCompletePercent: 100 })
        .expect(403);
    });
  });

  describe('issuance job — capstone gating (strict)', () => {
    it('issues nothing when no criteria configured', async () => {
      await completeStage(student.userId, regularStageId);
      await completeStage(student.userId, capstoneStageId);

      await runIssuanceJob();

      expect(await getCertificates()).toHaveLength(0);
    });

    it('completing every other stage without the capstone issues nothing', async () => {
      await setCriteria({ requireCapstone: true, minStagesCompletePercent: 100 });

      await completeStage(student.userId, regularStageId);

      await runIssuanceJob();

      expect(await getCertificates()).toHaveLength(0);
    });

    it('completing all stages including capstone issues a certificate', async () => {
      await setCriteria({ requireCapstone: true, minStagesCompletePercent: 100 });

      await completeStage(student.userId, regularStageId);
      await completeStage(student.userId, capstoneStageId);

      await runIssuanceJob();

      const certs = await getCertificates();
      expect(certs).toHaveLength(1);
      expect(certs[0].userId).toBe(student.userId);
    });

    it('issuance is recorded in the audit log', async () => {
      await setCriteria({ requireCapstone: true, minStagesCompletePercent: 100 });
      await completeStage(student.userId, regularStageId);
      await completeStage(student.userId, capstoneStageId);

      await runIssuanceJob();

      const certs = await getCertificates();
      expect(certs).toHaveLength(1);

      const { auditLog } = await import('../src/database/schema');
      const entries = await database.db
        .select()
        .from(auditLog)
        .where(eq(auditLog.action, 'path_certificate.issued'));

      expect(entries).toHaveLength(1);
      expect(entries[0].targetType).toBe('path_certificate');
    });

    it('capstone alone without other stages obeys minStagesCompletePercent', async () => {
      await setCriteria({ requireCapstone: true, minStagesCompletePercent: 100 });

      await completeStage(student.userId, capstoneStageId);

      await runIssuanceJob();

      expect(await getCertificates()).toHaveLength(0);
    });

    it('issuance is idempotent — running twice issues exactly one certificate', async () => {
      await setCriteria({ requireCapstone: true, minStagesCompletePercent: 100 });
      await completeStage(student.userId, regularStageId);
      await completeStage(student.userId, capstoneStageId);

      await runIssuanceJob();
      await runIssuanceJob();

      expect(await getCertificates()).toHaveLength(1);
    });

    it('issues when requireCapstone is false and all stages done', async () => {
      await setCriteria({ requireCapstone: false, minStagesCompletePercent: 100 });

      await completeStage(student.userId, regularStageId);
      await completeStage(student.userId, capstoneStageId);

      await runIssuanceJob();

      expect(await getCertificates()).toHaveLength(1);
    });

    it('issues when requireCapstone is false even without completing the capstone stage', async () => {
      await setCriteria({ requireCapstone: false, minStagesCompletePercent: 50 });

      await completeStage(student.userId, regularStageId);

      await runIssuanceJob();

      expect(await getCertificates()).toHaveLength(1);
    });

    it('revoked enrolment is not swept', async () => {
      await setCriteria({ requireCapstone: true, minStagesCompletePercent: 100 });
      await completeStage(student.userId, regularStageId);
      await completeStage(student.userId, capstoneStageId);

      await database.db
        .update(pathEnrolments)
        .set({ status: 'REVOKED' as never })
        .where(eq(pathEnrolments.userId, student.userId));

      await runIssuanceJob();

      expect(await getCertificates()).toHaveLength(0);
    });
  });

  describe('student cannot request a path certificate into existence', () => {
    it('student hitting GET /verify route cannot create certificate when capstone unmet', async () => {
      await setCriteria({ requireCapstone: true, minStagesCompletePercent: 100 });

      const fakeCode = randomUUID().replace(/-/g, '');
      await request(app.getHttpServer())
        .get(`/verify/path-certificates/${fakeCode}`)
        .expect(404);

      expect(await getCertificates()).toHaveLength(0);
    });

    it('there is no route accepting a student-triggered certificate issuance', async () => {
      const res = await request(app.getHttpServer())
        .post(`/paths/${pathId}/certificates`)
        .set(...authHeader(app, student))
        .send({});

      expect(res.status).not.toBe(200);
      expect(res.status).not.toBe(201);
      expect(await getCertificates()).toHaveLength(0);
    });
  });

  describe('public certificate verification', () => {
    async function issueCertificate(): Promise<string> {
      await setCriteria({ requireCapstone: true, minStagesCompletePercent: 100 });
      await completeStage(student.userId, regularStageId);
      await completeStage(student.userId, capstoneStageId);

      await runIssuanceJob();

      const certs = await getCertificates();
      expect(certs).toHaveLength(1);
      return certs[0].verificationCode;
    }

    it('verifies a path certificate without authentication', async () => {
      const code = await issueCertificate();

      const res = await request(app.getHttpServer())
        .get(`/verify/path-certificates/${code}`)
        .expect(200);

      expect(res.body.holderName).toBeDefined();
      expect(res.body.pathTitle).toBeDefined();
      expect(res.body.issuedAt).toBeDefined();
      expect(res.body.issuerName).toBeDefined();
      expect(res.body.revoked).toBe(false);
      expect(res.body.revokedAt).toBeNull();
    });

    it('discloses only holder name, path title, issue date, issuer and revocation — no email, userId, number or scores', async () => {
      const code = await issueCertificate();

      const res = await request(app.getHttpServer())
        .get(`/verify/path-certificates/${code}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).not.toHaveProperty('email');
      expect(body).not.toHaveProperty('userId');
      expect(body).not.toHaveProperty('certificateNumber');
      expect(body).not.toHaveProperty('verificationCode');
    });

    it('issuer name falls back to groEdu when no certificate template is configured', async () => {
      const code = await issueCertificate();

      const res = await request(app.getHttpServer())
        .get(`/verify/path-certificates/${code}`)
        .expect(200);

      expect(res.body.issuerName).toBe('groEdu');
    });

    it('returns 404 for an unknown verification code', async () => {
      const fakeCode = randomUUID().replace(/-/g, '');

      await request(app.getHttpServer())
        .get(`/verify/path-certificates/${fakeCode}`)
        .expect(404);
    });

    it('returns 404 for an entirely invalid code', async () => {
      await request(app.getHttpServer())
        .get('/verify/path-certificates/not-a-real-code')
        .expect(404);
    });

    it('reports a revoked certificate as revoked rather than returning 404', async () => {
      const code = await issueCertificate();

      const certs = await getCertificates();
      await database.db
        .update(pathCertificates)
        .set({
          revokedAt: clock.now(),
          revokedBy: admin.userId,
          revocationReason: 'Academic misconduct',
        })
        .where(eq(pathCertificates.certificateId, certs[0].certificateId));

      const res = await request(app.getHttpServer())
        .get(`/verify/path-certificates/${code}`)
        .expect(200);

      expect(res.body.revoked).toBe(true);
      expect(res.body.revokedAt).not.toBeNull();
    });
  });

  describe('criteria: path with deleted stages are excluded from total', () => {
    it('deleted stages do not count toward minStagesCompletePercent', async () => {
      const now = clock.now();

      const deletedStageId = randomUUID();
      await database.db.insert(pathStages).values({
        stageId: deletedStageId,
        pathId,
        ordinal: 3,
        kind: 'BATCH' as never,
        title: 'Deleted Stage',
        isCapstone: false,
        isDeleted: true,
        createdAt: now,
        updatedAt: now,
      });

      await setCriteria({ requireCapstone: true, minStagesCompletePercent: 100 });
      await completeStage(student.userId, regularStageId);
      await completeStage(student.userId, capstoneStageId);

      await runIssuanceJob();

      expect(await getCertificates()).toHaveLength(1);
    });
  });
});
