import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { TRANSCRIPTION_PROVIDER, TranscriptionProvider } from '../src/media/transcription-provider';
import { TRANSCRIPT_JOB } from '../src/media/transcript.service';
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
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';

const FIXED_SEGMENTS = [
  { ordinal: 1, startSeconds: 0, endSeconds: 30, body: 'The apple fell from the tree' },
  { ordinal: 2, startSeconds: 30, endSeconds: 60, body: 'Newton observed this event' },
  { ordinal: 3, startSeconds: 60, endSeconds: 90, body: 'gravity was the explanation' },
  { ordinal: 4, startSeconds: 90, endSeconds: 120, body: 'His laws changed everything' },
];

const BOUNDARY_SEGMENTS = [
  { ordinal: 1, startSeconds: 0, endSeconds: 30, body: 'The quick brown' },
  { ordinal: 2, startSeconds: 30, endSeconds: 60, body: 'fox jumps over' },
  { ordinal: 3, startSeconds: 60, endSeconds: 90, body: 'the lazy dog' },
];

describe('transcript (tickets 05 and 06)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let queue: InlineJobQueue;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;
  let otherStudent: TestActor;
  let batchId: string;
  let subjectId: string;
  let lessonId: string;

  const fakeProvider: TranscriptionProvider = {
    transcribe: jest.fn().mockResolvedValue(FIXED_SEGMENTS),
  };

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database, clock, [
      { token: TRANSCRIPTION_PROVIDER, value: fakeProvider },
    ]);
    queue = app.get<InlineJobQueue>(JOB_QUEUE);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    jest.clearAllMocks();
    (fakeProvider.transcribe as jest.Mock).mockResolvedValue(FIXED_SEGMENTS);

    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    otherStudent = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId);
    subjectId = await createSubject(database, batchId);
    lessonId = await createLesson(database, subjectId, {
      type: 'VIDEO',
      videoUrl: 'https://cdn.test/v.m3u8',
      duration: 120,
      order: 1,
      status: 'READY',
    });
    await enrol(database, batchId, student.userId);
  });

  async function requestAndProcess() {
    await request(app.getHttpServer())
      .post(`/batches/${batchId}/lessons/${lessonId}/transcript`)
      .set(...authHeader(app, admin))
      .expect(201);

    await queue.enqueue(TRANSCRIPT_JOB, undefined);
  }

  describe('Ticket 05 — Transcripts as timed segments', () => {
    it('requests transcription via a queued job, not during the HTTP request', async () => {
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${lessonId}/transcript`)
        .set(...authHeader(app, admin))
        .expect(201);

      expect(fakeProvider.transcribe).not.toHaveBeenCalled();

      await queue.enqueue(TRANSCRIPT_JOB, undefined);

      expect(fakeProvider.transcribe).toHaveBeenCalledTimes(1);
    });

    it('segments carry start/end times and read back in order', async () => {
      await requestAndProcess();

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${lessonId}/transcript`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body.available).toBe(true);
      expect(res.body.segments).toHaveLength(4);

      const segs = res.body.segments;
      expect(segs[0].startSeconds).toBe(0);
      expect(segs[0].endSeconds).toBe(30);
      expect(segs[1].startSeconds).toBe(30);
      expect(segs[2].startSeconds).toBe(60);
      expect(segs[3].startSeconds).toBe(90);

      for (let i = 1; i < segs.length; i++) {
        expect(segs[i].ordinal).toBeGreaterThan(segs[i - 1].ordinal);
      }
    });

    it('requesting transcription twice for one video does not transcribe twice', async () => {
      await requestAndProcess();

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${lessonId}/transcript`)
        .set(...authHeader(app, admin))
        .expect(409);

      await queue.enqueue(TRANSCRIPT_JOB, undefined);

      expect(fakeProvider.transcribe).toHaveBeenCalledTimes(1);
    });

    it('a failed transcription leaves the lesson playable and is retryable', async () => {
      (fakeProvider.transcribe as jest.Mock).mockRejectedValueOnce(
        new Error('provider unavailable'),
      );

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${lessonId}/transcript`)
        .set(...authHeader(app, admin))
        .expect(201);

      await queue.enqueue(TRANSCRIPT_JOB, undefined);

      const transcriptRes = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${lessonId}/transcript`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(transcriptRes.body.transcript.status).toBe('FAILED');

      const lessonRes = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${lessonId}`)
        .set(...authHeader(app, student))
        .expect(200);
      expect(lessonRes.body.lessonId).toBe(lessonId);

      const retryRes = await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${lessonId}/transcript/retry`)
        .set(...authHeader(app, admin))
        .expect(201);

      expect(retryRes.body.status).toBe('PENDING');

      await queue.enqueue(TRANSCRIPT_JOB, undefined);

      expect(fakeProvider.transcribe).toHaveBeenCalledTimes(2);

      const afterRetry = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${lessonId}/transcript`)
        .set(...authHeader(app, student))
        .expect(200);
      expect(afterRetry.body.transcript.status).toBe('READY');
    });

    it('a lesson with no transcript reports its absence rather than failing', async () => {
      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${lessonId}/transcript`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body.available).toBe(false);
      expect(res.body.transcript).toBeNull();
      expect(res.body.segments).toEqual([]);
    });
  });

  describe('Ticket 06 — Search inside a lecture', () => {
    beforeEach(async () => {
      await requestAndProcess();
    });

    it('returns matching segments with timestamps', async () => {
      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${lessonId}/transcript/search?q=Newton`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body.matches.length).toBeGreaterThan(0);
      expect(res.body.matches[0]).toHaveProperty('startSeconds');
      expect(res.body.matches[0]).toHaveProperty('endSeconds');
      expect(res.body.matches[0]).toHaveProperty('body');
    });

    it('orders matches by position in the lecture, not by relevance score', async () => {
      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${lessonId}/transcript/search?q=apple`)
        .set(...authHeader(app, student))
        .expect(200);

      const matches = res.body.matches;
      expect(matches.length).toBeGreaterThan(0);
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i].startSeconds).toBeGreaterThanOrEqual(matches[i - 1].startSeconds);
      }
    });

    it('search is case-insensitive', async () => {
      const upper = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${lessonId}/transcript/search?q=NEWTON`)
        .set(...authHeader(app, student))
        .expect(200);

      const lower = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${lessonId}/transcript/search?q=newton`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(upper.body.matches.length).toBe(lower.body.matches.length);
      expect(upper.body.matches.length).toBeGreaterThan(0);
    });

    it('matches a phrase that spans a segment boundary', async () => {
      const otherBatch = await createBatch(database, admin.userId);
      const otherSubject = await createSubject(database, otherBatch);
      const boundaryLesson = await createLesson(database, otherSubject, {
        type: 'VIDEO',
        videoUrl: 'https://cdn.test/boundary.m3u8',
        duration: 90,
        order: 1,
        status: 'READY',
      });
      await enrol(database, otherBatch, student.userId);

      (fakeProvider.transcribe as jest.Mock).mockResolvedValueOnce(BOUNDARY_SEGMENTS);

      await request(app.getHttpServer())
        .post(`/batches/${otherBatch}/lessons/${boundaryLesson}/transcript`)
        .set(...authHeader(app, admin))
        .expect(201);

      await queue.enqueue(TRANSCRIPT_JOB, undefined);

      const res = await request(app.getHttpServer())
        .get(`/batches/${otherBatch}/lessons/${boundaryLesson}/transcript/search?q=brown+fox`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body.matches.length).toBeGreaterThanOrEqual(2);
      const bodies = res.body.matches.map((m: { body: string }) => m.body);
      expect(bodies).toEqual(expect.arrayContaining([
        expect.stringContaining('quick brown'),
        expect.stringContaining('fox jumps'),
      ]));
    });

    it('returns empty rather than failing when no matches', async () => {
      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${lessonId}/transcript/search?q=zzznomatch`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body.matches).toEqual([]);
    });

    it('a student cannot search a lecture they cannot access', async () => {
      await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${lessonId}/transcript/search?q=newton`)
        .set(...authHeader(app, otherStudent))
        .expect(404);
    });
  });
});
