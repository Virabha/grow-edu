import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { corporateSubGroupMembers } from '../src/database/schema';
import { eq } from 'drizzle-orm';

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

describe('roster sub-groups', () => {
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

  async function makeActiveContract(overrides: Record<string, unknown> = {}): Promise<string> {
    const batchId = await createBatch(database, platformAdmin.userId);
    const { body: contract } = await request(app.getHttpServer())
      .post('/corporate/contracts')
      .set(...authHeader(app, platformAdmin))
      .send({
        companyId,
        title: 'Test contract',
        seatCount: 10,
        startsAt: '2026-09-01T00:00:00.000Z',
        endsAt: '2027-08-31T00:00:00.000Z',
        ...overrides,
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

  async function enrollStudent(): Promise<TestActor> {
    const student = await createUser(database, 'LEARNER');
    const { body: link } = await request(app.getHttpServer())
      .post(`/corporate/me/contracts/${contractId}/join-link`)
      .set(...authHeader(app, corporateAdmin))
      .send({});
    await request(app.getHttpServer())
      .post('/corporate/join/redeem')
      .set(...authHeader(app, student))
      .send({ token: link.token });
    return student;
  }

  function createSubGroup(actor: TestActor, cId: string, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post(`/corporate/me/contracts/${cId}/sub-groups`)
      .set(...authHeader(app, actor))
      .send(body);
  }

  function listSubGroups(actor: TestActor, cId: string) {
    return request(app.getHttpServer())
      .get(`/corporate/me/contracts/${cId}/sub-groups`)
      .set(...authHeader(app, actor));
  }

  function deleteSubGroup(actor: TestActor, cId: string, subGroupId: string) {
    return request(app.getHttpServer())
      .delete(`/corporate/me/contracts/${cId}/sub-groups/${subGroupId}`)
      .set(...authHeader(app, actor));
  }

  function addMember(actor: TestActor, cId: string, subGroupId: string, userId: string) {
    return request(app.getHttpServer())
      .post(`/corporate/me/contracts/${cId}/sub-groups/${subGroupId}/members`)
      .set(...authHeader(app, actor))
      .send({ userId });
  }

  function removeMember(actor: TestActor, cId: string, subGroupId: string, userId: string) {
    return request(app.getHttpServer())
      .delete(`/corporate/me/contracts/${cId}/sub-groups/${subGroupId}/members/${userId}`)
      .set(...authHeader(app, actor));
  }

  it('creates a sub-group and returns it', async () => {
    const { body, status } = await createSubGroup(corporateAdmin, contractId, {
      name: 'Year 1',
    });

    expect(status).toBe(201);
    expect(body.subGroupId).toEqual(expect.any(String));
    expect(body.name).toBe('Year 1');
    expect(body.contractId).toBe(contractId);
  });

  it('lists sub-groups on a contract', async () => {
    await createSubGroup(corporateAdmin, contractId, { name: 'Department A' }).expect(201);
    await createSubGroup(corporateAdmin, contractId, { name: 'Department B' }).expect(201);

    const { body } = await listSubGroups(corporateAdmin, contractId).expect(200);

    expect(body).toHaveLength(2);
    const names = body.map((g: { name: string }) => g.name);
    expect(names).toContain('Department A');
    expect(names).toContain('Department B');
  });

  it('rejects creation with a missing name', async () => {
    await createSubGroup(corporateAdmin, contractId, {}).expect(400);
  });

  it('assigns a student on the roster to a sub-group', async () => {
    const student = await enrollStudent();
    const { body: group } = await createSubGroup(corporateAdmin, contractId, {
      name: 'Section 1',
    }).expect(201);

    const { body: member, status } = await addMember(
      corporateAdmin,
      contractId,
      group.subGroupId,
      student.userId,
    );

    expect(status).toBe(201);
    expect(member.userId).toBe(student.userId);
    expect(member.subGroupId).toBe(group.subGroupId);
  });

  it('refuses to add a student who is not on the roster', async () => {
    const outsider = await createUser(database, 'LEARNER');
    const { body: group } = await createSubGroup(corporateAdmin, contractId, {
      name: 'Section 1',
    }).expect(201);

    await addMember(corporateAdmin, contractId, group.subGroupId, outsider.userId).expect(404);
  });

  it('refuses to add the same student to a sub-group twice', async () => {
    const student = await enrollStudent();
    const { body: group } = await createSubGroup(corporateAdmin, contractId, {
      name: 'Section 1',
    }).expect(201);

    await addMember(corporateAdmin, contractId, group.subGroupId, student.userId).expect(201);
    await addMember(corporateAdmin, contractId, group.subGroupId, student.userId).expect(409);
  });

  it('removes a member from a sub-group manually', async () => {
    const student = await enrollStudent();
    const { body: group } = await createSubGroup(corporateAdmin, contractId, {
      name: 'Section 1',
    }).expect(201);
    await addMember(corporateAdmin, contractId, group.subGroupId, student.userId).expect(201);

    await removeMember(corporateAdmin, contractId, group.subGroupId, student.userId).expect(200);

    const remaining = await database.db
      .select()
      .from(corporateSubGroupMembers)
      .where(eq(corporateSubGroupMembers.subGroupId, group.subGroupId));
    expect(remaining).toHaveLength(0);
  });

  it('returns 404 when removing a member who is not in the sub-group', async () => {
    const student = await enrollStudent();
    const { body: group } = await createSubGroup(corporateAdmin, contractId, {
      name: 'Section 1',
    }).expect(201);

    await removeMember(corporateAdmin, contractId, group.subGroupId, student.userId).expect(404);
  });

  it('membership does not affect the student access to batches', async () => {
    const student = await enrollStudent();
    const { body: group } = await createSubGroup(corporateAdmin, contractId, {
      name: 'Section 1',
    }).expect(201);
    await addMember(corporateAdmin, contractId, group.subGroupId, student.userId).expect(201);

    const { body: mine } = await request(app.getHttpServer())
      .get('/batches/mine')
      .set(...authHeader(app, student))
      .expect(200);

    expect((mine.data ?? mine).length).toBeGreaterThan(0);
  });

  it('sub-groups are invisible to an admin from another organisation', async () => {
    await createSubGroup(corporateAdmin, contractId, { name: 'Secret group' }).expect(201);

    const rivalCompanyId = await createCompany(database);
    const rivalAdmin = await createCorporateAdmin(database, rivalCompanyId);

    await listSubGroups(rivalAdmin, contractId).expect(404);
    await createSubGroup(rivalAdmin, contractId, { name: 'Hostile' }).expect(404);
  });

  it('returns 404 (not 403) when a rival admin tries to read another contract', async () => {
    const rivalCompanyId = await createCompany(database);
    const rivalAdmin = await createCorporateAdmin(database, rivalCompanyId);

    const res = await listSubGroups(rivalAdmin, contractId);
    expect(res.status).toBe(404);
  });

  it('removes a student from all sub-groups when their seat is released', async () => {
    const student = await enrollStudent();
    const { body: group1 } = await createSubGroup(corporateAdmin, contractId, {
      name: 'Group 1',
    }).expect(201);
    const { body: group2 } = await createSubGroup(corporateAdmin, contractId, {
      name: 'Group 2',
    }).expect(201);
    await addMember(corporateAdmin, contractId, group1.subGroupId, student.userId).expect(201);
    await addMember(corporateAdmin, contractId, group2.subGroupId, student.userId).expect(201);

    await request(app.getHttpServer())
      .delete(`/corporate/contracts/${contractId}/seats/${student.userId}`)
      .set(...authHeader(app, platformAdmin))
      .send({ reason: 'Left the college' })
      .expect(200);

    const memberships = await database.db
      .select()
      .from(corporateSubGroupMembers)
      .where(eq(corporateSubGroupMembers.userId, student.userId));
    expect(memberships).toHaveLength(0);
  });

  it('deleting a sub-group removes all its members', async () => {
    const student = await enrollStudent();
    const { body: group } = await createSubGroup(corporateAdmin, contractId, {
      name: 'Temp group',
    }).expect(201);
    await addMember(corporateAdmin, contractId, group.subGroupId, student.userId).expect(201);

    await deleteSubGroup(corporateAdmin, contractId, group.subGroupId).expect(200);

    const members = await database.db
      .select()
      .from(corporateSubGroupMembers)
      .where(eq(corporateSubGroupMembers.subGroupId, group.subGroupId));
    expect(members).toHaveLength(0);
  });

  it('returns 404 when deleting a non-existent sub-group', async () => {
    await deleteSubGroup(
      corporateAdmin,
      contractId,
      'non-existent-id',
    ).expect(404);
  });

  it('returns 404 when adding a member to a non-existent sub-group', async () => {
    const student = await enrollStudent();
    await addMember(corporateAdmin, contractId, 'non-existent-id', student.userId).expect(404);
  });

  it('blocks access for non-corporate-admin roles', async () => {
    const learner = await createUser(database, 'LEARNER');
    await createSubGroup(learner, contractId, { name: 'Nope' }).expect(403);
    await listSubGroups(learner, contractId).expect(403);
  });
});
