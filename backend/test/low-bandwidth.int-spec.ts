import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';

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
import { lessons } from '../src/database/schema';

describe('low-bandwidth mode (ticket 36)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;
  let otherStudent: TestActor;
  let batchId: string;
  let subjectId: string;
  let lessonId: string;
  let audioLessonId: string;

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
    otherStudent = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId);
    subjectId = await createSubject(database, batchId);

    lessonId = await createLesson(database, subjectId, {
      type: 'VIDEO',
      videoUrl: 'https://cdn.test/video.m3u8',
      duration: 1200,
      order: 1,
      status: 'READY',
    });

    audioLessonId = await createLesson(database, subjectId, {
      type: 'VIDEO',
      videoUrl: 'https://cdn.test/video2.m3u8',
      audioUrl: 'https://cdn.test/audio.m4a',
      audioDuration: 600,
      duration: 1200,
      order: 2,
      status: 'READY',
    });

    await enrol(database, batchId, student.userId);
  });

  describe('setting storage', () => {
    it('is stored per user and readable by the client', async () => {
      const getRes = await request(app.getHttpServer())
        .get('/me/low-bandwidth')
        .set(...authHeader(app, student))
        .expect(200);

      expect(getRes.body.lowBandwidth).toBe(false);

      await request(app.getHttpServer())
        .put('/me/low-bandwidth')
        .set(...authHeader(app, student))
        .send({ lowBandwidth: true })
        .expect(200);

      const afterRes = await request(app.getHttpServer())
        .get('/me/low-bandwidth')
        .set(...authHeader(app, student))
        .expect(200);

      expect(afterRes.body.lowBandwidth).toBe(true);
    });

    it('does not leak between users', async () => {
      await request(app.getHttpServer())
        .put('/me/low-bandwidth')
        .set(...authHeader(app, student))
        .send({ lowBandwidth: true })
        .expect(200);

      await enrol(database, batchId, otherStudent.userId);

      const otherRes = await request(app.getHttpServer())
        .get('/me/low-bandwidth')
        .set(...authHeader(app, otherStudent))
        .expect(200);

      expect(otherRes.body.lowBandwidth).toBe(false);
    });
  });

  describe('lesson playback payload', () => {
    it('with low-bandwidth on, prefers audio when present', async () => {
      await request(app.getHttpServer())
        .put('/me/low-bandwidth')
        .set(...authHeader(app, student))
        .send({ lowBandwidth: true })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${audioLessonId}/playback`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body.preferredKind).toBe('AUDIO');
      expect(res.body.preferredUrl).toBe('https://cdn.test/audio.m4a');
      expect(res.body.lowBandwidth).toBe(true);
    });

    it('with low-bandwidth on but no audio, still returns video without failing', async () => {
      await request(app.getHttpServer())
        .put('/me/low-bandwidth')
        .set(...authHeader(app, student))
        .send({ lowBandwidth: true })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${lessonId}/playback`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body.preferredKind).toBe('VIDEO');
      expect(res.body.preferredUrl).toBe('https://cdn.test/video.m3u8');
      expect(res.body.lowBandwidth).toBe(true);
      expect(res.body.imageSuppressThresholdKb).toBeDefined();
    });

    it('nothing infers the setting from connection speed', async () => {
      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${audioLessonId}/playback`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body.preferredKind).toBe('VIDEO');
    });

    it('turning off low-bandwidth restores the normal payload', async () => {
      await request(app.getHttpServer())
        .put('/me/low-bandwidth')
        .set(...authHeader(app, student))
        .send({ lowBandwidth: true })
        .expect(200);

      const withLow = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${audioLessonId}/playback`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(withLow.body.preferredKind).toBe('AUDIO');

      await request(app.getHttpServer())
        .put('/me/low-bandwidth')
        .set(...authHeader(app, student))
        .send({ lowBandwidth: false })
        .expect(200);

      const withNormal = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${audioLessonId}/playback`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(withNormal.body.preferredKind).toBe('VIDEO');
    });

    it('the image threshold comes from owner-managed configuration', async () => {
      await request(app.getHttpServer())
        .put('/me/low-bandwidth')
        .set(...authHeader(app, student))
        .send({ lowBandwidth: true })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${lessonId}/playback`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(typeof res.body.imageSuppressThresholdKb).toBe('number');
      expect(res.body.imageSuppressThresholdKb).toBeGreaterThan(0);
    });
  });
});
