import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createUser, createBatch } from './support/factories';

describe('payment approval', () => {
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

  function checkout(actor: TestActor) {
    return request(app.getHttpServer())
      .post(`/batches/${batchId}/checkout`)
      .set(...authHeader(app, actor))
      .send({});
  }

  function approve(paymentId: string) {
    return request(app.getHttpServer())
      .post(`/payments/${paymentId}/approve`)
      .set(...authHeader(app, admin))
      .send({ notes: 'Proof checked' });
  }

  function reject(paymentId: string) {
    return request(app.getHttpServer())
      .post(`/payments/${paymentId}/reject`)
      .set(...authHeader(app, admin))
      .send({ reason: 'The proof is unreadable' });
  }

  async function enrolledBatchIds(actor: TestActor): Promise<string[]> {
    const { body } = await request(app.getHttpServer())
      .get('/batches/mine')
      .set(...authHeader(app, actor))
      .expect(200);
    return (body.data ?? body).map((b: { batchId: string }) => b.batchId);
  }

  it('grants nothing until the payment is approved', async () => {
    await checkout(student).expect(201);

    expect(await enrolledBatchIds(student)).toEqual([]);
  });

  it('grants access to the batch that was paid for', async () => {
    const { body: started } = await checkout(student).expect(201);

    await approve(started.paymentId).expect(200);

    expect(await enrolledBatchIds(student)).toEqual([batchId]);
  });

  it('grants nothing when the payment is rejected', async () => {
    const { body: started } = await checkout(student).expect(201);

    await reject(started.paymentId).expect(200);

    expect(await enrolledBatchIds(student)).toEqual([]);
  });

  it('grants access after the student uploads proof and the owner approves', async () => {
    const { body: started } = await checkout(student).expect(201);

    await request(app.getHttpServer())
      .post(`/payments/${started.paymentId}/upload-proof`)
      .set(...authHeader(app, student))
      .send({
        proofUrl: 'https://files.example/proof.png',
        transactionId: 'TXN-90210',
        payerName: 'A Student',
      })
      .expect(201);

    await approve(started.paymentId).expect(200);

    expect(await enrolledBatchIds(student)).toEqual([batchId]);
  });

  it('refuses to approve a payment twice', async () => {
    const { body: started } = await checkout(student).expect(201);

    await approve(started.paymentId).expect(200);
    const { body } = await approve(started.paymentId).expect(200);

    expect(body.message).toMatch(/already completed/i);
    expect(await enrolledBatchIds(student)).toEqual([batchId]);
  });

  async function enrolmentNotices(actor: TestActor): Promise<string[]> {
    const { body } = await request(app.getHttpServer())
      .get('/notifications')
      .set(...authHeader(app, actor))
      .expect(200);
    return (body.data ?? body)
      .filter((n: { type: string }) => n.type === 'BATCH_ENROLLMENT')
      .map((n: { title: string }) => n.title);
  }

  it('tells the student they are enrolled only once approval sticks', async () => {
    const { body: started } = await checkout(student).expect(201);

    expect(await enrolmentNotices(student)).toEqual([]);

    await approve(started.paymentId).expect(200);

    expect(await enrolmentNotices(student)).toHaveLength(1);
  });

  it('never announces an enrolment for a rejected payment', async () => {
    const { body: started } = await checkout(student).expect(201);

    await reject(started.paymentId).expect(200);

    expect(await enrolmentNotices(student)).toEqual([]);
  });

  it('records which batch a payment was for', async () => {
    const { body: started } = await checkout(student).expect(201);

    const { body: payment } = await request(app.getHttpServer())
      .get(`/payments/${started.paymentId}`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(payment.batchId).toBe(batchId);
  });
});
