import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { randomUUID } from 'crypto';

import {
  assessmentTests,
  batchResources,
  videoEncodingJobs,
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

describe('free preview lessons', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let outsider: TestActor;
  let batchId: string;
  let subjectId: string;
  let previewId: string;
  let paidId: string;

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
    outsider = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId);
    subjectId = await createSubject(database, batchId);
    previewId = await createLesson(database, subjectId, {
      type: 'VIDEO',
      duration: 600,
      isFreePreview: true,
      status: 'READY',
      order: 1,
    });
    paidId = await createLesson(database, subjectId, {
      type: 'VIDEO',
      duration: 600,
      isFreePreview: false,
      status: 'READY',
      order: 2,
    });
  });

  function anonymousLesson(lessonId: string) {
    return request(app.getHttpServer()).get(
      `/batches/${batchId}/lessons/${lessonId}`,
    );
  }

  it('is reachable without enrolment and without signing in', async () => {
    const anonymous = await anonymousLesson(previewId).expect(200);
    expect(anonymous.body.lessonId).toBe(previewId);

    const signedInButNotEnrolled = await request(app.getHttpServer())
      .get(`/batches/${batchId}/lessons/${previewId}`)
      .set(...authHeader(app, outsider))
      .expect(200);
    expect(signedInButNotEnrolled.body.lessonId).toBe(previewId);
  });

  it('opens nothing adjacent to it', async () => {
    await anonymousLesson(previewId).expect(200);

    await anonymousLesson(paidId).expect(404);
    await request(app.getHttpServer())
      .get(`/batches/${batchId}/lessons/${paidId}`)
      .set(...authHeader(app, outsider))
      .expect(404);

    await database.db.insert(batchResources).values({
      resourceId: randomUUID(),
      batchId,
      subjectId,
      title: 'Paid notes',
      type: 'NOTES',
      fileKey: 'notes/paid.pdf',
      uploadedBy: admin.userId,
    });

    await request(app.getHttpServer())
      .get(`/batches/${batchId}/resources`)
      .set(...authHeader(app, outsider))
      .expect(404);
    await request(app.getHttpServer())
      .get(`/batches/${batchId}/resources/library`)
      .set(...authHeader(app, outsider))
      .expect(404);

    const testId = randomUUID();
    await database.db.insert(assessmentTests).values({
      testId,
      batchId,
      title: 'Paid test',
      durationMinutes: 30,
      createdBy: admin.userId,
      publishedAt: new Date('2026-09-01T00:00:00.000Z'),
    });

    await request(app.getHttpServer())
      .get(`/batches/${batchId}/content`)
      .set(...authHeader(app, outsider))
      .expect(404);
    await request(app.getHttpServer())
      .get(`/batches/${batchId}/curriculum/full`)
      .set(...authHeader(app, outsider))
      .expect(404);
    await request(app.getHttpServer())
      .get(`/batches/${batchId}/progress`)
      .set(...authHeader(app, outsider))
      .expect(404);
  });

  it('cannot be used to write progress without enrolment', async () => {
    await request(app.getHttpServer())
      .put(`/batches/${batchId}/lessons/${previewId}/progress`)
      .set(...authHeader(app, outsider))
      .send({ watchedSeconds: 600 })
      .expect(404);

    await request(app.getHttpServer())
      .put(`/batches/${batchId}/positions`)
      .set(...authHeader(app, outsider))
      .send({
        positions: [
          {
            lessonId: previewId,
            positionSeconds: 30,
            recordedAt: '2026-09-01T10:00:00.000Z',
          },
        ],
      })
      .expect(404);
  });

  it('closes access the moment the flag is removed', async () => {
    await anonymousLesson(previewId).expect(200);

    await request(app.getHttpServer())
      .patch(`/batches/${batchId}/lessons/${previewId}`)
      .set(...authHeader(app, admin))
      .send({ isFreePreview: false })
      .expect(200);

    await anonymousLesson(previewId).expect(404);
    await request(app.getHttpServer())
      .get(`/batches/${batchId}/lessons/${previewId}`)
      .set(...authHeader(app, outsider))
      .expect(404);
  });

  it('does not expose an unpublished lesson merely because it is flagged', async () => {
    const draft = await createLesson(database, subjectId, {
      type: 'VIDEO',
      duration: 600,
      isFreePreview: true,
      status: 'DRAFT',
      order: 3,
    });

    await anonymousLesson(draft).expect(404);
  });

  it('delivers preview video by signed url rather than proxying it', async () => {
    await database.db.insert(videoEncodingJobs).values({
      jobId: 'bunny-video-guid',
      lessonId: previewId,
      batchId,
      renditionKind: 'VIDEO',
      status: 'COMPLETED',
      inputPath: 'tus://bunny-video-guid',
      outputPath: 'bunny-video-guid',
    });

    const anonymous = await anonymousLesson(previewId).expect(200);

    expect(typeof anonymous.body.playbackUrl).toBe('string');
    expect(anonymous.body.playbackUrl).toContain('bunny-video-guid');
    expect(anonymous.body.playbackUrl).toMatch(/^https:\/\/iframe\.mediadelivery\.net\//);
    expect(anonymous.body.playbackUrl).not.toContain(
      `/batches/${batchId}/lessons/${previewId}`,
    );
  });

  it('still admits an enrolled student to everything', async () => {
    const student = await createUser(database, 'LEARNER');
    await enrol(database, batchId, student.userId);

    await request(app.getHttpServer())
      .get(`/batches/${batchId}/lessons/${paidId}`)
      .set(...authHeader(app, student))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/batches/${batchId}/curriculum/full`)
      .set(...authHeader(app, student))
      .expect(200);
  });
});
