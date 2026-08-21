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
  assignInstructor,
  createBatch,
  createUser,
  enrol,
} from './support/factories';

interface InboxEntry {
  doubtId: string;
  batchId: string;
  title: string;
  waitingHours: number;
  targetHours: number;
  isOverdue: boolean;
  assignedTo: string | null;
}

interface PromotedAnswer {
  doubtId: string;
  question: string;
  answer: string;
  askedBy: string | null;
  askedByName: string | null;
}

describe('doubt inbox and promoted answers', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let admin: TestActor;
  let teacher: TestActor;
  let colleague: TestActor;
  let outsider: TestActor;
  let student: TestActor;
  let batchId: string;

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
    await truncateAll(database);
    clock.set('2026-09-01T09:00:00.000Z');
    admin = await createUser(database, 'PLATFORM_ADMIN');
    teacher = await createUser(database, 'INSTRUCTOR');
    colleague = await createUser(database, 'INSTRUCTOR');
    outsider = await createUser(database, 'INSTRUCTOR');
    student = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId);
    await assignInstructor(database, batchId, teacher.userId);
    await assignInstructor(database, batchId, colleague.userId);
    await enrol(database, batchId, student.userId);
  });

  async function ask(title: string, extra: Record<string, unknown> = {}) {
    const { body } = await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts`)
      .set(...authHeader(app, student))
      .send({ title, body: `Please explain ${title}`, ...extra })
      .expect(201);
    return body.doubtId as string;
  }

  async function answer(doubtId: string, actor: TestActor = teacher) {
    const { body } = await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${doubtId}/replies`)
      .set(...authHeader(app, actor))
      .send({ body: 'Use conservation of momentum.' })
      .expect(201);
    return body.replyId as string;
  }

  async function inbox(actor: TestActor): Promise<InboxEntry[]> {
    const { body } = await request(app.getHttpServer())
      .get('/instructor/doubts')
      .set(...authHeader(app, actor))
      .expect(200);
    return body;
  }

  async function promotedAnswers(actor: TestActor): Promise<PromotedAnswer[]> {
    const { body } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/answers`)
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

  async function setTargetHours(hours: number) {
    await request(app.getHttpServer())
      .put('/settings/doubts')
      .set(...authHeader(app, admin))
      .send({ responseTargetHours: hours })
      .expect(200);
  }

  it('shows an instructor only the doubts on batches they teach', async () => {
    const otherBatch = await createBatch(database, admin.userId);
    await assignInstructor(database, otherBatch, outsider.userId);
    await enrol(database, otherBatch, student.userId);

    const mine = await ask('projectile motion');
    await request(app.getHttpServer())
      .post(`/batches/${otherBatch}/doubts`)
      .set(...authHeader(app, student))
      .send({ title: 'thermodynamics', body: 'Explain entropy' })
      .expect(201);

    expect((await inbox(teacher)).map((d) => d.doubtId)).toEqual([mine]);
    expect((await inbox(outsider)).map((d) => d.title)).toEqual(['thermodynamics']);
  });

  it('puts the longest wait at the top', async () => {
    clock.set('2026-09-01T09:00:00.000Z');
    const oldest = await ask('oldest');
    clock.set('2026-09-02T09:00:00.000Z');
    const middle = await ask('middle');
    clock.set('2026-09-03T09:00:00.000Z');
    const newest = await ask('newest');

    clock.set('2026-09-04T09:00:00.000Z');

    expect((await inbox(teacher)).map((d) => d.doubtId)).toEqual([
      oldest,
      middle,
      newest,
    ]);
  });

  it('measures the wait against the target the owner configured', async () => {
    await setTargetHours(6);

    clock.set('2026-09-01T09:00:00.000Z');
    await ask('waiting a while');
    clock.set('2026-09-01T18:00:00.000Z');

    const [entry] = await inbox(teacher);

    expect(entry.waitingHours).toBe(9);
    expect(entry.targetHours).toBe(6);
    expect(entry.isOverdue).toBe(true);
  });

  it('is not overdue while it is inside the target', async () => {
    await setTargetHours(48);

    clock.set('2026-09-01T09:00:00.000Z');
    await ask('asked just now');
    clock.set('2026-09-01T18:00:00.000Z');

    const [entry] = await inbox(teacher);

    expect(entry.waitingHours).toBe(9);
    expect(entry.targetHours).toBe(48);
    expect(entry.isOverdue).toBe(false);
  });

  it('drops a doubt out of the inbox once it is answered', async () => {
    const doubtId = await ask('needs an answer');
    expect(await inbox(teacher)).toHaveLength(1);

    await answer(doubtId);

    expect(await inbox(teacher)).toEqual([]);
  });

  it('hands a doubt to a colleague on the same batch', async () => {
    const doubtId = await ask('outside my subject');
    const before = await unread(colleague);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${doubtId}/assign`)
      .set(...authHeader(app, teacher))
      .send({ instructorId: colleague.userId })
      .expect(201);

    const [entry] = await inbox(colleague);
    expect(entry.assignedTo).toBe(colleague.userId);
    expect(await unread(colleague)).toBe(before + 1);
  });

  it('refuses to hand a doubt to someone who does not teach the batch', async () => {
    const doubtId = await ask('cannot be reassigned there');

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${doubtId}/assign`)
      .set(...authHeader(app, teacher))
      .send({ instructorId: outsider.userId })
      .expect(400);

    const [entry] = await inbox(teacher);
    expect(entry.assignedTo).toBeNull();
  });

  it('refuses to hand a doubt to a student', async () => {
    const doubtId = await ask('not for a student');

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${doubtId}/assign`)
      .set(...authHeader(app, teacher))
      .send({ instructorId: student.userId })
      .expect(400);
  });

  it('publishes a resolved answer to the whole batch', async () => {
    const doubtId = await ask('asked by fifty people');
    const replyId = await answer(doubtId);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${doubtId}/promote`)
      .set(...authHeader(app, teacher))
      .send({ replyId })
      .expect(201);

    const published = await promotedAnswers(student);

    expect(published).toHaveLength(1);
    expect(published[0].question).toBe('asked by fifty people');
    expect(published[0].answer).toBe('Use conservation of momentum.');
  });

  it('refuses to publish a doubt nobody has answered', async () => {
    const doubtId = await ask('still open');
    const replyId = await answer(doubtId, student);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${doubtId}/promote`)
      .set(...authHeader(app, teacher))
      .send({ replyId })
      .expect(400);
  });

  it('hides who asked unless they said it was fine', async () => {
    const anonymous = await ask('do not name me');
    const credited = await ask('happy to be named', {
      consentToAttribution: true,
    });

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${anonymous}/promote`)
      .set(...authHeader(app, teacher))
      .send({ replyId: await answer(anonymous) })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${credited}/promote`)
      .set(...authHeader(app, teacher))
      .send({ replyId: await answer(credited) })
      .expect(201);

    const published = await promotedAnswers(student);
    const hidden = published.filter((p) => p.doubtId === anonymous);
    const named = published.filter((p) => p.doubtId === credited);

    expect(hidden.map((p) => p.askedBy)).toEqual([null]);
    expect(hidden.map((p) => p.askedByName)).toEqual([null]);
    expect(named.map((p) => p.askedBy)).toEqual([student.userId]);
    expect(named[0].askedByName).toEqual(expect.any(String));
  });

  it('lets the asker change their mind about being named', async () => {
    const doubtId = await ask('undecided');
    const replyId = await answer(doubtId);

    await request(app.getHttpServer())
      .patch(`/batches/${batchId}/doubts/${doubtId}`)
      .set(...authHeader(app, student))
      .send({ consentToAttribution: true })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${doubtId}/promote`)
      .set(...authHeader(app, teacher))
      .send({ replyId })
      .expect(201);

    expect((await promotedAnswers(student))[0].askedBy).toBe(student.userId);
  });

  it('does not let anyone else claim the asker consented', async () => {
    const doubtId = await ask('mine alone');
    const replyId = await answer(doubtId);

    await request(app.getHttpServer())
      .patch(`/batches/${batchId}/doubts/${doubtId}`)
      .set(...authHeader(app, teacher))
      .send({ consentToAttribution: true })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${doubtId}/promote`)
      .set(...authHeader(app, teacher))
      .send({ replyId })
      .expect(201);

    expect((await promotedAnswers(student))[0].askedBy).toBeNull();
  });

  it('stays quiet when publishing unless told to announce it', async () => {
    const doubtId = await ask('quietly published');
    const replyId = await answer(doubtId);
    const before = await unread(student);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${doubtId}/promote`)
      .set(...authHeader(app, teacher))
      .send({ replyId })
      .expect(201);

    expect(await unread(student)).toBe(before);
    expect(await promotedAnswers(student)).toHaveLength(1);
  });

  it('announces the published answer when that is chosen', async () => {
    const doubtId = await ask('loudly published');
    const replyId = await answer(doubtId);
    const before = await unread(student);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${doubtId}/promote`)
      .set(...authHeader(app, teacher))
      .send({ replyId, notifyBatch: true })
      .expect(201);

    expect(await unread(student)).toBe(before + 1);
  });

  it('keeps another batch from reading these published answers', async () => {
    const doubtId = await ask('for this batch only');
    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${doubtId}/promote`)
      .set(...authHeader(app, teacher))
      .send({ replyId: await answer(doubtId) })
      .expect(201);

    const stranger = await createUser(database, 'LEARNER');
    await request(app.getHttpServer())
      .get(`/batches/${batchId}/answers`)
      .set(...authHeader(app, stranger))
      .expect(404);
  });

  it('takes a published answer back off the batch', async () => {
    const doubtId = await ask('published by mistake');
    const replyId = await answer(doubtId);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${doubtId}/promote`)
      .set(...authHeader(app, teacher))
      .send({ replyId })
      .expect(201);
    expect(await promotedAnswers(student)).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(`/batches/${batchId}/doubts/${doubtId}/promote`)
      .set(...authHeader(app, teacher))
      .expect(200);

    expect(await promotedAnswers(student)).toEqual([]);
  });

  it('keeps a student from publishing an answer themselves', async () => {
    const doubtId = await ask('not yours to publish');
    const replyId = await answer(doubtId);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts/${doubtId}/promote`)
      .set(...authHeader(app, student))
      .send({ replyId })
      .expect(404);

    expect(await promotedAnswers(student)).toEqual([]);
  });
});
