import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import {
  createUser,
  createBatch,
  createLesson,
  createSubject,
  enrol,
  assignInstructor,
} from './support/factories';

describe('batch access', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let enrolled: TestActor;
  let stranger: TestActor;
  let batchId: string;

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
    enrolled = await createUser(database, 'LEARNER');
    stranger = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, enrolled.userId);
  });

  function get(path: string, actor: TestActor) {
    return request(app.getHttpServer())
      .get(path)
      .set(...authHeader(app, actor));
  }

  it('tells a stranger nothing a missing batch would not tell them', async () => {
    const missing = randomUUID();

    const refused = await get(`/batches/${batchId}/sessions`, stranger);
    const absent = await get(`/batches/${missing}/sessions`, stranger);

    expect(refused.status).toBe(404);
    expect(refused.status).toBe(absent.status);
    expect(refused.body.message).toBe(absent.body.message);
  });

  it('lets an enrolled student read the batch content', async () => {
    await get(`/batches/${batchId}/sessions`, enrolled).expect(200);
  });

  it('hands the enrolled student the lessons under each subject', async () => {
    const subjectId = await createSubject(database, batchId);
    await createLesson(database, subjectId, { title: 'Kinematics' });

    const { body } = await get(`/batches/${batchId}/content`, enrolled).expect(
      200,
    );

    expect(body).toHaveLength(1);
    expect(body[0].subjectId).toBe(subjectId);
    expect(body[0].lessons.map((l: { title: string }) => l.title)).toEqual([
      'Kinematics',
    ]);
  });

  it('hides a lesson from a student who has not enrolled', async () => {
    const subjectId = await createSubject(database, batchId);
    const lessonId = await createLesson(database, subjectId);

    await get(`/batches/${batchId}/lessons/${lessonId}`, stranger).expect(404);
  });

  it('opens a free-preview lesson to anyone signed in', async () => {
    const subjectId = await createSubject(database, batchId);
    const lessonId = await createLesson(database, subjectId, {
      isFreePreview: true,
    });

    const { body } = await get(
      `/batches/${batchId}/lessons/${lessonId}`,
      stranger,
    ).expect(200);
    expect(body.lessonId).toBe(lessonId);
  });

  it('opens a free-preview lesson to a visitor who is not signed in', async () => {
    const subjectId = await createSubject(database, batchId);
    const lessonId = await createLesson(database, subjectId, {
      isFreePreview: true,
    });

    const { body } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/lessons/${lessonId}`)
      .expect(200);
    expect(body.lessonId).toBe(lessonId);
  });

  it('still hides a paid lesson from a visitor who is not signed in', async () => {
    const subjectId = await createSubject(database, batchId);
    const lessonId = await createLesson(database, subjectId);

    await request(app.getHttpServer())
      .get(`/batches/${batchId}/lessons/${lessonId}`)
      .expect(404);
  });

  it('keeps a student out once their access window has closed', async () => {
    const expired = await createUser(database, 'LEARNER');
    await enrol(database, batchId, expired.userId, {
      accessEndsAt: new Date('2020-01-01T00:00:00.000Z'),
    });

    const { body } = await get(`/batches/${batchId}/sessions`, expired).expect(
      403,
    );
    expect(body.code).toBe('BATCH_ACCESS_EXPIRED');
  });

  it('closes a student out the moment their access window passes', async () => {
    const timeboxed = await createUser(database, 'LEARNER');
    await enrol(database, batchId, timeboxed.userId, {
      accessEndsAt: new Date('2027-01-31T00:00:00.000Z'),
    });

    await get(`/batches/${batchId}/sessions`, timeboxed).expect(200);

    clock.set('2027-02-01T00:00:00.000Z');

    const { body } = await get(`/batches/${batchId}/sessions`, timeboxed).expect(
      403,
    );
    expect(body.code).toBe('BATCH_ACCESS_EXPIRED');
  });

  it('keeps a paying student in a batch that has already finished', async () => {
    const finished = await createBatch(database, admin.userId, '0', {
      startDate: new Date('2025-01-01T00:00:00.000Z'),
      endDate: new Date('2025-06-30T00:00:00.000Z'),
    });

    await request(app.getHttpServer())
      .post(`/batches/${finished}/checkout`)
      .set(...authHeader(app, stranger))
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/batches/${finished}`)
      .set(...authHeader(app, admin))
      .send({ status: 'COMPLETED' })
      .expect(200);

    await get(`/batches/${finished}/sessions`, stranger).expect(200);
  });

  it('lets an assigned instructor manage the batch', async () => {
    const teacher = await createUser(database, 'INSTRUCTOR');
    await assignInstructor(database, batchId, teacher.userId, 'LEAD');

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/subjects`)
      .set(...authHeader(app, teacher))
      .send({ name: 'Physics' })
      .expect(201);
  });

  it("refuses an instructor who is not on the batch", async () => {
    const outsider = await createUser(database, 'INSTRUCTOR');
    const other = await createBatch(database, admin.userId);
    await assignInstructor(database, other, outsider.userId);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/subjects`)
      .set(...authHeader(app, outsider))
      .send({ name: 'Chemistry' })
      .expect(404);
  });

  it('keeps an instructor from publishing a lesson to students themselves', async () => {
    const teacher = await createUser(database, 'INSTRUCTOR');
    await assignInstructor(database, batchId, teacher.userId, 'LEAD');
    const subjectId = await createSubject(database, batchId);

    const { body: lesson } = await request(app.getHttpServer())
      .post(`/batches/${batchId}/lessons`)
      .set(...authHeader(app, teacher))
      .send({
        subjectId,
        title: 'Draft chapter',
        type: 'TEXT',
        order: 1,
        status: 'READY',
      })
      .expect(201);

    expect(lesson.status).toBe('PENDING_APPROVAL');

    const { body: hidden } = await get(`/batches/${batchId}/content`, enrolled)
      .expect(200);
    expect(hidden[0].lessons).toEqual([]);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/lessons/${lesson.lessonId}/approve`)
      .set(...authHeader(app, admin))
      .send({})
      .expect(201);

    const { body: visible } = await get(`/batches/${batchId}/content`, enrolled)
      .expect(200);
    expect(visible[0].lessons).toHaveLength(1);
  });

  it('refuses to let an instructor approve their own lesson', async () => {
    const teacher = await createUser(database, 'INSTRUCTOR');
    await assignInstructor(database, batchId, teacher.userId, 'LEAD');
    const subjectId = await createSubject(database, batchId);
    const lessonId = await createLesson(database, subjectId, {
      status: 'PENDING_APPROVAL',
    });

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/lessons/${lessonId}/approve`)
      .set(...authHeader(app, teacher))
      .send({})
      .expect(403);
  });

  it('refuses a reorder that smuggles in another batch’s lesson', async () => {
    const teacher = await createUser(database, 'INSTRUCTOR');
    await assignInstructor(database, batchId, teacher.userId, 'LEAD');
    const mineSubject = await createSubject(database, batchId);
    const mineLesson = await createLesson(database, mineSubject, { order: 1 });

    const other = await createBatch(database, admin.userId);
    const otherSubject = await createSubject(database, other);
    const otherLesson = await createLesson(database, otherSubject, { order: 1 });

    await request(app.getHttpServer())
      .put(`/batches/${batchId}/lessons/reorder`)
      .set(...authHeader(app, teacher))
      .send({
        lessons: [
          { lessonId: mineLesson, order: 2 },
          { lessonId: otherLesson, order: 9 },
        ],
      })
      .expect(404);

    const { body } = await get(`/batches/${other}/content`, admin).expect(200);
    expect(body[0].lessons[0].order).toBe(1);
  });

  it('shows an instructor only the batches they are assigned to', async () => {
    const teacher = await createUser(database, 'INSTRUCTOR');
    const mine = await createBatch(database, admin.userId);
    await assignInstructor(database, mine, teacher.userId);

    const { body } = await get('/instructor/batches', teacher).expect(200);

    expect(body.data.map((b: { batchId: string }) => b.batchId)).toEqual([mine]);
  });
});
