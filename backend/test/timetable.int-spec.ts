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

const NOW = '2026-10-15T09:00:00.000Z';

describe('batch timetable', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let student: TestActor;
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
    clock.set(NOW);
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    stranger = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);
  });

  function addSession(body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post(`/batches/${batchId}/sessions`)
      .set(...authHeader(app, admin))
      .send(body);
  }

  function liveSession(title: string, startsAt: string, endsAt: string) {
    return addSession({
      title,
      type: 'LIVE',
      liveProvider: 'ZOOM',
      joinUrl: 'https://zoom.example/abc',
      scheduledStartAt: startsAt,
      scheduledEndAt: endsAt,
    });
  }

  async function timetable(actor: TestActor) {
    const { body } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/timetable`)
      .set(...authHeader(app, actor))
      .expect(200);
    return body;
  }

  it('puts sessions, tests and deadlines on one chronological surface', async () => {
    await liveSession(
      'Thermodynamics',
      '2026-10-16T10:00:00.000Z',
      '2026-10-16T11:00:00.000Z',
    ).expect(201);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/quizzes`)
      .set(...authHeader(app, admin))
      .send({
        title: 'Weekly test',
        durationMinutes: 30,
        maxAttempts: 1,
        negativeMarkPercent: 0,
        passingPercent: 40,
        opensAt: '2026-10-17T09:00:00.000Z',
        closesAt: '2026-10-17T12:00:00.000Z',
        publish: true,
      })
      .expect(201);

    const { items } = await timetable(student);
    const kinds = items.map((i: { kind: string }) => i.kind);

    expect(kinds).toEqual(['SESSION', 'TEST']);
    expect(items[0].title).toBe('Thermodynamics');
    expect(items[1].title).toBe('Weekly test');
    expect(new Date(items[0].startsAt).getTime()).toBeLessThan(
      new Date(items[1].startsAt).getTime(),
    );
  });

  it('separates what is on today from what is coming', async () => {
    await liveSession(
      'Today at noon',
      '2026-10-15T12:00:00.000Z',
      '2026-10-15T13:00:00.000Z',
    ).expect(201);
    await liveSession(
      'Next week',
      '2026-10-22T12:00:00.000Z',
      '2026-10-22T13:00:00.000Z',
    ).expect(201);

    const { today, upcoming } = await timetable(student);

    expect(today.map((i: { title: string }) => i.title)).toEqual([
      'Today at noon',
    ]);
    expect(upcoming.map((i: { title: string }) => i.title)).toEqual([
      'Next week',
    ]);
  });

  it('tells a student which sessions they missed', async () => {
    await liveSession(
      'Missed on Monday',
      '2026-10-12T10:00:00.000Z',
      '2026-10-12T11:00:00.000Z',
    ).expect(201);

    const { missed, items } = await timetable(student);

    expect(missed.map((i: { title: string }) => i.title)).toEqual([
      'Missed on Monday',
    ]);
    const past = items.find(
      (i: { title: string }) => i.title === 'Missed on Monday',
    );
    expect(past.status).toBe('MISSED');
  });

  it('does not call a session missed when the student attended it', async () => {
    const { body: session } = await liveSession(
      'Attended',
      '2026-10-14T10:00:00.000Z',
      '2026-10-14T11:00:00.000Z',
    ).expect(201);

    clock.set('2026-10-14T10:30:00.000Z');
    await request(app.getHttpServer())
      .post(`/batches/${batchId}/sessions/${session.sessionId}/attendance`)
      .set(...authHeader(app, student))
      .send({})
      .expect(201);
    clock.set(NOW);

    const { missed, items } = await timetable(student);

    expect(missed).toEqual([]);
    expect(
      items.find((i: { title: string }) => i.title === 'Attended').status,
    ).toBe('ATTENDED');
  });

  it('plays a past session recording from the timetable itself', async () => {
    await addSession({
      title: 'Recorded last week',
      type: 'RECORDING',
      recordingVideoId: 'bunny-abc-123',
    }).expect(201);

    const { items } = await timetable(student);
    const recorded = items.find(
      (i: { title: string }) => i.title === 'Recorded last week',
    );

    expect(recorded.recordingVideoId).toBe('bunny-abc-123');
    expect(recorded).toHaveProperty('playbackUrl');
  });

  it('hands over the join link only while a live class is running', async () => {
    await liveSession(
      'In progress',
      '2026-10-15T08:30:00.000Z',
      '2026-10-15T10:00:00.000Z',
    ).expect(201);
    await liveSession(
      'Much later',
      '2026-11-30T08:30:00.000Z',
      '2026-11-30T10:00:00.000Z',
    ).expect(201);

    const { items } = await timetable(student);
    const running = items.find((i: { title: string }) => i.title === 'In progress');
    const later = items.find((i: { title: string }) => i.title === 'Much later');

    expect(running.status).toBe('LIVE_NOW');
    expect(running.joinUrl).toBe('https://zoom.example/abc');
    expect(later.joinUrl).toBeNull();
  });

  it('shows a student nothing for a batch they are not in', async () => {
    await request(app.getHttpServer())
      .get(`/batches/${batchId}/timetable`)
      .set(...authHeader(app, stranger))
      .expect(404);
  });
});
