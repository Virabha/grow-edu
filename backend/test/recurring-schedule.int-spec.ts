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
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';

const NOW = '2026-09-01T09:00:00.000Z';

describe('recurring schedule (07 + 08)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let queue: InlineJobQueue;
  let admin: TestActor;
  let student: TestActor;
  let stranger: TestActor;
  let batchId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database, clock);
    queue = app.get<InlineJobQueue>(JOB_QUEUE);
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

  function createSeries(overrides: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post(`/batches/${batchId}/recurrence`)
      .set(...authHeader(app, admin))
      .send({
        title: 'Physics lecture',
        liveProvider: 'ZOOM',
        joinUrl: 'https://zoom.example/test',
        daysOfWeek: [1],
        startTimeUtc: '12:30',
        durationMinutes: 90,
        windowStartAt: '2026-09-07T00:00:00.000Z',
        lookAheadDays: 14,
        ...overrides,
      });
  }

  function createManualSession(overrides: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post(`/batches/${batchId}/sessions`)
      .set(...authHeader(app, admin))
      .send({
        title: 'Manual live class',
        type: 'LIVE',
        liveProvider: 'ZOOM',
        joinUrl: 'https://zoom.example/manual',
        scheduledStartAt: '2026-09-10T12:30:00.000Z',
        scheduledEndAt: '2026-09-10T14:00:00.000Z',
        ...overrides,
      });
  }

  async function listSessions() {
    const { body } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/sessions`)
      .set(...authHeader(app, admin))
      .expect(200);
    return body as Array<{ sessionId: string; title: string; seriesId: string | null; scheduledStartAt: string; status: string }>;
  }

  async function getTimetable(actor: TestActor) {
    const { body } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/timetable`)
      .set(...authHeader(app, actor))
      .expect(200);
    return body as { items: Array<{ id: string; title: string; startsAt: string; status: string }> };
  }

  async function unreadCount(actor: TestActor): Promise<number> {
    const { body } = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(...authHeader(app, actor))
      .expect(200);
    return (body as { count: number }).count;
  }

  async function auditEntries(action: string) {
    const { body } = await request(app.getHttpServer())
      .get(`/audit-log?action=${action}`)
      .set(...authHeader(app, admin))
      .expect(200);
    return body as Array<{ action: string; targetId: string }>;
  }

  describe('ticket 07 — recurring schedule generates sessions', () => {
    it('creates sessions immediately without creating them one by one', async () => {
      await createSeries().expect(201);

      const sessions = await listSessions();
      const seriesSessions = sessions.filter((s) => s.seriesId !== null);

      expect(seriesSessions.length).toBeGreaterThan(0);
      expect(seriesSessions[0].title).toBe('Physics lecture');
    });

    it('generated sessions appear on the student timetable', async () => {
      await createSeries().expect(201);

      const { items } = await getTimetable(student);
      const fromSeries = items.filter((i) => i.title === 'Physics lecture');
      expect(fromSeries.length).toBeGreaterThan(0);
    });

    it('sessions are materialised ahead of time — GET sessions returns them, not computed on read', async () => {
      await createSeries().expect(201);

      const sessions = await listSessions();
      const seriesSessions = sessions.filter((s) => s.seriesId !== null);

      const mon7 = seriesSessions.find((s) =>
        s.scheduledStartAt.startsWith('2026-09-07'),
      );
      const mon14 = seriesSessions.find((s) =>
        s.scheduledStartAt.startsWith('2026-09-14'),
      );

      expect(mon7).toBeDefined();
      expect(mon14).toBeDefined();
    });

    it('only generates sessions within the look-ahead window', async () => {
      await createSeries({ lookAheadDays: 7 }).expect(201);

      const sessions = await listSessions();
      const seriesSessions = sessions.filter((s) => s.seriesId !== null);

      const mon7 = seriesSessions.find((s) =>
        s.scheduledStartAt.startsWith('2026-09-07'),
      );
      const mon14 = seriesSessions.find((s) =>
        s.scheduledStartAt.startsWith('2026-09-14'),
      );

      expect(mon7).toBeDefined();
      expect(mon14).toBeUndefined();
    });

    it('advancing the clock and ticking generates the next window of sessions', async () => {
      await createSeries({ lookAheadDays: 7 }).expect(201);

      const sessionsBefore = await listSessions();
      const before14 = sessionsBefore.find((s) =>
        s.scheduledStartAt.startsWith('2026-09-14'),
      );
      expect(before14).toBeUndefined();

      clock.set('2026-09-08T09:00:00.000Z');
      clock.advance(REPEAT_INTERVAL_MS + 1);
      await queue.tick();

      const sessionsAfter = await listSessions();
      const after14 = sessionsAfter.find((s) =>
        s.scheduledStartAt.startsWith('2026-09-14'),
      );
      expect(after14).toBeDefined();
    });

    it('editing a generated session does not detach it from the series', async () => {
      await createSeries().expect(201);

      const sessions = await listSessions();
      const first = sessions.find((s) => s.seriesId !== null);
      expect(first).toBeDefined();

      await request(app.getHttpServer())
        .patch(`/batches/${batchId}/sessions/${first!.sessionId}`)
        .set(...authHeader(app, admin))
        .send({ title: 'Edited Physics lecture' })
        .expect(200);

      const updated = await listSessions();
      const editedSession = updated.find((s) => s.sessionId === first!.sessionId);
      expect(editedSession).toBeDefined();
      expect(editedSession!.seriesId).not.toBeNull();
    });

    it('an edit to a generated session survives the next regeneration', async () => {
      await createSeries({ lookAheadDays: 7 }).expect(201);

      const sessions = await listSessions();
      const first = sessions.find((s) => s.seriesId !== null);
      expect(first).toBeDefined();

      await request(app.getHttpServer())
        .patch(`/batches/${batchId}/sessions/${first!.sessionId}`)
        .set(...authHeader(app, admin))
        .send({ title: 'Edited Physics lecture' })
        .expect(200);

      clock.advance(REPEAT_INTERVAL_MS + 1);
      await queue.tick();

      const afterRegen = await listSessions();
      const stillEdited = afterRegen.find(
        (s) => s.sessionId === first!.sessionId,
      );
      expect(stillEdited).toBeDefined();
      expect(stillEdited!.title).toBe('Edited Physics lecture');
    });

    it('lists recurrence series for a batch', async () => {
      await createSeries().expect(201);

      const { body } = await request(app.getHttpServer())
        .get(`/batches/${batchId}/recurrence`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect((body as Array<{ batchId: string }>).length).toBe(1);
      expect((body as Array<{ batchId: string }>)[0].batchId).toBe(batchId);
    });

    it('deleting a series soft-deletes its future sessions', async () => {
      const { body: series } = await createSeries().expect(201);

      const sessionsBefore = await listSessions();
      const countBefore = sessionsBefore.filter((s) => s.seriesId !== null).length;
      expect(countBefore).toBeGreaterThan(0);

      await request(app.getHttpServer())
        .delete(`/batches/${batchId}/recurrence/${series.seriesId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      const sessionsAfter = await listSessions();
      const countAfter = sessionsAfter.filter((s) => s.seriesId !== null).length;
      expect(countAfter).toBe(0);
    });
  });

  describe('ticket 08 — reschedule and cancel notify students', () => {
    it('rescheduling a session notifies every enrolled student exactly once', async () => {
      const { body: session } = await createManualSession().expect(201);

      const countBefore = await unreadCount(student);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${session.sessionId}/reschedule`)
        .set(...authHeader(app, admin))
        .send({
          scheduledStartAt: '2026-09-10T14:00:00.000Z',
          scheduledEndAt: '2026-09-10T15:30:00.000Z',
        })
        .expect(201);

      const countAfter = await unreadCount(student);
      expect(countAfter - countBefore).toBe(1);
    });

    it('rescheduling the same session twice sends exactly one notification per reschedule', async () => {
      const { body: session } = await createManualSession().expect(201);

      const countBefore = await unreadCount(student);

      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .post(`/batches/${batchId}/sessions/${session.sessionId}/reschedule`)
          .set(...authHeader(app, admin))
          .send({
            scheduledStartAt: `2026-09-1${i}T14:00:00.000Z`,
            scheduledEndAt: `2026-09-1${i}T15:30:00.000Z`,
          })
          .expect(201);
      }

      const countAfter = await unreadCount(student);
      expect(countAfter - countBefore).toBe(2);
    });

    it('the timetable reflects the new time after a reschedule', async () => {
      const { body: session } = await createManualSession().expect(201);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${session.sessionId}/reschedule`)
        .set(...authHeader(app, admin))
        .send({
          scheduledStartAt: '2026-09-10T14:00:00.000Z',
          scheduledEndAt: '2026-09-10T15:30:00.000Z',
        })
        .expect(201);

      const { items } = await getTimetable(student);
      const rescheduled = items.find((i) => i.id === session.sessionId);
      expect(rescheduled).toBeDefined();
      expect(rescheduled!.startsAt).toBe('2026-09-10T14:00:00.000Z');
    });

    it('rescheduling one occurrence in a series does not change the rest', async () => {
      await createSeries({ lookAheadDays: 14 }).expect(201);

      const sessions = await listSessions();
      const seriesSessions = sessions
        .filter((s) => s.seriesId !== null)
        .sort((a, b) => a.scheduledStartAt.localeCompare(b.scheduledStartAt));

      expect(seriesSessions.length).toBeGreaterThanOrEqual(2);

      const first = seriesSessions[0];
      const second = seriesSessions[1];
      const secondOriginalStart = second.scheduledStartAt;

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${first.sessionId}/reschedule`)
        .set(...authHeader(app, admin))
        .send({
          scheduledStartAt: '2026-09-07T15:00:00.000Z',
          scheduledEndAt: '2026-09-07T16:30:00.000Z',
        })
        .expect(201);

      const afterSessions = await listSessions();
      const secondAfter = afterSessions.find(
        (s) => s.sessionId === second.sessionId,
      );
      expect(secondAfter).toBeDefined();
      expect(secondAfter!.scheduledStartAt).toBe(secondOriginalStart);
    });

    it('cancelling a session notifies every enrolled student exactly once', async () => {
      const { body: session } = await createManualSession().expect(201);

      const countBefore = await unreadCount(student);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${session.sessionId}/cancel`)
        .set(...authHeader(app, admin))
        .send({})
        .expect(201);

      const countAfter = await unreadCount(student);
      expect(countAfter - countBefore).toBe(1);
    });

    it('the timetable no longer shows a cancelled session', async () => {
      const { body: session } = await createManualSession().expect(201);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${session.sessionId}/cancel`)
        .set(...authHeader(app, admin))
        .send({})
        .expect(201);

      const { items } = await getTimetable(student);
      const cancelled = items.find((i) => i.id === session.sessionId);
      expect(cancelled).toBeUndefined();
    });

    it('strangers cannot access reschedule or cancel endpoints', async () => {
      const { body: session } = await createManualSession().expect(201);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${session.sessionId}/reschedule`)
        .set(...authHeader(app, stranger))
        .send({
          scheduledStartAt: '2026-09-10T14:00:00.000Z',
          scheduledEndAt: '2026-09-10T15:30:00.000Z',
        })
        .expect(404);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${session.sessionId}/cancel`)
        .set(...authHeader(app, stranger))
        .send({})
        .expect(404);
    });

    it('reschedule appears in the audit log', async () => {
      const { body: session } = await createManualSession().expect(201);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${session.sessionId}/reschedule`)
        .set(...authHeader(app, admin))
        .send({
          scheduledStartAt: '2026-09-10T14:00:00.000Z',
          scheduledEndAt: '2026-09-10T15:30:00.000Z',
        })
        .expect(201);

      const entries = await auditEntries('session.rescheduled');
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].targetId).toBe(session.sessionId);
    });

    it('cancellation appears in the audit log', async () => {
      const { body: session } = await createManualSession().expect(201);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${session.sessionId}/cancel`)
        .set(...authHeader(app, admin))
        .send({})
        .expect(201);

      const entries = await auditEntries('session.cancelled');
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].targetId).toBe(session.sessionId);
    });

    it('non-enrolled students do not get notified on reschedule', async () => {
      const { body: session } = await createManualSession().expect(201);

      const countBefore = await unreadCount(stranger);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${session.sessionId}/reschedule`)
        .set(...authHeader(app, admin))
        .send({
          scheduledStartAt: '2026-09-10T14:00:00.000Z',
          scheduledEndAt: '2026-09-10T15:30:00.000Z',
        })
        .expect(201);

      const countAfter = await unreadCount(stranger);
      expect(countAfter - countBefore).toBe(0);
    });
  });
});

const REPEAT_INTERVAL_MS = 60 * 60 * 1000;
