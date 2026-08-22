import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createUser, createBatch, enrol } from './support/factories';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';

describe('waitlist, transfer and lifecycle', () => {
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
    await truncateAll(database);
    clock.set('2026-10-01T09:00:00.000Z');
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId, '0', { capacity: 1 });
  });

  function checkout(actor: TestActor, batch: string = batchId) {
    return request(app.getHttpServer())
      .post(`/batches/${batch}/checkout`)
      .set(...authHeader(app, actor))
      .send({});
  }

  function revoke(actor: TestActor, batch: string = batchId) {
    return request(app.getHttpServer())
      .delete(`/batches/${batch}/enrollments/${actor.userId}`)
      .set(...authHeader(app, admin));
  }

  async function enrolledBatchIds(actor: TestActor): Promise<string[]> {
    const { body } = await request(app.getHttpServer())
      .get('/batches/mine')
      .set(...authHeader(app, actor))
      .expect(200);
    return (body.data ?? body).map((b: { batchId: string }) => b.batchId);
  }

  async function myPlace(actor: TestActor, batch: string = batchId) {
    const { body } = await request(app.getHttpServer())
      .get(`/batches/${batch}/waitlist/me`)
      .set(...authHeader(app, actor))
      .expect(200);
    return body;
  }

  async function unread(actor: TestActor): Promise<number> {
    const { body } = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(...authHeader(app, actor))
      .expect(200);
    return body.count ?? body.unread ?? body;
  }

  async function batchStatus(batch: string): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .get(`/batches/${batch}`)
      .set(...authHeader(app, admin))
      .expect(200);
    return body.status;
  }

  describe('waitlist', () => {
    it('queues the overflow instead of refusing it', async () => {
      await checkout(student).expect(201);
      const late = await createUser(database, 'LEARNER');

      const { body } = await checkout(late).expect(201);

      expect(body.enrolled).toBe(false);
      expect(body.waitlisted).toBe(true);
      expect(body.position).toBe(1);
      expect(await enrolledBatchIds(late)).toEqual([]);
    });

    it('shows a waiting student where they stand', async () => {
      await checkout(student).expect(201);
      const first = await createUser(database, 'LEARNER');
      const second = await createUser(database, 'LEARNER');

      clock.set('2026-10-01T10:00:00.000Z');
      await checkout(first).expect(201);
      clock.set('2026-10-01T11:00:00.000Z');
      await checkout(second).expect(201);

      expect((await myPlace(first)).position).toBe(1);
      expect((await myPlace(second)).position).toBe(2);
    });

    it('reports nothing for a student who never waited', async () => {
      const stranger = await createUser(database, 'LEARNER');

      const place = await myPlace(stranger);

      expect(place.waiting).toBe(false);
      expect(place.position).toBeNull();
    });

    it('promotes exactly one waiting student when a place frees', async () => {
      await checkout(student).expect(201);
      const first = await createUser(database, 'LEARNER');
      const second = await createUser(database, 'LEARNER');
      clock.set('2026-10-01T10:00:00.000Z');
      await checkout(first).expect(201);
      clock.set('2026-10-01T11:00:00.000Z');
      await checkout(second).expect(201);

      await revoke(student).expect(200);

      expect(await enrolledBatchIds(first)).toEqual([batchId]);
      expect(await enrolledBatchIds(second)).toEqual([]);
      expect((await myPlace(second)).position).toBe(1);
    });

    it('tells a promoted student they are in', async () => {
      await checkout(student).expect(201);
      const waiting = await createUser(database, 'LEARNER');
      await checkout(waiting).expect(201);
      const before = await unread(waiting);

      await revoke(student).expect(200);

      expect(await unread(waiting)).toBe(before + 1);
    });

    it('fills one freed place once however many revocations race', async () => {
      const holders = await Promise.all([
        createUser(database, 'LEARNER'),
        createUser(database, 'LEARNER'),
      ]);
      const roomy = await createBatch(database, admin.userId, '0', {
        capacity: 2,
      });
      await enrol(database, roomy, holders[0].userId);
      await enrol(database, roomy, holders[1].userId);

      const waiters = await Promise.all([
        createUser(database, 'LEARNER'),
        createUser(database, 'LEARNER'),
      ]);
      for (const waiter of waiters) {
        await request(app.getHttpServer())
          .post(`/batches/${roomy}/waitlist`)
          .set(...authHeader(app, waiter))
          .send({})
          .expect(201);
      }

      await request(app.getHttpServer())
        .delete(`/batches/${roomy}/enrollments/${holders[0].userId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      const promoted = await Promise.all(
        waiters.map((w) => enrolledBatchIds(w)),
      );
      const inBatch = promoted.filter((ids) => ids.includes(roomy));

      expect(inBatch).toHaveLength(1);
    });

    it('never lets two concurrent revocations overfill a batch', async () => {
      const roomy = await createBatch(database, admin.userId, '0', {
        capacity: 2,
      });
      const holders = await Promise.all([
        createUser(database, 'LEARNER'),
        createUser(database, 'LEARNER'),
      ]);
      for (const holder of holders) {
        await enrol(database, roomy, holder.userId);
      }
      const waiters = await Promise.all(
        Array.from({ length: 4 }, () => createUser(database, 'LEARNER')),
      );
      for (const waiter of waiters) {
        await request(app.getHttpServer())
          .post(`/batches/${roomy}/waitlist`)
          .set(...authHeader(app, waiter))
          .send({})
          .expect(201);
      }

      await Promise.all(
        holders.map((h) =>
          request(app.getHttpServer())
            .delete(`/batches/${roomy}/enrollments/${h.userId}`)
            .set(...authHeader(app, admin)),
        ),
      );

      const { body } = await request(app.getHttpServer())
        .get(`/batches/${roomy}/capacity`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(body.active).toBeLessThanOrEqual(2);
      expect(body.active + body.waiting).toBe(4);
    });

    it('refuses to queue someone when the batch has room', async () => {
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/waitlist`)
        .set(...authHeader(app, student))
        .send({})
        .expect(400);
    });

    it('lets a waiting student give up their place', async () => {
      await checkout(student).expect(201);
      const waiting = await createUser(database, 'LEARNER');
      await checkout(waiting).expect(201);

      await request(app.getHttpServer())
        .delete(`/batches/${batchId}/waitlist`)
        .set(...authHeader(app, waiting))
        .expect(200);

      expect((await myPlace(waiting)).waiting).toBe(false);

      await revoke(student).expect(200);
      expect(await enrolledBatchIds(waiting)).toEqual([]);
    });
  });

  describe('transfer', () => {
    let destination: string;

    beforeEach(async () => {
      destination = await createBatch(database, admin.userId, '0', {
        capacity: 5,
      });
      await enrol(database, batchId, student.userId);
    });

    function transfer(body: Record<string, unknown>) {
      return request(app.getHttpServer())
        .post(`/batches/${batchId}/enrollments/${student.userId}/transfer`)
        .set(...authHeader(app, admin))
        .send(body);
    }

    it('moves the student in one action', async () => {
      await transfer({ toBatchId: destination }).expect(201);

      expect(await enrolledBatchIds(student)).toEqual([destination]);
    });

    it('says what carries over before the operator confirms', async () => {
      const { body } = await request(app.getHttpServer())
        .get(
          `/batches/${batchId}/enrollments/${student.userId}/transfer-preview/${destination}`,
        )
        .set(...authHeader(app, admin))
        .expect(200);

      expect(body.carried).toEqual(expect.arrayContaining(['enrolment']));
      expect(body.leftBehind).toEqual(
        expect.arrayContaining(['attendance', 'lesson progress']),
      );
      expect(body.destinationHasRoom).toBe(true);
      expect(body.willJoinWaitlist).toBe(false);
    });

    it('records the actor and both batches', async () => {
      await transfer({ toBatchId: destination, reason: 'Wrong cohort' }).expect(
        201,
      );

      const { body } = await request(app.getHttpServer())
        .get('/audit-log?action=enrolment.transfer')
        .set(...authHeader(app, admin))
        .expect(200);

      const [entry] = body;
      expect(entry.actorId).toBe(admin.userId);
      expect(entry.targetId).toBe(student.userId);
      expect(entry.before.batchId).toBe(batchId);
      expect(entry.after.batchId).toBe(destination);
      expect(entry.after.reason).toBe('Wrong cohort');
    });

    it('refuses to move a student into a full batch by default', async () => {
      const full = await createBatch(database, admin.userId, '0', {
        capacity: 1,
      });
      const holder = await createUser(database, 'LEARNER');
      await enrol(database, full, holder.userId);

      await transfer({ toBatchId: full }).expect(409);

      expect(await enrolledBatchIds(student)).toEqual([batchId]);
    });

    it('queues the student when the destination is full and that is chosen', async () => {
      const full = await createBatch(database, admin.userId, '0', {
        capacity: 1,
      });
      const holder = await createUser(database, 'LEARNER');
      await enrol(database, full, holder.userId);

      const { body } = await transfer({
        toBatchId: full,
        waitlistIfFull: true,
      }).expect(201);

      expect(body.waitlisted).toBe(true);
      expect(await enrolledBatchIds(student)).toEqual([]);
      expect((await myPlace(student, full)).position).toBe(1);
    });

    it('refuses to move a student into the batch they are already in', async () => {
      await transfer({ toBatchId: batchId }).expect(400);
    });

    it('refuses to move a student who is not enrolled', async () => {
      const stranger = await createUser(database, 'LEARNER');

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/enrollments/${stranger.userId}/transfer`)
        .set(...authHeader(app, admin))
        .send({ toBatchId: destination })
        .expect(404);
    });

    it('keeps an instructor from moving students between batches', async () => {
      const teacher = await createUser(database, 'INSTRUCTOR');

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/enrollments/${student.userId}/transfer`)
        .set(...authHeader(app, teacher))
        .send({ toBatchId: destination })
        .expect(403);

      expect(await enrolledBatchIds(student)).toEqual([batchId]);
    });
  });

  describe('lifecycle', () => {
    async function runLifecycle() {
      await queue.enqueue('batch.lifecycle.advance', undefined);
    }

    it('is a repeating scheduled job, not something a request triggers', async () => {
      clock.set('2030-01-01T00:00:00.000Z');

      expect(await queue.tick()).toContain('batch.lifecycle.advance');
    });

    it('starts a batch on its start date with no request made for it', async () => {
      const upcoming = await createBatch(database, admin.userId, '0', {
        status: 'UPCOMING' as never,
        startDate: new Date('2026-11-01T00:00:00.000Z'),
        endDate: new Date('2027-03-01T00:00:00.000Z'),
      });

      expect(await batchStatus(upcoming)).toBe('UPCOMING');

      clock.set('2026-11-01T00:00:01.000Z');
      await runLifecycle();

      expect(await batchStatus(upcoming)).toBe('ONGOING');
    });

    it('completes a batch after its end date', async () => {
      const running = await createBatch(database, admin.userId, '0', {
        status: 'ONGOING' as never,
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-11-01T00:00:00.000Z'),
      });

      clock.set('2026-11-02T00:00:00.000Z');
      await runLifecycle();

      expect(await batchStatus(running)).toBe('COMPLETED');
    });

    it('leaves an archived batch where the owner put it', async () => {
      const archived = await createBatch(database, admin.userId, '0', {
        status: 'ARCHIVED' as never,
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-11-01T00:00:00.000Z'),
      });

      clock.set('2027-01-01T00:00:00.000Z');
      await runLifecycle();

      expect(await batchStatus(archived)).toBe('ARCHIVED');
    });

    it('leaves a draft batch alone', async () => {
      const draft = await createBatch(database, admin.userId, '0', {
        status: 'DRAFT' as never,
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2027-03-01T00:00:00.000Z'),
      });

      clock.set('2026-11-01T00:00:01.000Z');
      await runLifecycle();

      expect(await batchStatus(draft)).toBe('DRAFT');
    });

    it('does not disturb a student\'s access when a batch completes', async () => {
      const running = await createBatch(database, admin.userId, '0', {
        status: 'ONGOING' as never,
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-11-01T00:00:00.000Z'),
      });
      await enrol(database, running, student.userId);

      clock.set('2026-11-02T00:00:00.000Z');
      await runLifecycle();

      expect(await batchStatus(running)).toBe('COMPLETED');
      await request(app.getHttpServer())
        .get(`/batches/${running}/timetable`)
        .set(...authHeader(app, student))
        .expect(200);
    });
  });
});
