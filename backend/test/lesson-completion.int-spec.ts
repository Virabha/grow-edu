import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { randomUUID } from 'crypto';

import {
  batchAttendance,
  batchQuizAttempts,
  batchQuizzes,
  batchSessions,
} from '../src/database/schema';
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

describe('per-type lesson completion', () => {
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

  function recordProgress(lessonId: string, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .put(`/batches/${batchId}/lessons/${lessonId}/progress`)
      .set(...authHeader(app, student))
      .send(body);
  }

  async function setThreshold(key: string, value: number): Promise<void> {
    await request(app.getHttpServer())
      .put('/settings/completion')
      .set(...authHeader(app, admin))
      .send({ [key]: value })
      .expect(200);
  }

  it('does not complete a video below the watched threshold and does at it', async () => {
    const lessonId = await createLesson(database, subjectId, {
      type: 'VIDEO',
      duration: 1000,
      order: 1,
    });

    const below = await recordProgress(lessonId, { watchedSeconds: 500 }).expect(200);
    expect(below.body.completed).toBe(false);

    const at = await recordProgress(lessonId, { watchedSeconds: 900 }).expect(200);
    expect(at.body.completed).toBe(true);
  });

  it('refuses to let a client assert completion on a measurable video', async () => {
    const lessonId = await createLesson(database, subjectId, {
      type: 'VIDEO',
      duration: 1000,
      order: 1,
    });

    const claimed = await recordProgress(lessonId, {
      completed: true,
      watchedSeconds: 10,
    }).expect(200);

    expect(claimed.body.completed).toBe(false);
  });

  it('completes each type by its own rule and not by another type rule', async () => {
    const documentId = await createLesson(database, subjectId, {
      type: 'DOCUMENT',
      documentFileKey: 'notes/a.pdf',
      documentPageCount: 10,
      order: 1,
    });
    const audioId = await createLesson(database, subjectId, {
      type: 'AUDIO',
      audioUrl: 'https://cdn.test/a.m4a',
      audioDuration: 100,
      order: 2,
    });

    const documentByWatching = await recordProgress(documentId, {
      watchedSeconds: 100000,
    }).expect(200);
    expect(documentByWatching.body.completed).toBe(false);

    const documentByPages = await recordProgress(documentId, {
      pagesViewed: 8,
    }).expect(200);
    expect(documentByPages.body.completed).toBe(true);

    const audioByPages = await recordProgress(audioId, { pagesViewed: 500 }).expect(200);
    expect(audioByPages.body.completed).toBe(false);

    const audioByListening = await recordProgress(audioId, {
      listenedSeconds: 90,
    }).expect(200);
    expect(audioByListening.body.completed).toBe(true);
  });

  it('completes a quiz at submission rather than by opening it', async () => {
    const quizId = randomUUID();
    await database.db.insert(batchQuizzes).values({
      quizId,
      batchId,
      subjectId,
      title: 'Unit test',
      createdBy: admin.userId,
    });
    const lessonId = await createLesson(database, subjectId, {
      type: 'QUIZ',
      quizId,
      order: 1,
    });

    const opened = await recordProgress(lessonId, { completed: true, timeSpent: 60 }).expect(200);
    expect(opened.body.completed).toBe(false);

    await database.db.insert(batchQuizAttempts).values({
      quizId,
      userId: student.userId,
      status: 'SUBMITTED',
      expiresAt: new Date('2026-09-02T00:00:00.000Z'),
      submittedAt: new Date('2026-09-01T00:00:00.000Z'),
    });

    const submitted = await recordProgress(lessonId, {}).expect(200);
    expect(submitted.body.completed).toBe(true);
  });

  it('completes a live session on recorded attendance, not on opening the lesson', async () => {
    const sessionId = randomUUID();
    await database.db.insert(batchSessions).values({
      sessionId,
      batchId,
      subjectId,
      title: 'Live',
      type: 'LIVE',
    });
    const lessonId = await createLesson(database, subjectId, {
      type: 'LIVE_SESSION',
      sessionId,
      order: 1,
    });

    const opened = await recordProgress(lessonId, {
      completed: true,
      timeSpent: 4000,
    }).expect(200);
    expect(opened.body.completed).toBe(false);

    await database.db.insert(batchAttendance).values({
      batchId,
      sessionId,
      userId: student.userId,
      durationSeconds: 3600,
    });

    const attended = await recordProgress(lessonId, {}).expect(200);
    expect(attended.body.completed).toBe(true);
  });

  it('aggregates batch progress across mixed types', async () => {
    const videoId = await createLesson(database, subjectId, {
      type: 'VIDEO',
      duration: 100,
      order: 1,
    });
    const documentId = await createLesson(database, subjectId, {
      type: 'DOCUMENT',
      documentFileKey: 'notes/b.pdf',
      documentPageCount: 10,
      order: 2,
    });
    await createLesson(database, subjectId, {
      type: 'TEXT',
      textContent: 'Read',
      order: 3,
    });

    await recordProgress(videoId, { watchedSeconds: 95 }).expect(200);
    await recordProgress(documentId, { pagesViewed: 2 }).expect(200);

    const progress = await request(app.getHttpServer())
      .get(`/batches/${batchId}/my-progress`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(progress.body.lessons).toMatchObject({ total: 3, completed: 1 });

    await recordProgress(documentId, { pagesViewed: 9 }).expect(200);

    const after = await request(app.getHttpServer())
      .get(`/batches/${batchId}/my-progress`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(after.body.lessons).toMatchObject({ total: 3, completed: 2 });
  });

  it('takes its thresholds from owner-managed configuration', async () => {
    const lessonId = await createLesson(database, subjectId, {
      type: 'VIDEO',
      duration: 1000,
      order: 1,
    });

    const belowDefault = await recordProgress(lessonId, { watchedSeconds: 500 }).expect(200);
    expect(belowDefault.body.completed).toBe(false);

    await setThreshold('videoWatchedPercent', 40);

    const reconciled = await request(app.getHttpServer())
      .post(`/batches/${batchId}/lessons/${lessonId}/progress/reconcile`)
      .set(...authHeader(app, student))
      .expect(201);

    expect(reconciled.body.completed).toBe(true);
  });
});
