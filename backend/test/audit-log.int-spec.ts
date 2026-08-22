import { INestApplication } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createUser, createBatch } from './support/factories';

describe('audit log', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let student: TestActor;

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
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
  });

  function suspend(target: TestActor) {
    return request(app.getHttpServer())
      .post(`/users/${target.userId}/suspend`)
      .set(...authHeader(app, admin))
      .send({ reason: 'Shared their login' });
  }

  async function entries(query = '') {
    const { body } = await request(app.getHttpServer())
      .get(`/audit-log${query}`)
      .set(...authHeader(app, admin))
      .expect(200);
    return body;
  }

  it('records exactly one entry naming who did it', async () => {
    await suspend(student).expect(200);

    const log = await entries();
    const suspensions = log.filter(
      (e: { action: string }) => e.action === 'user.suspend',
    );

    expect(suspensions).toHaveLength(1);
    expect(suspensions[0].actorId).toBe(admin.userId);
    expect(suspensions[0].actorRole).toBe('PLATFORM_ADMIN');
    expect(suspensions[0].targetType).toBe('user');
    expect(suspensions[0].targetId).toBe(student.userId);
  });

  it('captures what changed', async () => {
    await suspend(student).expect(200);

    const [entry] = await entries('?action=user.suspend');

    expect(entry.before).toEqual({ suspendedAt: null });
    expect(entry.after.suspensionReason).toBe('Shared their login');
    expect(entry.after.suspendedAt).toEqual(expect.any(String));
  });

  it('records the request context alongside the action', async () => {
    await request(app.getHttpServer())
      .post(`/users/${student.userId}/suspend`)
      .set(...authHeader(app, admin))
      .set('x-request-id', 'req-abc-123')
      .set('User-Agent', 'groEdu-test-agent')
      .send({ reason: 'Context check' })
      .expect(200);

    const [entry] = await entries('?action=user.suspend');

    expect(entry.requestId).toBe('req-abc-123');
    expect(entry.userAgent).toBe('groEdu-test-agent');
    expect(entry.ipAddress).toEqual(expect.any(String));
  });

  it('refuses to let anything change a recorded entry', async () => {
    await suspend(student).expect(200);
    const [entry] = await entries('?action=user.suspend');

    await expect(
      database.db.execute(
        sql`update audit_log set action = 'tampered' where audit_id = ${entry.auditId}`,
      ),
    ).rejects.toThrow(/append-only/i);

    await expect(
      database.db.execute(
        sql`delete from audit_log where audit_id = ${entry.auditId}`,
      ),
    ).rejects.toThrow(/append-only/i);

    const [unchanged] = await entries('?action=user.suspend');
    expect(unchanged.action).toBe('user.suspend');
  });

  it('records who approved a payment', async () => {
    const batchId = await createBatch(database, admin.userId, '4999.00');
    const { body: started } = await request(app.getHttpServer())
      .post(`/batches/${batchId}/checkout`)
      .set(...authHeader(app, student))
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post(`/payments/${started.paymentId}/approve`)
      .set(...authHeader(app, admin))
      .send({ notes: 'Proof checked' })
      .expect(200);

    const [entry] = await entries('?action=payment.approve');
    expect(entry.actorId).toBe(admin.userId);
    expect(entry.targetId).toBe(started.paymentId);
    expect(entry.after.status).toBe('COMPLETED');
  });

  it('searches by actor, by target and by time range', async () => {
    const other = await createUser(database, 'LEARNER');
    await suspend(student).expect(200);

    clock.advance(86_400_000);
    await request(app.getHttpServer())
      .post(`/users/${other.userId}/suspend`)
      .set(...authHeader(app, admin))
      .send({ reason: 'Second one' })
      .expect(200);

    expect(await entries(`?actorId=${admin.userId}`)).toHaveLength(2);
    expect(await entries(`?targetId=${student.userId}`)).toHaveLength(1);

    const cutoff = new Date(clock.epochMillis() - 3_600_000).toISOString();
    const recent = await entries(`?from=${encodeURIComponent(cutoff)}`);
    expect(recent).toHaveLength(1);
    expect(recent[0].targetId).toBe(other.userId);
  });

  it('names both accounts when one admin acts as another', async () => {
    const support = await createUser(database, 'PLATFORM_ADMIN');

    await request(app.getHttpServer())
      .post(`/users/${student.userId}/suspend`)
      .set(...authHeader(app, admin, { impersonatorId: support.userId }))
      .send({ reason: 'Acting on a support ticket' })
      .expect(200);

    const [entry] = await entries('?action=user.suspend');

    expect(entry.actorId).toBe(admin.userId);
    expect(entry.impersonatorId).toBe(support.userId);
  });

  it('keeps the log away from anyone who is not the owner', async () => {
    await request(app.getHttpServer())
      .get('/audit-log')
      .set(...authHeader(app, student))
      .expect(403);
  });
});
