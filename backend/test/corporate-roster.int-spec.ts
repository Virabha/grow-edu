import { INestApplication } from '@nestjs/common';
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
  createCompany,
  createCorporateAdmin,
  createBatch,
} from './support/factories';

describe('corporate roster self-service (27) and bulk upload (28)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let platformAdmin: TestActor;
  let corporateAdmin: TestActor;
  let companyId: string;
  let contractId: string;

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
    platformAdmin = await createUser(database, 'PLATFORM_ADMIN');
    companyId = await createCompany(database);
    corporateAdmin = await createCorporateAdmin(database, companyId);
    contractId = await makeActiveContract();
  });

  async function makeActiveContract(seatCount = 10): Promise<string> {
    const batchId = await createBatch(database, platformAdmin.userId);
    const { body: contract } = await request(app.getHttpServer())
      .post('/corporate/contracts')
      .set(...authHeader(app, platformAdmin))
      .send({
        companyId,
        title: 'Test contract',
        seatCount,
        startsAt: '2026-09-01T00:00:00.000Z',
        endsAt: '2027-08-31T00:00:00.000Z',
      });

    await request(app.getHttpServer())
      .put(`/corporate/contracts/${contract.contractId}/batches`)
      .set(...authHeader(app, platformAdmin))
      .send({ batchIds: [batchId] });

    const { body: payment } = await request(app.getHttpServer())
      .post(`/corporate/contracts/${contract.contractId}/payment`)
      .set(...authHeader(app, platformAdmin))
      .send({ amount: 1000 });

    await request(app.getHttpServer())
      .post(`/payments/${payment.paymentId}/approve`)
      .set(...authHeader(app, platformAdmin))
      .send({ notes: 'ok' });

    return contract.contractId;
  }

  function addRosterMember(
    actor: TestActor,
    cId: string,
    body: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .post(`/corporate/me/contracts/${cId}/roster`)
      .set(...authHeader(app, actor))
      .send(body);
  }

  function removeRosterMember(
    actor: TestActor,
    cId: string,
    userId: string,
    body: Record<string, unknown> = {},
  ) {
    return request(app.getHttpServer())
      .delete(`/corporate/me/contracts/${cId}/roster/${userId}`)
      .set(...authHeader(app, actor))
      .send(body);
  }

  function getRoster(actor: TestActor, cId: string) {
    return request(app.getHttpServer())
      .get(`/corporate/me/contracts/${cId}/roster`)
      .set(...authHeader(app, actor));
  }

  function bulkUpload(
    actor: TestActor,
    cId: string,
    rows: Record<string, unknown>[],
  ) {
    return request(app.getHttpServer())
      .post(`/corporate/me/contracts/${cId}/roster/bulk`)
      .set(...authHeader(app, actor))
      .send({ rows });
  }

  function getUploadResult(actor: TestActor, cId: string, uploadId: string) {
    return request(app.getHttpServer())
      .get(`/corporate/me/contracts/${cId}/roster/uploads/${uploadId}`)
      .set(...authHeader(app, actor));
  }

  function getAuditLog(actor: TestActor, action: string) {
    return request(app.getHttpServer())
      .get(`/audit-log?action=${encodeURIComponent(action)}`)
      .set(...authHeader(app, actor));
  }

  describe('ticket 27 – roster self-service', () => {
    it('adds an existing user to the roster by email, consuming a seat', async () => {
      const student = await createUser(database, 'LEARNER');

      const { body, status } = await addRosterMember(corporateAdmin, contractId, {
        email: student.email,
      });

      expect(status).toBe(201);
      expect(body.seatId).toEqual(expect.any(String));
      expect(body.userId).toBe(student.userId);

      const { body: roster } = await getRoster(corporateAdmin, contractId).expect(200);
      expect(roster.map((r: { userId: string }) => r.userId)).toContain(student.userId);
    });

    it('creates an account when the email is new and adds them to the roster', async () => {
      const newEmail = 'new-student@college.test';

      const { body, status } = await addRosterMember(corporateAdmin, contractId, {
        email: newEmail,
        firstName: 'New',
        lastName: 'Student',
      });

      expect(status).toBe(201);
      expect(body.seatId).toEqual(expect.any(String));
      expect(body.email).toBe(newEmail);

      const { body: roster } = await getRoster(corporateAdmin, contractId).expect(200);
      expect(roster.some((r: { email: string }) => r.email === newEmail)).toBe(true);
    });

    it('refuses to add beyond the contract seat count with SEAT_POOL_EXHAUSTED', async () => {
      const smallContractId = await makeActiveContract(1);

      const first = await createUser(database, 'LEARNER');
      await addRosterMember(corporateAdmin, smallContractId, { email: first.email }).expect(201);

      const second = await createUser(database, 'LEARNER');
      const { body, status } = await addRosterMember(corporateAdmin, smallContractId, {
        email: second.email,
      });

      expect(status).toBe(409);
      expect(body.code).toBe('SEAT_POOL_EXHAUSTED');
    });

    it('refuses to add the same student twice with SEAT_ALREADY_CLAIMED', async () => {
      const student = await createUser(database, 'LEARNER');
      await addRosterMember(corporateAdmin, contractId, { email: student.email }).expect(201);

      const { body, status } = await addRosterMember(corporateAdmin, contractId, {
        email: student.email,
      });

      expect(status).toBe(409);
      expect(body.code).toBe('SEAT_ALREADY_CLAIMED');
    });

    it('removes a student and frees their seat for reassignment', async () => {
      const smallContractId = await makeActiveContract(1);
      const student = await createUser(database, 'LEARNER');
      const replacement = await createUser(database, 'LEARNER');

      const { body: added } = await addRosterMember(corporateAdmin, smallContractId, {
        email: student.email,
      }).expect(201);

      await removeRosterMember(corporateAdmin, smallContractId, added.userId, {
        reason: 'Transferred',
      }).expect(200);

      const { body: roster } = await getRoster(corporateAdmin, smallContractId);
      expect(roster.some((r: { userId: string }) => r.userId === added.userId)).toBe(false);

      await addRosterMember(corporateAdmin, smallContractId, {
        email: replacement.email,
      }).expect(201);
    });

    it('returns 404 (not 403) when a rival corporate admin tries to add to another org contract', async () => {
      const rivalCompanyId = await createCompany(database);
      const rivalAdmin = await createCorporateAdmin(database, rivalCompanyId);
      const student = await createUser(database, 'LEARNER');

      const { status } = await addRosterMember(rivalAdmin, contractId, {
        email: student.email,
      });

      expect(status).toBe(404);
    });

    it('returns 404 (not 403) when a rival corporate admin tries to remove from another org contract', async () => {
      const student = await createUser(database, 'LEARNER');
      const { body: added } = await addRosterMember(corporateAdmin, contractId, {
        email: student.email,
      }).expect(201);

      const rivalCompanyId = await createCompany(database);
      const rivalAdmin = await createCorporateAdmin(database, rivalCompanyId);

      const { status } = await removeRosterMember(rivalAdmin, contractId, added.userId);

      expect(status).toBe(404);
    });

    it('records each addition in the audit log with the actor', async () => {
      const student = await createUser(database, 'LEARNER');
      await addRosterMember(corporateAdmin, contractId, { email: student.email }).expect(201);

      const { body: entries } = await getAuditLog(platformAdmin, 'corporate.roster.add').expect(200);

      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].action).toBe('corporate.roster.add');
      expect(entries[0].actorId).toBe(corporateAdmin.userId);
    });

    it('records each removal in the audit log with the actor', async () => {
      const student = await createUser(database, 'LEARNER');
      const { body: added } = await addRosterMember(corporateAdmin, contractId, {
        email: student.email,
      }).expect(201);

      await removeRosterMember(corporateAdmin, contractId, added.userId, {
        reason: 'Left',
      }).expect(200);

      const { body: entries } = await getAuditLog(platformAdmin, 'corporate.roster.remove').expect(200);

      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].action).toBe('corporate.roster.remove');
      expect(entries[0].actorId).toBe(corporateAdmin.userId);
    });

    it('concurrent seat claims never exceed the seat count', async () => {
      const tightContractId = await makeActiveContract(1);
      const studentA = await createUser(database, 'LEARNER');
      const studentB = await createUser(database, 'LEARNER');

      const results = await Promise.all([
        addRosterMember(corporateAdmin, tightContractId, { email: studentA.email }),
        addRosterMember(corporateAdmin, tightContractId, { email: studentB.email }),
      ]);

      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([201, 409]);

      const { body: roster } = await getRoster(corporateAdmin, tightContractId);
      expect(roster).toHaveLength(1);
    });
  });

  describe('ticket 28 – bulk roster upload', () => {
    it('uploads a list of students and returns per-row results via the upload record', async () => {
      const rows = [
        { email: 'alice@college.test', firstName: 'Alice' },
        { email: 'bob@college.test', firstName: 'Bob' },
      ];

      const { body: upload, status } = await bulkUpload(corporateAdmin, contractId, rows);

      expect(status).toBe(202);
      expect(upload.uploadId).toEqual(expect.any(String));

      const { body: result } = await getUploadResult(
        corporateAdmin,
        contractId,
        upload.uploadId,
      ).expect(200);

      expect(result.status).toBe('DONE');
      expect(result.rowResults).toHaveLength(2);
      expect(result.rowResults.every((r: { status: string }) => r.status === 'ADDED')).toBe(true);
    });

    it('reports invalid rows with the reason without stopping valid rows', async () => {
      const rows = [
        { email: 'valid@college.test' },
        { email: 'not-an-email' },
        { email: 'also-valid@college.test' },
        {},
      ];

      const { body: upload } = await bulkUpload(corporateAdmin, contractId, rows).expect(202);

      const { body: result } = await getUploadResult(
        corporateAdmin,
        contractId,
        upload.uploadId,
      ).expect(200);

      expect(result.rowResults).toHaveLength(4);

      const byStatus = (s: string) =>
        result.rowResults.filter((r: { status: string }) => r.status === s);

      expect(byStatus('ADDED')).toHaveLength(2);
      expect(byStatus('INVALID')).toHaveLength(2);
    });

    it('refuses the entire upload before consuming any seats when it would exceed remaining seats', async () => {
      const tightContractId = await makeActiveContract(2);
      const rows = [
        { email: 'one@college.test' },
        { email: 'two@college.test' },
        { email: 'three@college.test' },
      ];

      const { body: upload } = await bulkUpload(corporateAdmin, tightContractId, rows).expect(202);

      const { body: result } = await getUploadResult(
        corporateAdmin,
        tightContractId,
        upload.uploadId,
      ).expect(200);

      expect(result.rowResults.every((r: { status: string }) => r.status === 'SEAT_POOL_EXHAUSTED')).toBe(true);

      const { body: roster } = await getRoster(corporateAdmin, tightContractId);
      expect(roster).toHaveLength(0);
    });

    it('marks already-enrolled members as EXISTING and does not duplicate them', async () => {
      const existingStudent = await createUser(database, 'LEARNER');
      await addRosterMember(corporateAdmin, contractId, { email: existingStudent.email }).expect(201);

      const rows = [
        { email: existingStudent.email },
        { email: 'new-person@college.test' },
      ];

      const { body: upload } = await bulkUpload(corporateAdmin, contractId, rows).expect(202);

      const { body: result } = await getUploadResult(
        corporateAdmin,
        contractId,
        upload.uploadId,
      ).expect(200);

      const existing = result.rowResults.find((r: { email: string }) => r.email === existingStudent.email);
      const added = result.rowResults.find((r: { email: string }) => r.email === 'new-person@college.test');

      expect(existing.status).toBe('EXISTING');
      expect(added.status).toBe('ADDED');

      const { body: roster } = await getRoster(corporateAdmin, contractId);
      const emails = roster.map((r: { email: string }) => r.email);
      const count = emails.filter((e: string) => e === existingStudent.email).length;
      expect(count).toBe(1);
    });

    it('returns an upload record immediately with uploadId (non-blocking architecture)', async () => {
      const rows = [{ email: 'async-test@college.test' }];

      const { body: upload, status } = await bulkUpload(corporateAdmin, contractId, rows);

      expect(status).toBe(202);
      expect(upload.uploadId).toEqual(expect.any(String));
      expect(upload.rowCount).toBe(1);
    });

    it('concurrent bulk uploads do not oversubscribe seats', async () => {
      const tightContractId = await makeActiveContract(2);

      const [resultA, resultB] = await Promise.all([
        bulkUpload(corporateAdmin, tightContractId, [
          { email: 'race-a1@college.test' },
          { email: 'race-a2@college.test' },
        ]),
        bulkUpload(corporateAdmin, tightContractId, [
          { email: 'race-b1@college.test' },
          { email: 'race-b2@college.test' },
        ]),
      ]);

      expect(resultA.status).toBe(202);
      expect(resultB.status).toBe(202);

      const { body: roster } = await getRoster(corporateAdmin, tightContractId);
      expect(roster.length).toBeLessThanOrEqual(2);
    });

    it('returns 404 when a rival admin tries to read the upload result', async () => {
      const rows = [{ email: 'secret@college.test' }];
      const { body: upload } = await bulkUpload(corporateAdmin, contractId, rows).expect(202);

      const rivalCompanyId = await createCompany(database);
      const rivalAdmin = await createCorporateAdmin(database, rivalCompanyId);

      await getUploadResult(rivalAdmin, contractId, upload.uploadId).expect(404);
    });
  });
});
