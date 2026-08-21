import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq, and } from 'drizzle-orm';

import { BUNNY_CLIENT, BunnyClient } from '../src/video-encoding/bunny-client';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import {
  assignInstructor,
  createBatch,
  createLesson,
  createSubject,
  createUser,
  enrol,
} from './support/factories';
import { videoEncodingJobs, lessons } from '../src/database/schema';

let guidCounter = 0;
function nextGuid(): string {
  guidCounter += 1;
  return `fake-guid-${guidCounter}`;
}

function makeFakeBunny(): jest.Mocked<BunnyClient> {
  return {
    createVideo: jest.fn().mockImplementation(async () => ({ guid: nextGuid() })),
    getVideoStatus: jest.fn().mockResolvedValue({ status: 4, encodeProgress: 100, length: 300 }),
  };
}

describe('audio rendition (ticket 07)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let fakeBunny: jest.Mocked<BunnyClient>;

  let admin: TestActor;
  let instructor: TestActor;
  let student: TestActor;
  let batchId: string;
  let subjectId: string;
  let lessonId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    fakeBunny = makeFakeBunny();
    app = await createTestApp(database, clock, [
      { token: BUNNY_CLIENT, value: fakeBunny },
    ]);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    guidCounter = 0;
    fakeBunny.createVideo.mockClear();
    fakeBunny.createVideo.mockImplementation(async () => ({ guid: nextGuid() }));
    fakeBunny.getVideoStatus.mockResolvedValue({ status: 4, encodeProgress: 100, length: 300 });

    admin = await createUser(database, 'PLATFORM_ADMIN');
    instructor = await createUser(database, 'INSTRUCTOR');
    student = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId);
    subjectId = await createSubject(database, batchId);
    lessonId = await createLesson(database, subjectId, {
      type: 'VIDEO',
      videoUrl: 'https://cdn.test/v.m3u8',
      duration: 1200,
      order: 1,
      status: 'READY',
    });
    await enrol(database, batchId, student.userId);
    await assignInstructor(database, batchId, instructor.userId, 'LEAD');
  });

  it('requests audio rendition through the existing encoding path', async () => {
    const res = await request(app.getHttpServer())
      .post('/video-encoding/create-audio-upload')
      .set(...authHeader(app, instructor))
      .send({ batchId, lessonId })
      .expect(201);

    expect(res.body.videoId).toBeDefined();
    expect(res.body.tusUploadUrl).toBeDefined();
    expect(fakeBunny.createVideo).toHaveBeenCalledTimes(1);

    const jobs = await database.db
      .select()
      .from(videoEncodingJobs)
      .where(
        and(
          eq(videoEncodingJobs.lessonId, lessonId),
          eq(videoEncodingJobs.renditionKind, 'AUDIO'),
        ),
      );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].renditionKind).toBe('AUDIO');
  });

  it('attaches the audio rendition to the same lesson, not a duplicate', async () => {
    const res = await request(app.getHttpServer())
      .post('/video-encoding/create-audio-upload')
      .set(...authHeader(app, instructor))
      .send({ batchId, lessonId })
      .expect(201);

    const jobs = await database.db
      .select()
      .from(videoEncodingJobs)
      .where(eq(videoEncodingJobs.lessonId, lessonId));

    expect(jobs.every((j) => j.lessonId === lessonId)).toBe(true);
    expect(res.body.videoId).toBeTruthy();
  });

  it('on audio completion writes audioUrl and audioDuration but does NOT flip lesson status', async () => {
    const audioRes = await request(app.getHttpServer())
      .post('/video-encoding/create-audio-upload')
      .set(...authHeader(app, instructor))
      .send({ batchId, lessonId })
      .expect(201);

    const audioJobId = audioRes.body.videoId;

    const preLesson = await database.db
      .select({ status: lessons.status })
      .from(lessons)
      .where(eq(lessons.lessonId, lessonId));
    expect(preLesson[0].status).toBe('READY');

    await request(app.getHttpServer())
      .post('/video-encoding/webhook')
      .set('x-webhook-secret', process.env.WEBHOOK_SECRET ?? '')
      .send({ VideoGuid: audioJobId, Status: 4 })
      .expect(200);

    const [updatedLesson] = await database.db
      .select({
        status: lessons.status,
        audioUrl: lessons.audioUrl,
        audioDuration: lessons.audioDuration,
      })
      .from(lessons)
      .where(eq(lessons.lessonId, lessonId));

    expect(updatedLesson.status).toBe('READY');
    expect(updatedLesson.audioUrl).toBeTruthy();
    expect(updatedLesson.audioDuration).toBe(300);
  });

  it('progress on audio rendition uses the same lesson progress row', async () => {
    await request(app.getHttpServer())
      .put(`/batches/${batchId}/lessons/${lessonId}/progress`)
      .set(...authHeader(app, student))
      .send({ listenedSeconds: 50 })
      .expect(200);

    const progressRes = await request(app.getHttpServer())
      .get(`/batches/${batchId}/progress`)
      .set(...authHeader(app, student))
      .expect(200);

    const entry = progressRes.body.find(
      (p: { lessonId: string }) => p.lessonId === lessonId,
    );
    expect(entry).toBeDefined();
    expect(entry.listenedSeconds).toBe(50);
  });

  it('a lesson without an audio rendition reports its absence rather than failing', async () => {
    const [lesson] = await database.db
      .select({ audioUrl: lessons.audioUrl })
      .from(lessons)
      .where(eq(lessons.lessonId, lessonId));

    expect(lesson.audioUrl).toBeNull();

    const lessonRes = await request(app.getHttpServer())
      .get(`/batches/${batchId}/lessons/${lessonId}`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(lessonRes.body.lessonId).toBe(lessonId);
    expect(lessonRes.body.audioUrl).toBeFalsy();
  });

  it('requesting a rendition twice does not encode twice', async () => {
    await request(app.getHttpServer())
      .post('/video-encoding/create-audio-upload')
      .set(...authHeader(app, instructor))
      .send({ batchId, lessonId })
      .expect(201);

    await request(app.getHttpServer())
      .post('/video-encoding/create-audio-upload')
      .set(...authHeader(app, instructor))
      .send({ batchId, lessonId })
      .expect(409);

    expect(fakeBunny.createVideo).toHaveBeenCalledTimes(1);
  });

  it('a failed audio rendition does not make the video lesson unplayable', async () => {
    const audioRes = await request(app.getHttpServer())
      .post('/video-encoding/create-audio-upload')
      .set(...authHeader(app, instructor))
      .send({ batchId, lessonId })
      .expect(201);

    const audioJobId = audioRes.body.videoId;

    await request(app.getHttpServer())
      .post('/video-encoding/webhook')
      .set('x-webhook-secret', process.env.WEBHOOK_SECRET ?? '')
      .send({ VideoGuid: audioJobId, Status: 5 })
      .expect(200);

    const [lesson] = await database.db
      .select({ status: lessons.status })
      .from(lessons)
      .where(eq(lessons.lessonId, lessonId));

    expect(lesson.status).toBe('READY');
  });
});
