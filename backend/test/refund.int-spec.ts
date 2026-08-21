import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createUser, createBatch } from './support/factories';

interface AuditEntry {
  action: string;
  actorId: string;
  targetId: string;
  after: {
    amount: number;
    accessRevoked: boolean;
    revokedBatchIds: string[];
    isFullRefund: boolean;
  };
}

describe('refunds', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let admin: TestActor;
  let student: TestActor;
  let batchId: string;

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
    student = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId, '4000.00');
  });

  async function buy(batch: string): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .post(`/batches/${batch}/checkout`)
      .set(...authHeader(app, student))
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .post(`/payments/${body.paymentId}/approve`)
      .set(...authHeader(app, admin))
      .send({})
      .expect(200);
    return body.paymentId;
  }

  function askForRefund(orderId: string, reason = 'Wrong batch') {
    return request(app.getHttpServer())
      .post(`/orders/${orderId}/refund-request`)
      .set(...authHeader(app, student))
      .send({ reason });
  }

  function resolve(orderId: string, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .patch(`/admin/orders/${orderId}/refund`)
      .set(...authHeader(app, admin))
      .send(body);
  }

  async function enrolledBatchIds(): Promise<string[]> {
    const { body } = await request(app.getHttpServer())
      .get('/batches/mine')
      .set(...authHeader(app, student))
      .expect(200);
    return (body.data ?? body).map((b: { batchId: string }) => b.batchId);
  }

  async function refundAudit(): Promise<AuditEntry[]> {
    const { body } = await request(app.getHttpServer())
      .get('/audit-log?action=order.refund.approve')
      .set(...authHeader(app, admin))
      .expect(200);
    return body as AuditEntry[];
  }

  async function order(orderId: string) {
    const { body } = await request(app.getHttpServer())
      .get(`/admin/orders/${orderId}`)
      .set(...authHeader(app, admin))
      .expect(200);
    return body;
  }

  async function invoiceLedger() {
    const { body } = await request(app.getHttpServer())
      .get('/admin/invoices')
      .set(...authHeader(app, admin))
      .expect(200);
    return body as { kind: string; total: number; correctsInvoiceNo: string | null }[];
  }

  it('revokes exactly the access the refunded payment granted', async () => {
    const otherBatch = await createBatch(database, admin.userId, '2500.00');
    const refunded = await buy(batchId);
    await buy(otherBatch);

    expect((await enrolledBatchIds()).sort()).toEqual([batchId, otherBatch].sort());

    await askForRefund(refunded).expect(201);
    await resolve(refunded, { status: 'APPROVED' }).expect(200);

    expect(await enrolledBatchIds()).toEqual([otherBatch]);
  });

  it('takes access away at once, not at the next sign-in', async () => {
    const orderId = await buy(batchId);
    const header = authHeader(app, student);

    await request(app.getHttpServer())
      .get(`/batches/${batchId}/timetable`)
      .set(...header)
      .expect(200);

    await askForRefund(orderId).expect(201);
    await resolve(orderId, { status: 'APPROVED' }).expect(200);

    await request(app.getHttpServer())
      .get(`/batches/${batchId}/timetable`)
      .set(...header)
      .expect(404);
  });

  it('leaves access alone for a partial refund', async () => {
    const orderId = await buy(batchId);

    await askForRefund(orderId).expect(201);
    await resolve(orderId, { status: 'APPROVED', amount: 1000 }).expect(200);

    expect(await enrolledBatchIds()).toEqual([batchId]);

    const after = await order(orderId);
    expect(after.refundedAmount).toBe(1000);
    expect(after.status).toBe('COMPLETED');
  });

  it('revokes on a partial refund when that is asked for', async () => {
    const orderId = await buy(batchId);

    await askForRefund(orderId).expect(201);
    await resolve(orderId, {
      status: 'APPROVED',
      amount: 1000,
      revokeAccess: true,
    }).expect(200);

    expect(await enrolledBatchIds()).toEqual([]);
  });

  it('marks the order refunded only once the whole amount is back', async () => {
    const orderId = await buy(batchId);

    await askForRefund(orderId).expect(201);
    await resolve(orderId, { status: 'APPROVED', amount: 1500 }).expect(200);
    expect((await order(orderId)).status).toBe('COMPLETED');

    await askForRefund(orderId).expect(201);
    await resolve(orderId, { status: 'APPROVED', amount: 2500 }).expect(200);

    const finished = await order(orderId);
    expect(finished.status).toBe('REFUNDED');
    expect(finished.refundedAmount).toBe(4000);
    expect(await enrolledBatchIds()).toEqual([]);
  });

  it('refuses to refund more than was paid, and changes nothing when it does', async () => {
    const orderId = await buy(batchId);

    await askForRefund(orderId).expect(201);
    await resolve(orderId, { status: 'APPROVED', amount: 9999 }).expect(409);

    const untouched = await order(orderId);
    expect(untouched.refundedAmount).toBe(0);
    expect(untouched.status).toBe('COMPLETED');
    expect(untouched.refundStatus).toBe('REQUESTED');
    expect(await enrolledBatchIds()).toEqual([batchId]);
    expect(await refundAudit()).toEqual([]);
  });

  it('refuses a second refund once the order is fully refunded', async () => {
    const orderId = await buy(batchId);

    await askForRefund(orderId).expect(201);
    await resolve(orderId, { status: 'APPROVED' }).expect(200);

    await askForRefund(orderId).expect(400);
  });

  it('leaves access in place when the refund is declined', async () => {
    const orderId = await buy(batchId);

    await askForRefund(orderId).expect(201);
    await resolve(orderId, { status: 'DECLINED' }).expect(200);

    expect(await enrolledBatchIds()).toEqual([batchId]);
    expect((await order(orderId)).refundedAmount).toBe(0);
  });

  it('records the actor, the amount and whether access went', async () => {
    const orderId = await buy(batchId);

    await askForRefund(orderId).expect(201);
    await resolve(orderId, { status: 'APPROVED', amount: 1000 }).expect(200);

    const [entry] = await refundAudit();

    expect(entry.actorId).toBe(admin.userId);
    expect(entry.targetId).toBe(orderId);
    expect(entry.after.amount).toBe(1000);
    expect(entry.after.accessRevoked).toBe(false);
    expect(entry.after.isFullRefund).toBe(false);
    expect(entry.after.revokedBatchIds).toEqual([]);
  });

  it('records the batch a full refund took back', async () => {
    const orderId = await buy(batchId);

    await askForRefund(orderId).expect(201);
    await resolve(orderId, { status: 'APPROVED' }).expect(200);

    const [entry] = await refundAudit();

    expect(entry.after.accessRevoked).toBe(true);
    expect(entry.after.revokedBatchIds).toEqual([batchId]);
  });

  it('credits the invoice the refunded payment produced', async () => {
    const orderId = await buy(batchId);

    await askForRefund(orderId).expect(201);
    await resolve(orderId, { status: 'APPROVED', amount: 1000 }).expect(200);

    const ledger = await invoiceLedger();
    const creditNotes = ledger.filter((i) => i.kind === 'CREDIT_NOTE');

    expect(creditNotes).toHaveLength(1);
    expect(creditNotes[0].total).toBe(1000);
    expect(creditNotes[0].correctsInvoiceNo).toBe('INV-000001');
  });

  it('keeps a student from resolving their own refund', async () => {
    const orderId = await buy(batchId);
    await askForRefund(orderId).expect(201);

    await request(app.getHttpServer())
      .patch(`/admin/orders/${orderId}/refund`)
      .set(...authHeader(app, student))
      .send({ status: 'APPROVED' })
      .expect(403);

    expect(await enrolledBatchIds()).toEqual([batchId]);
  });
});
