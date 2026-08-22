import { INestApplication } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import {
  createBatch,
  createCompany,
  createCorporateAdmin,
  createUser,
} from './support/factories';

interface InvoiceBody {
  invoiceId: string;
  invoiceNo: string;
  kind: 'INVOICE' | 'CREDIT_NOTE';
  paymentId: string | null;
  contractId: string | null;
  correctsInvoiceId: string | null;
  correctsInvoiceNo: string | null;
  total: number;
  reason: string | null;
  buyerEmail: string;
}

describe('invoices', () => {
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
    batchId = await createBatch(database, admin.userId, '4999.00');
  });

  function checkout(actor: TestActor, batch: string = batchId) {
    return request(app.getHttpServer())
      .post(`/batches/${batch}/checkout`)
      .set(...authHeader(app, actor))
      .send({});
  }

  function approve(paymentId: string) {
    return request(app.getHttpServer())
      .post(`/payments/${paymentId}/approve`)
      .set(...authHeader(app, admin))
      .send({ notes: 'Proof checked' });
  }

  async function buyAs(actor: TestActor, batch: string = batchId) {
    const { body } = await checkout(actor, batch).expect(201);
    await approve(body.paymentId).expect(200);
    return body.paymentId as string;
  }

  async function myInvoices(actor: TestActor): Promise<InvoiceBody[]> {
    const { body } = await request(app.getHttpServer())
      .get('/invoices')
      .set(...authHeader(app, actor))
      .expect(200);
    return body;
  }

  async function ledger(): Promise<InvoiceBody[]> {
    const { body } = await request(app.getHttpServer())
      .get('/admin/invoices')
      .set(...authHeader(app, admin))
      .expect(200);
    return body;
  }

  it('produces an invoice for every completed purchase', async () => {
    const paymentId = await buyAs(student);

    const mine = await myInvoices(student);

    expect(mine).toHaveLength(1);
    expect(mine[0].paymentId).toBe(paymentId);
    expect(mine[0].kind).toBe('INVOICE');
    expect(mine[0].total).toBe(4999);
    expect(mine[0].buyerEmail).toBe(student.email);
  });

  it('produces nothing while a purchase is still pending', async () => {
    await checkout(student).expect(201);

    expect(await myInvoices(student)).toEqual([]);
  });

  it('numbers invoices sequentially with no gaps', async () => {
    const second = await createUser(database, 'LEARNER');
    const third = await createUser(database, 'LEARNER');

    await buyAs(student);
    await buyAs(second);
    await buyAs(third);

    expect((await ledger()).map((i) => i.invoiceNo)).toEqual([
      'INV-000001',
      'INV-000002',
      'INV-000003',
    ]);
  });

  it('gives concurrently issued invoices different consecutive numbers', async () => {
    const buyers = await Promise.all(
      Array.from({ length: 5 }, () => createUser(database, 'LEARNER')),
    );
    const paymentIds = await Promise.all(
      buyers.map(async (buyer) => {
        const { body } = await checkout(buyer).expect(201);
        return body.paymentId as string;
      }),
    );

    const responses = await Promise.all(paymentIds.map((id) => approve(id)));
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);

    const numbers = (await ledger()).map((i) => i.invoiceNo);

    expect(new Set(numbers).size).toBe(5);
    expect(numbers).toEqual([
      'INV-000001',
      'INV-000002',
      'INV-000003',
      'INV-000004',
      'INV-000005',
    ]);
  });

  it('issues one invoice per purchase however often approval is retried', async () => {
    const { body } = await checkout(student).expect(201);

    await approve(body.paymentId).expect(200);
    await approve(body.paymentId).expect(200);
    await approve(body.paymentId).expect(200);

    expect(await myInvoices(student)).toHaveLength(1);
  });

  it('refuses to let anything change an issued invoice', async () => {
    await buyAs(student);
    const [invoice] = await myInvoices(student);

    await expect(
      database.db.execute(
        sql`update invoices set total = '1.00' where invoice_id = ${invoice.invoiceId}`,
      ),
    ).rejects.toThrow(/credit note/i);

    await expect(
      database.db.execute(
        sql`delete from invoices where invoice_id = ${invoice.invoiceId}`,
      ),
    ).rejects.toThrow(/credit note/i);

    const [unchanged] = await myInvoices(student);
    expect(unchanged.total).toBe(4999);
  });

  it('exposes no route that edits an invoice', async () => {
    await buyAs(student);
    const [invoice] = await myInvoices(student);

    for (const method of ['patch', 'put', 'delete'] as const) {
      const response = await request(app.getHttpServer())
        [method](`/invoices/${invoice.invoiceId}`)
        .set(...authHeader(app, admin))
        .send({ total: 1 });
      expect(response.status).toBe(404);
    }

    for (const method of ['patch', 'put', 'delete'] as const) {
      const response = await request(app.getHttpServer())
        [method](`/admin/invoices/${invoice.invoiceId}`)
        .set(...authHeader(app, admin))
        .send({ total: 1 });
      expect(response.status).toBe(404);
    }
  });

  it('corrects an invoice with a credit note that names the original', async () => {
    await buyAs(student);
    const [original] = await myInvoices(student);

    const { body: note } = await request(app.getHttpServer())
      .post(`/admin/invoices/${original.invoiceId}/credit-note`)
      .set(...authHeader(app, admin))
      .send({ reason: 'Charged the wrong batch price' })
      .expect(201);

    expect(note.kind).toBe('CREDIT_NOTE');
    expect(note.invoiceNo).toBe('CN-000001');
    expect(note.correctsInvoiceId).toBe(original.invoiceId);
    expect(note.correctsInvoiceNo).toBe(original.invoiceNo);
    expect(note.total).toBe(4999);
    expect(note.reason).toBe('Charged the wrong batch price');

    const mine = await myInvoices(student);
    expect(mine).toHaveLength(2);
    const stillThere = mine.filter((i) => i.invoiceId === original.invoiceId);
    expect(stillThere.map((i) => i.total)).toEqual([4999]);
  });

  it('refuses to credit more than the invoice was worth', async () => {
    await buyAs(student);
    const [original] = await myInvoices(student);

    await request(app.getHttpServer())
      .post(`/admin/invoices/${original.invoiceId}/credit-note`)
      .set(...authHeader(app, admin))
      .send({ reason: 'Partial refund', amount: 3000 })
      .expect(201);

    const { body } = await request(app.getHttpServer())
      .post(`/admin/invoices/${original.invoiceId}/credit-note`)
      .set(...authHeader(app, admin))
      .send({ reason: 'And the rest, twice over', amount: 3000 })
      .expect(409);

    expect(JSON.stringify(body)).toMatch(/1999/);
  });

  it('numbers credit notes in their own gapless series', async () => {
    const second = await createUser(database, 'LEARNER');
    await buyAs(student);
    await buyAs(second);

    const all = await ledger();
    for (const invoice of all) {
      await request(app.getHttpServer())
        .post(`/admin/invoices/${invoice.invoiceId}/credit-note`)
        .set(...authHeader(app, admin))
        .send({ reason: 'Cancelled cohort' })
        .expect(201);
    }

    const after = await ledger();
    expect(after.map((i) => i.invoiceNo)).toEqual([
      'CN-000001',
      'CN-000002',
      'INV-000001',
      'INV-000002',
    ]);
  });

  it('references the payment on an individual invoice', async () => {
    const paymentId = await buyAs(student);

    const [invoice] = await myInvoices(student);

    expect(invoice.paymentId).toBe(paymentId);
    expect(invoice.contractId).toBeNull();
  });

  it('references the contract on a corporate invoice', async () => {
    const companyId = await createCompany(database);
    const corporateAdmin = await createCorporateAdmin(database, companyId);

    const { body: contract } = await request(app.getHttpServer())
      .post('/corporate/contracts')
      .set(...authHeader(app, admin))
      .send({
        companyId,
        title: 'Autumn cohort seats',
        seatCount: 40,
        startsAt: '2026-09-01T00:00:00.000Z',
        endsAt: '2027-08-31T00:00:00.000Z',
      })
      .expect(201);

    const { body: payment } = await request(app.getHttpServer())
      .post(`/corporate/contracts/${contract.contractId}/payment`)
      .set(...authHeader(app, admin))
      .send({ amount: 100000, transactionId: 'NEFT-1234' })
      .expect(201);

    await approve(payment.paymentId).expect(200);

    const [invoice] = await request(app.getHttpServer())
      .get('/admin/invoices')
      .set(...authHeader(app, admin))
      .expect(200)
      .then((r) => r.body as InvoiceBody[]);

    expect(invoice.contractId).toBe(contract.contractId);
    expect(invoice.paymentId).toBe(payment.paymentId);
    expect(invoice.total).toBe(100000);
    expect(corporateAdmin.role).toBe('CORPORATE_ADMIN');
  });

  it('keeps one buyer from reading another buyer\'s invoice', async () => {
    const other = await createUser(database, 'LEARNER');
    await buyAs(student);
    const [invoice] = await myInvoices(student);

    await request(app.getHttpServer())
      .get(`/invoices/${invoice.invoiceId}`)
      .set(...authHeader(app, other))
      .expect(403);

    await request(app.getHttpServer())
      .get(`/invoices/${invoice.invoiceId}`)
      .set(...authHeader(app, student))
      .expect(200);
  });
});
