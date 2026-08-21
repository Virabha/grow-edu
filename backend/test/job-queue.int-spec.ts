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

describe('job queue', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let queue: InlineJobQueue;
  let admin: TestActor;
  let student: TestActor;
  let batchId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
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
    batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);
  });

  async function notificationTitles(actor: TestActor): Promise<string[]> {
    const { body } = await request(app.getHttpServer())
      .get('/notifications')
      .set(...authHeader(app, actor))
      .expect(200);
    return (body.data ?? body).map((n: { title: string }) => n.title);
  }

  it('runs a job queued by a request, and its effect is observable', async () => {
    await request(app.getHttpServer())
      .post(`/batches/${batchId}/announcements`)
      .set(...authHeader(app, admin))
      .send({ title: 'Exam moved', body: 'The mock test is now Sunday.' })
      .expect(201);

    expect(await notificationTitles(student)).toEqual([
      'Announcement: Exam moved',
    ]);
  });

  it('completes the queued work inside the request that triggered it', async () => {
    const before = await notificationTitles(student);
    expect(before).toEqual([]);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/announcements`)
      .set(...authHeader(app, admin))
      .send({ title: 'No sleeping', body: 'Asserted with no poll or wait.' })
      .expect(201);

    expect(await notificationTitles(student)).toHaveLength(1);
  });

  it('gives up on a failing job after a bounded number of attempts', async () => {
    let attempts = 0;
    queue.register('test.always-fails', async () => {
      attempts += 1;
      throw new Error('nope');
    });

    await queue.enqueue('test.always-fails', {});

    expect(attempts).toBe(queue.attemptsFor('test.always-fails'));
    expect(attempts).toBeGreaterThan(1);
    expect(queue.failureCount('test.always-fails')).toBe(1);
  });

  it('stops retrying once a job succeeds', async () => {
    let attempts = 0;
    queue.register('test.succeeds-on-second', async () => {
      attempts += 1;
      if (attempts < 2) throw new Error('not yet');
    });

    await queue.enqueue('test.succeeds-on-second', {});

    expect(attempts).toBe(2);
    expect(queue.failureCount('test.succeeds-on-second')).toBe(0);
  });

  it('fires a repeatable job once its interval has elapsed', async () => {
    let runs = 0;
    queue.register('test.repeating', async () => {
      runs += 1;
    });
    await queue.repeat('test.repeating', 60_000);

    expect(await queue.tick()).not.toContain('test.repeating');
    expect(runs).toBe(0);

    clock.advance(60_000);
    expect(await queue.tick()).toContain('test.repeating');
    expect(runs).toBe(1);

    clock.advance(60_000);
    await queue.tick();
    expect(runs).toBe(2);
  });
});
