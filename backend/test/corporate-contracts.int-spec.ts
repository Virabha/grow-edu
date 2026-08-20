import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';

import { corporateContracts } from '../src/database/schema';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import {
  createUser,
  createCompany,
  createBatch,
  createCorporateAdmin,
} from './support/factories';

describe('corporate contracts', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let admin: TestActor;
  let companyId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    companyId = await createCompany(database);
  });

  function createContract(actor: TestActor, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post('/corporate/contracts')
      .set(...authHeader(app, actor))
      .send(body);
  }

  const validContract = () => ({
    companyId,
    title: 'Autumn intake',
    seatCount: 25,
    startsAt: '2026-09-01T00:00:00.000Z',
    endsAt: '2027-08-31T00:00:00.000Z',
  });

  function attachBatches(
    actor: TestActor,
    contractId: string,
    batchIds: string[],
  ) {
    return request(app.getHttpServer())
      .put(`/corporate/contracts/${contractId}/batches`)
      .set(...authHeader(app, actor))
      .send({ batchIds });
  }

  function getContract(actor: TestActor, contractId: string) {
    return request(app.getHttpServer())
      .get(`/corporate/contracts/${contractId}`)
      .set(...authHeader(app, actor));
  }

  function recordPayment(
    actor: TestActor,
    contractId: string,
    body: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .post(`/corporate/contracts/${contractId}/payment`)
      .set(...authHeader(app, actor))
      .send(body);
  }

  function approvePayment(actor: TestActor, paymentId: string) {
    return request(app.getHttpServer())
      .post(`/payments/${paymentId}/approve`)
      .set(...authHeader(app, actor))
      .send({ notes: 'Bank transfer seen' });
  }

  function issueJoinLink(
    actor: TestActor,
    contractId: string,
    body: Record<string, unknown> = {},
  ) {
    return request(app.getHttpServer())
      .post(`/corporate/contracts/${contractId}/join-link`)
      .set(...authHeader(app, actor))
      .send(body);
  }

  function revokeJoinLinks(actor: TestActor, contractId: string) {
    return request(app.getHttpServer())
      .delete(`/corporate/contracts/${contractId}/join-link`)
      .set(...authHeader(app, actor));
  }

  function redeem(actor: TestActor, token: string) {
    return request(app.getHttpServer())
      .post('/corporate/join/redeem')
      .set(...authHeader(app, actor))
      .send({ token });
  }

  function myBatches(actor: TestActor) {
    return request(app.getHttpServer())
      .get('/batches/mine')
      .set(...authHeader(app, actor));
  }

  async function activeContract(
    overrides: Record<string, unknown> = {},
  ): Promise<{ contractId: string; batchIds: string[] }> {
    const { body: contract } = await createContract(admin, {
      ...validContract(),
      ...overrides,
    });
    const batchIds = [
      await createBatch(database, admin.userId),
      await createBatch(database, admin.userId),
    ];
    await attachBatches(admin, contract.contractId, batchIds);
    const { body: payment } = await recordPayment(admin, contract.contractId, {
      amount: 1000,
    });
    await approvePayment(admin, payment.paymentId);
    return { contractId: contract.contractId, batchIds };
  }

  it('records what a college has bought', async () => {
    const created = await createContract(admin, validContract()).expect(201);

    expect(created.body).toMatchObject({
      companyId,
      title: 'Autumn intake',
      seatCount: 25,
      status: 'DRAFT',
    });
    expect(created.body.contractId).toEqual(expect.any(String));
  });

  it('spends a contract across every batch attached to it', async () => {
    const { body: contract } = await createContract(admin, validContract());
    const physics = await createBatch(database, admin.userId);
    const chemistry = await createBatch(database, admin.userId);

    await attachBatches(admin, contract.contractId, [physics, chemistry]).expect(
      200,
    );

    const { body: reloaded } = await getContract(
      admin,
      contract.contractId,
    ).expect(200);
    expect(reloaded.batches.map((b: { batchId: string }) => b.batchId).sort()).toEqual(
      [physics, chemistry].sort(),
    );
  });

  it('activates a contract only once its payment is approved', async () => {
    const { body: contract } = await createContract(admin, validContract());

    const { body: payment } = await recordPayment(admin, contract.contractId, {
      amount: 250000,
      payerName: 'Bursar, Example College',
      transactionId: 'NEFT-11223344',
    }).expect(201);

    const awaiting = await getContract(admin, contract.contractId);
    expect(awaiting.body.status).toBe('AWAITING_PAYMENT');

    await approvePayment(admin, payment.paymentId).expect(200);

    const active = await getContract(admin, contract.contractId);
    expect(active.body.status).toBe('ACTIVE');
  });

  it('lands a redeeming student in every batch the college bought', async () => {
    const { contractId, batchIds } = await activeContract();
    const { body: link } = await issueJoinLink(admin, contractId).expect(201);
    const student = await createUser(database, 'LEARNER');

    await redeem(student, link.token).expect(201);

    const { body: mine } = await myBatches(student).expect(200);
    const enrolled = (mine.data ?? mine).map(
      (b: { batchId: string }) => b.batchId,
    );
    expect(enrolled.sort()).toEqual([...batchIds].sort());
  });

  it('marks a seat holder as having arrived through their college', async () => {
    const { contractId, batchIds } = await activeContract();
    const { body: link } = await issueJoinLink(admin, contractId).expect(201);
    const student = await createUser(database, 'LEARNER');

    await redeem(student, link.token).expect(201);

    const { body } = await request(app.getHttpServer())
      .get(`/batches/${batchIds[0]}/enrollments`)
      .set(...authHeader(app, admin))
      .expect(200);

    const seat = body.data.find(
      (e: { userId: string }) => e.userId === student.userId,
    );
    const { body: contract } = await request(app.getHttpServer())
      .get(`/corporate/contracts/${contractId}`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(seat.source).toBe('CORPORATE_SEAT');
    expect(seat.accessEndsAt).toBe(contract.endsAt);
  });

  it('stops working once the purchased seat count is reached', async () => {
    const { contractId } = await activeContract({ seatCount: 2 });
    const { body: link } = await issueJoinLink(admin, contractId);

    for (let i = 0; i < 2; i += 1) {
      const joiner = await createUser(database, 'LEARNER');
      await redeem(joiner, link.token).expect(201);
    }

    const overflow = await createUser(database, 'LEARNER');
    const refused = await redeem(overflow, link.token);

    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('SEAT_POOL_EXHAUSTED');
    const { body: mine } = await myBatches(overflow).expect(200);
    expect((mine.data ?? mine).length).toBe(0);
  });

  it('gives the last seat to exactly one of two simultaneous redemptions', async () => {
    const { contractId } = await activeContract({ seatCount: 1 });
    const { body: link } = await issueJoinLink(admin, contractId);
    const first = await createUser(database, 'LEARNER');
    const second = await createUser(database, 'LEARNER');

    const outcomes = await Promise.all([
      redeem(first, link.token),
      redeem(second, link.token),
    ]);

    const statuses = outcomes.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409]);
    expect(
      outcomes.find((r) => r.status === 409)?.body.code,
    ).toBe('SEAT_POOL_EXHAUSTED');
  });

  it('tells a student which of the four things went wrong', async () => {
    const { contractId } = await activeContract({ seatCount: 5 });
    const student = await createUser(database, 'LEARNER');

    const unknown = await redeem(student, 'a'.repeat(43));
    expect(unknown.status).toBe(404);
    expect(unknown.body.code).toBe('JOIN_LINK_NOT_FOUND');

    const { body: expired } = await issueJoinLink(admin, contractId, {
      expiresAt: new Date(Date.now() + 1500).toISOString(),
    });
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const stale = await redeem(student, expired.token);
    expect(stale.status).toBe(403);
    expect(stale.body.code).toBe('JOIN_LINK_EXPIRED');

    const { body: live } = await issueJoinLink(admin, contractId);
    await redeem(student, live.token).expect(201);
    const again = await redeem(student, live.token);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('SEAT_ALREADY_CLAIMED');

    await revokeJoinLinks(admin, contractId).expect(200);
    const other = await createUser(database, 'LEARNER');
    const withdrawn = await redeem(other, live.token);
    expect(withdrawn.status).toBe(403);
    expect(withdrawn.body.code).toBe('JOIN_LINK_REVOKED');
  });

  it('frees a seat for someone else when the college reclaims it', async () => {
    const { contractId } = await activeContract({ seatCount: 1 });
    const { body: link } = await issueJoinLink(admin, contractId);
    const leaver = await createUser(database, 'LEARNER');
    const replacement = await createUser(database, 'LEARNER');

    await redeem(leaver, link.token).expect(201);
    expect((await redeem(replacement, link.token)).status).toBe(409);

    await request(app.getHttpServer())
      .delete(`/corporate/contracts/${contractId}/seats/${leaver.userId}`)
      .set(...authHeader(app, admin))
      .send({ reason: 'Left the college' })
      .expect(200);

    await redeem(replacement, link.token).expect(201);

    const { body: gone } = await myBatches(leaver).expect(200);
    expect((gone.data ?? gone).length).toBe(0);
  });

  function myContracts(actor: TestActor) {
    return request(app.getHttpServer())
      .get('/corporate/me/contracts')
      .set(...authHeader(app, actor));
  }

  function myRoster(actor: TestActor, contractId: string) {
    return request(app.getHttpServer())
      .get(`/corporate/me/contracts/${contractId}/roster`)
      .set(...authHeader(app, actor));
  }

  it('shows a corporate admin what they bought and how much is left', async () => {
    const { contractId } = await activeContract({ seatCount: 10 });
    const { body: link } = await issueJoinLink(admin, contractId);
    const joined = await createUser(database, 'LEARNER');
    await redeem(joined, link.token).expect(201);
    const corporateAdmin = await createCorporateAdmin(database, companyId);

    const { body: contracts } = await myContracts(corporateAdmin).expect(200);

    expect(contracts).toHaveLength(1);
    expect(contracts[0]).toMatchObject({
      contractId,
      seatCount: 10,
      seatsClaimed: 1,
      seatsRemaining: 9,
      status: 'ACTIVE',
    });

    const { body: roster } = await myRoster(corporateAdmin, contractId).expect(
      200,
    );
    expect(roster.map((s: { userId: string }) => s.userId)).toEqual([
      joined.userId,
    ]);
  });

  it('never shows one college another college’s roster', async () => {
    const { contractId } = await activeContract({ seatCount: 5 });
    const { body: link } = await issueJoinLink(admin, contractId);
    const joined = await createUser(database, 'LEARNER');
    await redeem(joined, link.token).expect(201);

    const rivalCompanyId = await createCompany(database);
    const rivalAdmin = await createCorporateAdmin(database, rivalCompanyId);

    const { body: theirs } = await myContracts(rivalAdmin).expect(200);
    expect(theirs).toEqual([]);

    await myRoster(rivalAdmin, contractId).expect(404);
  });

  async function moveContractEnd(contractId: string, endsAt: Date) {
    await database.db
      .update(corporateContracts)
      .set({ endsAt })
      .where(eq(corporateContracts.contractId, contractId));
  }

  it('stops handing out seats once the contract period has ended', async () => {
    const { contractId } = await activeContract({ seatCount: 5 });
    const { body: link } = await issueJoinLink(admin, contractId);
    const latecomer = await createUser(database, 'LEARNER');

    await moveContractEnd(contractId, new Date(Date.now() - 86_400_000));

    const refused = await redeem(latecomer, link.token);

    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('CONTRACT_NOT_ACTIVE');
  });

  it('warns the owner before a contract expires', async () => {
    const { contractId } = await activeContract({ seatCount: 5 });
    const soon = new Date(Date.now() + 10 * 86_400_000);
    await moveContractEnd(contractId, soon);

    const { body: expiring } = await request(app.getHttpServer())
      .get('/corporate/contracts?expiringWithinDays=30')
      .set(...authHeader(app, admin))
      .expect(200);

    expect(expiring.map((c: { contractId: string }) => c.contractId)).toEqual([
      contractId,
    ]);
    expect(expiring[0].daysUntilExpiry).toBe(10);
    expect(expiring[0].status).toBe('EXPIRING');
  });

  it('keeps a college invoice out of the order history', async () => {
    const { body: contract } = await createContract(admin, validContract());
    await recordPayment(admin, contract.contractId, { amount: 250000 });

    const { body: orders } = await request(app.getHttpServer())
      .get('/admin/orders')
      .set(...authHeader(app, admin))
      .expect(200);

    expect(orders.data).toEqual([]);
  });

  function claim(token: string, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post('/corporate/join/claim')
      .send({ token, ...body });
  }

  it('creates an account for a student who does not have one yet', async () => {
    const { contractId, batchIds } = await activeContract();
    const { body: link } = await issueJoinLink(admin, contractId);
    const email = 'asha.new@college.test';
    const password = 'correct-horse-battery-staple';

    await claim(link.token, { email, password, firstName: 'Asha' }).expect(201);

    const { body: session } = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const { body: mine } = await request(app.getHttpServer())
      .get('/batches/mine')
      .set('Authorization', `Bearer ${session.access_token}`)
      .expect(200);
    expect((mine.data ?? mine).map((b: { batchId: string }) => b.batchId).sort()).toEqual(
      [...batchIds].sort(),
    );
  });

  it('sends an existing account holder to sign in rather than claiming blind', async () => {
    const { contractId } = await activeContract();
    const { body: link } = await issueJoinLink(admin, contractId);
    const existing = await createUser(database, 'LEARNER');

    const refused = await claim(link.token, {
      email: existing.email,
      password: 'whatever-they-typed',
      firstName: 'Impostor',
    });

    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('ACCOUNT_EXISTS');
    const { body: mine } = await myBatches(existing).expect(200);
    expect((mine.data ?? mine).length).toBe(0);
  });

  it('shows the owner how many seats are claimed and how many remain', async () => {
    const { contractId } = await activeContract({ seatCount: 4 });
    const { body: link } = await issueJoinLink(admin, contractId);
    for (let i = 0; i < 3; i += 1) {
      await redeem(await createUser(database, 'LEARNER'), link.token).expect(
        201,
      );
    }

    const { body: contract } = await getContract(admin, contractId).expect(200);

    expect(contract.seatsClaimed).toBe(3);
    expect(contract.seatsRemaining).toBe(1);
  });

  it('stops a cancelled contract handing out any more seats', async () => {
    const { contractId } = await activeContract({ seatCount: 5 });
    const { body: link } = await issueJoinLink(admin, contractId);
    const early = await createUser(database, 'LEARNER');
    await redeem(early, link.token).expect(201);

    await request(app.getHttpServer())
      .post(`/corporate/contracts/${contractId}/cancel`)
      .set(...authHeader(app, admin))
      .send({ reason: 'College withdrew' })
      .expect(200);

    const late = await createUser(database, 'LEARNER');
    const refused = await redeem(late, link.token);
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('CONTRACT_NOT_ACTIVE');

    const { body: mine } = await myBatches(early).expect(200);
    expect((mine.data ?? mine).length).toBeGreaterThan(0);
  });

  it('refuses a seat while the contract is not active', async () => {
    const { body: contract } = await createContract(admin, validContract());
    await attachBatches(admin, contract.contractId, [
      await createBatch(database, admin.userId),
    ]);
    const { body: link } = await issueJoinLink(admin, contract.contractId);
    const student = await createUser(database, 'LEARNER');

    const refused = await redeem(student, link.token);

    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('CONTRACT_NOT_ACTIVE');
  });

  it('refuses a seat while the college has not paid yet', async () => {
    const { body: contract } = await createContract(admin, validContract());
    await attachBatches(admin, contract.contractId, [
      await createBatch(database, admin.userId),
    ]);
    await recordPayment(admin, contract.contractId, { amount: 1000 });

    const { body: awaiting } = await request(app.getHttpServer())
      .get(`/corporate/contracts/${contract.contractId}`)
      .set(...authHeader(app, admin))
      .expect(200);
    expect(awaiting.status).toBe('AWAITING_PAYMENT');

    const { body: link } = await issueJoinLink(admin, contract.contractId);
    const student = await createUser(database, 'LEARNER');

    const refused = await redeem(student, link.token);

    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('CONTRACT_NOT_ACTIVE');
  });
});
