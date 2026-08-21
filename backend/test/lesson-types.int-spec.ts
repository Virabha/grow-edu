import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

import { batchSessions, lessons } from '../src/database/schema';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import {
  createBatch,
  createLesson,
  createSubject,
  createUser,
  enrol,
} from './support/factories';

describe('lesson types', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;
  let batchId: string;
  let subjectId: string;

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
    batchId = await createBatch(database, admin.userId);
    subjectId = await createSubject(database, batchId);
    await enrol(database, batchId, student.userId);
  });

  async function createSession(): Promise<string> {
    const sessionId = randomUUID();
    await database.db.insert(batchSessions).values({
      sessionId,
      batchId,
      subjectId,
      title: 'Kinematics live',
      type: 'LIVE',
      scheduledStartAt: new Date('2026-09-02T10:00:00.000Z'),
      scheduledEndAt: new Date('2026-09-02T11:00:00.000Z'),
    });
    return sessionId;
  }

  it('creates a lesson as each new type and reads it back as that type', async () => {
    const cases = [
      { type: 'DOCUMENT', documentFileKey: 'notes/thermo.pdf', documentPageCount: 12 },
      { type: 'AUDIO', audioUrl: 'https://cdn.test/audio.m4a', audioDuration: 600 },
      { type: 'RICH' },
    ];

    for (const [index, body] of cases.entries()) {
      const created = await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons`)
        .set(...authHeader(app, admin))
        .send({ subjectId, title: `lesson ${index}`, order: index + 1, ...body })
        .expect(201);

      expect(created.body.type).toBe(body.type);

      const read = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${created.body.lessonId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(read.body.type).toBe(body.type);
    }
  });

  it('resolves a live-session lesson to its underlying batch session', async () => {
    const sessionId = await createSession();

    const created = await request(app.getHttpServer())
      .post(`/batches/${batchId}/lessons`)
      .set(...authHeader(app, admin))
      .send({
        subjectId,
        title: 'Live class',
        type: 'LIVE_SESSION',
        order: 1,
        sessionId,
        status: 'READY',
      })
      .expect(201);

    const read = await request(app.getHttpServer())
      .get(`/batches/${batchId}/lessons/${created.body.lessonId}`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(read.body.sessionId).toBe(sessionId);
    expect(read.body.session).toMatchObject({
      sessionId,
      title: 'Kinematics live',
    });

    const sessionRows = await database.db
      .select()
      .from(batchSessions)
      .where(eq(batchSessions.batchId, batchId));
    expect(sessionRows).toHaveLength(1);
  });

  it('refuses a live-session lesson that names a session on another batch', async () => {
    const otherBatch = await createBatch(database, admin.userId);
    const otherSubject = await createSubject(database, otherBatch);
    const strayId = randomUUID();
    await database.db.insert(batchSessions).values({
      sessionId: strayId,
      batchId: otherBatch,
      subjectId: otherSubject,
      title: 'Someone else',
      type: 'LIVE',
    });

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/lessons`)
      .set(...authHeader(app, admin))
      .send({
        subjectId,
        title: 'Live class',
        type: 'LIVE_SESSION',
        order: 1,
        sessionId: strayId,
      })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/lessons`)
      .set(...authHeader(app, admin))
      .send({ subjectId, title: 'Live class', type: 'LIVE_SESSION', order: 1 })
      .expect(400);
  });

  it('leaves existing video, text and quiz lessons unaffected', async () => {
    const videoId = await createLesson(database, subjectId, {
      type: 'VIDEO',
      videoUrl: 'https://cdn.test/v.m3u8',
      duration: 1200,
      order: 1,
    });
    const textId = await createLesson(database, subjectId, {
      type: 'TEXT',
      textContent: 'Read this',
      order: 2,
    });
    const quizId = await createLesson(database, subjectId, {
      type: 'QUIZ',
      order: 3,
    });

    for (const [lessonId, type] of [
      [videoId, 'VIDEO'],
      [textId, 'TEXT'],
      [quizId, 'QUIZ'],
    ] as const) {
      const read = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${lessonId}`)
        .set(...authHeader(app, student))
        .expect(200);
      expect(read.body.type).toBe(type);
    }

    const listed = await request(app.getHttpServer())
      .get(`/batches/${batchId}/content`)
      .set(...authHeader(app, student))
      .expect(200);

    const titles = listed.body.flatMap(
      (subject: { lessons: { lessonId: string }[] }) => subject.lessons,
    );
    expect(titles).toHaveLength(3);
  });

  it('refuses a lesson type the renderer does not know at authoring', async () => {
    await request(app.getHttpServer())
      .post(`/batches/${batchId}/lessons`)
      .set(...authHeader(app, admin))
      .send({ subjectId, title: 'Hologram', type: 'HOLOGRAM', order: 1 })
      .expect(400);

    const stored = await database.db
      .select()
      .from(lessons)
      .where(eq(lessons.subjectId, subjectId));
    expect(stored).toHaveLength(0);
  });

  it('freezes the type once a student has progress against the lesson', async () => {
    const lessonId = await createLesson(database, subjectId, {
      type: 'TEXT',
      textContent: 'Read this',
      order: 1,
    });

    await request(app.getHttpServer())
      .patch(`/batches/${batchId}/lessons/${lessonId}`)
      .set(...authHeader(app, admin))
      .send({ type: 'RICH' })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/batches/${batchId}/lessons/${lessonId}/progress`)
      .set(...authHeader(app, student))
      .send({ completed: true })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/batches/${batchId}/lessons/${lessonId}`)
      .set(...authHeader(app, admin))
      .send({ type: 'DOCUMENT' })
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/batches/${batchId}/lessons/${lessonId}`)
      .set(...authHeader(app, admin))
      .send({ title: 'Renamed but same type' })
      .expect(200);
  });
});
