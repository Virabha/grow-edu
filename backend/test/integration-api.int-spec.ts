import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as request from 'supertest';

import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createUser, createCompany } from './support/factories';
import {
  corporateContracts,
  corporateSeats,
} from '../src/database/schema';

describe('integration API (ticket 27)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;

  let platformAdmin: TestActor;
  let run = 0;

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    app = await createTestApp(database, clock);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    run += 1;
    clock.reset();
    await truncateAll(database);
    platformAdmin = await createUser(database, 'PLATFORM_ADMIN');
  });

  async function issueCredential(companyId: string): Promise<{ credentialId: string; key: string }> {
    const res = await request(app.getHttpServer())
      .post('/enterprise/credentials')
      .set(...authHeader(app, platformAdmin))
      .send({ companyId, label: `test-credential-${run}` })
      .expect(201);
    return res.body as { credentialId: string; key: string };
  }

  async function seedStudentInCompany(companyId: string): Promise<string> {
    const student = await createUser(database, 'LEARNER');
    const contractId = randomUUID();
    await database.db.insert(corporateContracts).values({
      contractId,
      companyId,
      title: `Contract ${run}`,
      seatCount: 10,
      startsAt: new Date('2026-01-01'),
      endsAt: new Date('2027-12-31'),
      status: 'ACTIVE',
      createdBy: platformAdmin.userId,
    });
    await database.db.insert(corporateSeats).values({
      seatId: randomUUID(),
      contractId,
      userId: student.userId,
      claimedAt: new Date(),
    });
    return student.userId;
  }

  function apiRequest(key: string) {
    return {
      get: (path: string) =>
        request(app.getHttpServer())
          .get(path)
          .set('Authorization', `Bearer ${key}`),
    };
  }

  it('credentials are issued independently of user accounts', async () => {
    const companyId = await createCompany(database);
    const { credentialId, key } = await issueCredential(companyId);

    expect(typeof credentialId).toBe('string');
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(10);
  });

  it('a valid credential reaches the integration API', async () => {
    const companyId = await createCompany(database);
    const { key } = await issueCredential(companyId);

    const res = await apiRequest(key).get('/enterprise/v1/students');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('a revoked credential stops working immediately', async () => {
    const companyId = await createCompany(database);
    const { credentialId, key } = await issueCredential(companyId);

    await request(app.getHttpServer())
      .delete(`/enterprise/credentials/${credentialId}`)
      .set(...authHeader(app, platformAdmin))
      .expect(200);

    const res = await apiRequest(key).get('/enterprise/v1/students');
    expect(res.status).toBe(401);
  });

  it("a credential only reaches its corporate's students", async () => {
    const companyA = await createCompany(database);
    const companyB = await createCompany(database);

    const { key: keyA } = await issueCredential(companyA);
    const studentAId = await seedStudentInCompany(companyA);
    const studentBId = await seedStudentInCompany(companyB);

    const studentsRes = await apiRequest(keyA).get('/enterprise/v1/students');
    expect(studentsRes.status).toBe(200);
    const studentIds = (studentsRes.body as { userId: string }[]).map((s) => s.userId);
    expect(studentIds).toContain(studentAId);
    expect(studentIds).not.toContain(studentBId);
  });

  it('an out-of-scope student progress request is indistinguishable from a missing one (404)', async () => {
    const companyA = await createCompany(database);
    const companyB = await createCompany(database);
    const { key: keyA } = await issueCredential(companyA);
    const studentBId = await seedStudentInCompany(companyB);

    const outOfScope = await apiRequest(keyA).get(
      `/enterprise/v1/students/${studentBId}/progress`,
    );
    expect(outOfScope.status).toBe(404);

    const nonExistentId = randomUUID();
    const nonExistent = await apiRequest(keyA).get(
      `/enterprise/v1/students/${nonExistentId}/progress`,
    );
    expect(nonExistent.status).toBe(404);

    expect(outOfScope.status).toBe(nonExistent.status);
  });

  it('an out-of-scope student attendance request is indistinguishable from a missing one (404)', async () => {
    const companyA = await createCompany(database);
    const companyB = await createCompany(database);
    const { key: keyA } = await issueCredential(companyA);
    const studentBId = await seedStudentInCompany(companyB);

    const outOfScope = await apiRequest(keyA).get(
      `/enterprise/v1/students/${studentBId}/attendance`,
    );
    expect(outOfScope.status).toBe(404);

    const nonExistentId = randomUUID();
    const nonExistent = await apiRequest(keyA).get(
      `/enterprise/v1/students/${nonExistentId}/attendance`,
    );
    expect(nonExistent.status).toBe(404);

    expect(outOfScope.status).toBe(nonExistent.status);
  });

  it('a request without credentials is rejected with 401', async () => {
    const res = await request(app.getHttpServer()).get('/enterprise/v1/students');
    expect(res.status).toBe(401);
  });

  it('an invalid (unknown) credential is rejected with 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/enterprise/v1/students')
      .set('Authorization', `Bearer ${randomUUID()}`);
    expect(res.status).toBe(401);
  });

  it('a valid credential lists all students for that company', async () => {
    const companyId = await createCompany(database);
    const { key } = await issueCredential(companyId);

    const s1 = await seedStudentInCompany(companyId);
    const s2 = await seedStudentInCompany(companyId);

    const res = await apiRequest(key).get('/enterprise/v1/students');
    expect(res.status).toBe(200);
    const ids = (res.body as { userId: string }[]).map((s) => s.userId);
    expect(ids).toContain(s1);
    expect(ids).toContain(s2);
  });

  it('progress is returned for a student belonging to the corporate', async () => {
    const companyId = await createCompany(database);
    const { key } = await issueCredential(companyId);
    const studentId = await seedStudentInCompany(companyId);

    const res = await apiRequest(key).get(
      `/enterprise/v1/students/${studentId}/progress`,
    );
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(studentId);
    expect(Array.isArray(res.body.enrollments)).toBe(true);
  });

  it('attendance is returned for a student belonging to the corporate', async () => {
    const companyId = await createCompany(database);
    const { key } = await issueCredential(companyId);
    const studentId = await seedStudentInCompany(companyId);

    const res = await apiRequest(key).get(
      `/enterprise/v1/students/${studentId}/attendance`,
    );
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(studentId);
    expect(Array.isArray(res.body.records)).toBe(true);
  });

  it('the API path is versioned under /enterprise/v1', async () => {
    const companyId = await createCompany(database);
    const { key } = await issueCredential(companyId);

    const versioned = await apiRequest(key).get('/enterprise/v1/students');
    expect(versioned.status).toBe(200);

    const unversioned = await request(app.getHttpServer())
      .get('/enterprise/students')
      .set('Authorization', `Bearer ${key}`);
    expect(unversioned.status).toBe(404);
  });
});
