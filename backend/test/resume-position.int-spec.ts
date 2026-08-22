import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { createTestApp, authHeader, tokenFor, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import {
  createBatch,
  createLesson,
  createSubject,
  createUser,
  enrol,
} from './support/factories';

describe('video resume position', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;
  let batchId: string;
  let subjectId: string;
  let lessonId: string;

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
    lessonId = await createLesson(database, subjectId, {
      type: 'VIDEO',
      duration: 3600,
      order: 1,
    });
  });

  function postPositions(
    positions: Record<string, unknown>[],
    headers: [string, string],
  ) {
    return request(app.getHttpServer())
      .put(`/batches/${batchId}/positions`)
      .set(...headers)
      .send({ positions });
  }

  function readPosition(headers: [string, string]) {
    return request(app.getHttpServer())
      .get(`/batches/${batchId}/lessons/${lessonId}/position`)
      .set(...headers);
  }

  it('returns a position saved on one device when the lesson is opened on another', async () => {
    const laptop: [string, string] = [
      'Authorization',
      `Bearer ${tokenFor(app, student, { deviceId: 'laptop' })}`,
    ];
    const phone: [string, string] = [
      'Authorization',
      `Bearer ${tokenFor(app, student, { deviceId: 'phone' })}`,
    ];

    await postPositions(
      [
        {
          lessonId,
          positionSeconds: 640,
          recordedAt: '2026-09-01T10:00:00.000Z',
        },
      ],
      laptop,
    ).expect(200);

    const onPhone = await readPosition(phone).expect(200);
    expect(onPhone.body.positionSeconds).toBe(640);
  });

  it('does not move the position backwards on an out-of-order update', async () => {
    await postPositions(
      [
        {
          lessonId,
          positionSeconds: 900,
          recordedAt: '2026-09-01T10:05:00.000Z',
        },
      ],
      authHeader(app, student),
    ).expect(200);

    await postPositions(
      [
        {
          lessonId,
          positionSeconds: 120,
          recordedAt: '2026-09-01T10:01:00.000Z',
        },
      ],
      authHeader(app, student),
    ).expect(200);

    const held = await readPosition(authHeader(app, student)).expect(200);
    expect(held.body.positionSeconds).toBe(900);

    await postPositions(
      [
        {
          lessonId,
          positionSeconds: 200,
          recordedAt: '2026-09-01T10:09:00.000Z',
        },
      ],
      authHeader(app, student),
    ).expect(200);

    const seekedBack = await readPosition(authHeader(app, student)).expect(200);
    expect(seekedBack.body.positionSeconds).toBe(200);
  });

  it('applies a batch of positions submitted in one request', async () => {
    const second = await createLesson(database, subjectId, {
      type: 'VIDEO',
      duration: 1800,
      order: 2,
    });

    const response = await postPositions(
      [
        { lessonId, positionSeconds: 100, recordedAt: '2026-09-01T10:00:00.000Z' },
        { lessonId, positionSeconds: 300, recordedAt: '2026-09-01T10:02:00.000Z' },
        { lessonId, positionSeconds: 200, recordedAt: '2026-09-01T10:01:00.000Z' },
        {
          lessonId: second,
          positionSeconds: 45,
          recordedAt: '2026-09-01T10:03:00.000Z',
        },
      ],
      authHeader(app, student),
    ).expect(200);

    expect(response.body.applied).toBe(2);

    const first = await readPosition(authHeader(app, student)).expect(200);
    expect(first.body.positionSeconds).toBe(300);

    const other = await request(app.getHttpServer())
      .get(`/batches/${batchId}/lessons/${second}/position`)
      .set(...authHeader(app, student))
      .expect(200);
    expect(other.body.positionSeconds).toBe(45);
  });

  it('returns the start for a lesson never watched rather than an error', async () => {
    const fresh = await readPosition(authHeader(app, student)).expect(200);
    expect(fresh.body).toMatchObject({
      lessonId,
      positionSeconds: 0,
      recordedAt: null,
    });
  });

  it('clamps a position beyond the lesson duration rather than storing it', async () => {
    await postPositions(
      [
        {
          lessonId,
          positionSeconds: 99999,
          recordedAt: '2026-09-01T10:00:00.000Z',
        },
      ],
      authHeader(app, student),
    ).expect(200);

    const clamped = await readPosition(authHeader(app, student)).expect(200);
    expect(clamped.body.positionSeconds).toBe(3600);
  });

  it('keeps position server-held so another student cannot see it', async () => {
    const other = await createUser(database, 'LEARNER');
    await enrol(database, batchId, other.userId);

    await postPositions(
      [
        {
          lessonId,
          positionSeconds: 500,
          recordedAt: '2026-09-01T10:00:00.000Z',
        },
      ],
      authHeader(app, student),
    ).expect(200);

    const theirs = await readPosition(authHeader(app, other)).expect(200);
    expect(theirs.body.positionSeconds).toBe(0);
  });
});
