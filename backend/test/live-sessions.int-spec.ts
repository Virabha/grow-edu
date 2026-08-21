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
import { SESSION_REMINDER_JOB } from '../src/batches/scheduling/reminder.service';
import { RECORDING_RECONCILE_JOB } from '../src/batches/scheduling/recording.service';
import {
  EndedSession,
  ProviderRecording,
  RECORDING_PROVIDER,
  RecordingProvider,
} from '../src/batches/scheduling/recording-provider';
import { batchEnrollments } from '../src/database/schema';
import { eq } from 'drizzle-orm';

const NOW = '2026-09-01T09:00:00.000Z';
const REMINDER_REPEAT_MS = 60 * 1000;

class FakeRecordingProvider implements RecordingProvider {
  readonly asked: EndedSession[] = [];
  answer: ProviderRecording | null = null;
  throwOnce = false;

  async findRecording(session: EndedSession): Promise<ProviderRecording | null> {
    this.asked.push(session);
    if (this.throwOnce) {
      this.throwOnce = false;
      throw new Error('provider unreachable');
    }
    return this.answer;
  }

  reset(): void {
    this.asked.length = 0;
    this.answer = null;
    this.throwOnce = false;
  }
}

describe('live sessions (09 + 10 + 11)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let queue: InlineJobQueue;
  const recordings = new FakeRecordingProvider();
  let admin: TestActor;
  let student: TestActor;
  let student2: TestActor;
  let stranger: TestActor;
  let batchId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database, clock, [
      { token: RECORDING_PROVIDER, value: recordings },
    ]);
    queue = app.get<InlineJobQueue>(JOB_QUEUE);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.set(NOW);
    await truncateAll(database);
    recordings.reset();
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    student2 = await createUser(database, 'LEARNER');
    stranger = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);
    await enrol(database, batchId, student2.userId);
  });

  function createLiveSession(overrides: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post(`/batches/${batchId}/sessions`)
      .set(...authHeader(app, admin))
      .send({
        title: 'Physics live class',
        type: 'LIVE',
        liveProvider: 'ZOOM',
        joinUrl: 'https://zoom.example/physics',
        scheduledStartAt: '2026-09-01T09:10:00.000Z',
        scheduledEndAt: '2026-09-01T10:10:00.000Z',
        ...overrides,
      });
  }

  async function unreadCount(actor: TestActor): Promise<number> {
    const { body } = await request(app.getHttpServer())
      .get('/notifications?limit=100')
      .set(...authHeader(app, actor))
      .expect(200);
    const rows = (body as { data?: { title: string }[] }).data ?? [];
    return rows.filter((n) => n.title.startsWith('Class starting soon')).length;
  }

  async function auditEntries(action: string) {
    const { body } = await request(app.getHttpServer())
      .get(`/audit-log?action=${encodeURIComponent(action)}`)
      .set(...authHeader(app, admin))
      .expect(200);
    return body as { action: string; targetId: string }[];
  }

  describe('ticket 09 — class-starting-soon reminder', () => {
    it('moving clock forward past reminder point triggers reminder via tick()', async () => {
      await createLiveSession({
        scheduledStartAt: '2026-09-01T09:10:00.000Z',
        scheduledEndAt: '2026-09-01T10:10:00.000Z',
      }).expect(201);

      const before = await unreadCount(student);

      clock.advance(REMINDER_REPEAT_MS + 1);
      const fired = await queue.tick();
      expect(fired).toContain(SESSION_REMINDER_JOB);

      const after = await unreadCount(student);
      expect(after - before).toBe(1);
    });

    it('an enrolled student is reminded before a live session starts', async () => {
      await createLiveSession().expect(201);

      const before = await unreadCount(student);
      await queue.enqueue(SESSION_REMINDER_JOB, undefined);
      const after = await unreadCount(student);

      expect(after - before).toBe(1);
    });

    it('a cancelled session produces no reminder', async () => {
      const { body: session } = await createLiveSession().expect(201);
      const sessionId = (session as { sessionId: string }).sessionId;

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${sessionId}/cancel`)
        .set(...authHeader(app, admin))
        .send({})
        .expect(201);

      const before = await unreadCount(student);
      await queue.enqueue(SESSION_REMINDER_JOB, undefined);
      const after = await unreadCount(student);

      expect(after - before).toBe(0);
    });

    it('a student whose enrolment has been revoked receives no reminder', async () => {
      await createLiveSession().expect(201);

      await database.db
        .update(batchEnrollments)
        .set({ status: 'REVOKED' as never })
        .where(eq(batchEnrollments.userId, student.userId));

      const before = await unreadCount(student);
      await queue.enqueue(SESSION_REMINDER_JOB, undefined);
      const after = await unreadCount(student);

      expect(after - before).toBe(0);
    });

    it('a reminder is sent exactly once even if the job runs multiple times', async () => {
      await createLiveSession().expect(201);

      const before = await unreadCount(student);
      await queue.enqueue(SESSION_REMINDER_JOB, undefined);
      await queue.enqueue(SESSION_REMINDER_JOB, undefined);
      const after = await unreadCount(student);

      expect(after - before).toBe(1);
    });

    it('a rescheduled session is reminded at its new time, not its old one', async () => {
      const { body: session } = await createLiveSession({
        scheduledStartAt: '2026-09-01T09:10:00.000Z',
        scheduledEndAt: '2026-09-01T10:10:00.000Z',
      }).expect(201);
      const sessionId = (session as { sessionId: string }).sessionId;

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${sessionId}/reschedule`)
        .set(...authHeader(app, admin))
        .send({
          scheduledStartAt: '2026-09-02T09:10:00.000Z',
          scheduledEndAt: '2026-09-02T10:10:00.000Z',
        })
        .expect(201);

      const before = await unreadCount(student);
      await queue.enqueue(SESSION_REMINDER_JOB, undefined);
      const afterReminder = await unreadCount(student);

      expect(afterReminder - before).toBe(0);

      clock.set('2026-09-02T09:00:00.000Z');
      await queue.enqueue(SESSION_REMINDER_JOB, undefined);
      const afterNewTime = await unreadCount(student);

      expect(afterNewTime - before).toBe(1);
    });

    it('non-enrolled students do not receive reminders', async () => {
      await createLiveSession().expect(201);

      const before = await unreadCount(stranger);
      await queue.enqueue(SESSION_REMINDER_JOB, undefined);
      const after = await unreadCount(stranger);

      expect(after - before).toBe(0);
    });
  });

  describe('ticket 10 — recording attachment', () => {
    it('a recording appears against its session without manual upload', async () => {
      const { body: session } = await createLiveSession().expect(201);
      const sessionId = (session as { sessionId: string }).sessionId;

      const { body: result } = await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${sessionId}/recording`)
        .set(...authHeader(app, admin))
        .send({ videoId: 'bunny-vid-abc123' })
        .expect(201);

      expect((result as { success: boolean }).success).toBe(true);
      expect((result as { alreadyAttached: boolean }).alreadyAttached).toBe(false);

      const { body: sessionAfter } = await request(app.getHttpServer())
        .get(`/batches/${batchId}/sessions/${sessionId}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(
        (sessionAfter as { recordingVideoId: string }).recordingVideoId,
      ).toBe('bunny-vid-abc123');
    });

    it('a provider webhook that arrives late or twice results in one attachment, not two', async () => {
      const { body: session } = await createLiveSession().expect(201);
      const sessionId = (session as { sessionId: string }).sessionId;

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${sessionId}/recording`)
        .set(...authHeader(app, admin))
        .send({ videoId: 'bunny-vid-dup' })
        .expect(201);

      const { body: second } = await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${sessionId}/recording`)
        .set(...authHeader(app, admin))
        .send({ videoId: 'bunny-vid-dup' })
        .expect(201);

      expect((second as { alreadyAttached: boolean }).alreadyAttached).toBe(true);

      const { body: sessionAfter } = await request(app.getHttpServer())
        .get(`/batches/${batchId}/sessions/${sessionId}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(
        (sessionAfter as { recordingVideoId: string }).recordingVideoId,
      ).toBe('bunny-vid-dup');
    });

    it('reconciliation job surfaces sessions without recordings in the audit log', async () => {
      await createLiveSession({
        scheduledStartAt: '2026-09-01T07:00:00.000Z',
        scheduledEndAt: '2026-09-01T08:00:00.000Z',
      }).expect(201);

      await queue.enqueue(RECORDING_RECONCILE_JOB, undefined);

      const entries = await auditEntries('session.recording.pending');
      expect(entries.length).toBeGreaterThan(0);
    });

    async function endedSession() {
      const { body } = await createLiveSession({
        scheduledStartAt: '2026-09-01T07:00:00.000Z',
        scheduledEndAt: '2026-09-01T08:00:00.000Z',
      }).expect(201);
      return (body as { sessionId: string }).sessionId;
    }

    function sessionAsStudent(sessionId: string) {
      return request(app.getHttpServer())
        .get(`/batches/${batchId}/sessions/${sessionId}`)
        .set(...authHeader(app, student));
    }

    it('polls the provider for a session whose recording has not arrived', async () => {
      const sessionId = await endedSession();

      await queue.enqueue(RECORDING_RECONCILE_JOB, undefined);

      expect(recordings.asked.map((s) => s.sessionId)).toContain(sessionId);
      const asked = recordings.asked.find((s) => s.sessionId === sessionId);
      expect(asked?.liveProvider).toBe('ZOOM');
      expect(asked?.joinUrl).toBe('https://zoom.example/physics');
    });

    it('attaches the recording the provider hands back, without an admin call', async () => {
      const sessionId = await endedSession();
      recordings.answer = {
        videoId: 'bunny-vid-polled',
        thumbnailUrl: 'https://cdn.example/polled.jpg',
        durationSeconds: 3600,
      };

      await queue.enqueue(RECORDING_RECONCILE_JOB, undefined);

      const { body } = await sessionAsStudent(sessionId).expect(200);
      expect((body as { recordingVideoId: string }).recordingVideoId).toBe(
        'bunny-vid-polled',
      );
    });

    it('records the poll-attached recording in the audit log', async () => {
      await endedSession();
      recordings.answer = { videoId: 'bunny-vid-audited' };

      await queue.enqueue(RECORDING_RECONCILE_JOB, undefined);

      const entries = await auditEntries('session.recording.attached');
      expect(entries.length).toBeGreaterThan(0);
    });

    it('marks attendance the provider reported alongside the recording', async () => {
      const sessionId = await endedSession();
      recordings.answer = {
        videoId: 'bunny-vid-attendance',
        attendeeUserIds: [student.userId],
      };

      await queue.enqueue(RECORDING_RECONCILE_JOB, undefined);

      const { body } = await request(app.getHttpServer())
        .get(`/batches/${batchId}/sessions/${sessionId}/attendance`)
        .set(...authHeader(app, admin))
        .expect(200);

      const present = (
        body as { userId: string; source: string }[]
      ).filter((r) => r.userId === student.userId);
      expect(present).toHaveLength(1);
      expect(present[0].source).toBe('PROVIDER');
    });

    it('stops polling a session once its recording is attached', async () => {
      await endedSession();
      recordings.answer = { videoId: 'bunny-vid-once' };
      await queue.enqueue(RECORDING_RECONCILE_JOB, undefined);

      recordings.reset();
      await queue.enqueue(RECORDING_RECONCILE_JOB, undefined);

      expect(recordings.asked).toEqual([]);
    });

    it('leaves the session pending when the provider has nothing yet', async () => {
      const sessionId = await endedSession();
      recordings.answer = null;

      await queue.enqueue(RECORDING_RECONCILE_JOB, undefined);

      const { body } = await sessionAsStudent(sessionId).expect(200);
      expect(
        (body as { recordingVideoId: string | null }).recordingVideoId,
      ).toBeNull();
      expect(await auditEntries('session.recording.pending')).not.toHaveLength(
        0,
      );
    });

    it('survives a provider that fails and retries on the next pass', async () => {
      const sessionId = await endedSession();
      recordings.throwOnce = true;
      recordings.answer = { videoId: 'bunny-vid-after-outage' };

      await queue.enqueue(RECORDING_RECONCILE_JOB, undefined);

      const { body: first } = await sessionAsStudent(sessionId).expect(200);
      expect(
        (first as { recordingVideoId: string | null }).recordingVideoId,
      ).toBeNull();

      await queue.enqueue(RECORDING_RECONCILE_JOB, undefined);

      const { body: second } = await sessionAsStudent(sessionId).expect(200);
      expect((second as { recordingVideoId: string }).recordingVideoId).toBe(
        'bunny-vid-after-outage',
      );
    });

    it('does not poll a session that has not reached its end time', async () => {
      await createLiveSession({
        scheduledStartAt: '2026-09-01T18:00:00.000Z',
        scheduledEndAt: '2026-09-01T19:00:00.000Z',
      }).expect(201);

      await queue.enqueue(RECORDING_RECONCILE_JOB, undefined);

      expect(recordings.asked).toEqual([]);
    });

    it('a successfully attached recording appears in the audit log', async () => {
      const { body: session } = await createLiveSession().expect(201);
      const sessionId = (session as { sessionId: string }).sessionId;

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${sessionId}/recording`)
        .set(...authHeader(app, admin))
        .send({ videoId: 'bunny-vid-audit' })
        .expect(201);

      const entries = await auditEntries('session.recording.attached');
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].targetId).toBe(sessionId);
    });

    it('the recording is playable from the student timetable', async () => {
      const { body: session } = await createLiveSession().expect(201);
      const sessionId = (session as { sessionId: string }).sessionId;

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${sessionId}/recording`)
        .set(...authHeader(app, admin))
        .send({ videoId: 'bunny-vid-playback' })
        .expect(201);

      clock.advance(2 * 60 * 60 * 1000);

      const { body: timetable } = await request(app.getHttpServer())
        .get(`/batches/${batchId}/timetable`)
        .set(...authHeader(app, student))
        .expect(200);

      const items = (
        timetable as {
          items: { id: string; recordingVideoId: string | null }[];
        }
      ).items;
      const item = items.find((i) => i.id === sessionId);
      expect(item).toBeDefined();
      expect(item?.recordingVideoId).toBe('bunny-vid-playback');
    });
  });

  describe('ticket 11 — attendance capture', () => {
    it('provider attendance appears when a recording is attached with attendee list', async () => {
      const { body: session } = await createLiveSession().expect(201);
      const sessionId = (session as { sessionId: string }).sessionId;

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${sessionId}/recording`)
        .set(...authHeader(app, admin))
        .send({
          videoId: 'bunny-vid-attendance',
          attendeeUserIds: [student.userId],
        })
        .expect(201);

      const { body: myAttendance } = await request(app.getHttpServer())
        .get(`/batches/${batchId}/attendance/me`)
        .set(...authHeader(app, student))
        .expect(200);

      const rows = myAttendance as { attendance: { source: string } }[];
      expect(rows.length).toBe(1);
      expect(rows[0].attendance.source).toBe('PROVIDER');
    });

    it('manual marking is available for students (self-report)', async () => {
      const { body: session } = await createLiveSession().expect(201);
      const sessionId = (session as { sessionId: string }).sessionId;

      const { body: result } = await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${sessionId}/attendance`)
        .set(...authHeader(app, student))
        .send({ durationSeconds: 3600 })
        .expect(201);

      expect((result as { success: boolean }).success).toBe(true);
      expect((result as { alreadyRecorded: boolean }).alreadyRecorded).toBe(false);
    });

    it('a student marking attendance twice returns alreadyRecorded without creating a duplicate', async () => {
      const { body: session } = await createLiveSession().expect(201);
      const sessionId = (session as { sessionId: string }).sessionId;

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${sessionId}/attendance`)
        .set(...authHeader(app, student))
        .send({})
        .expect(201);

      const { body: second } = await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${sessionId}/attendance`)
        .set(...authHeader(app, student))
        .send({})
        .expect(201);

      expect((second as { alreadyRecorded: boolean }).alreadyRecorded).toBe(true);
    });

    it('an instructor can correct an attendance record and the correction wins', async () => {
      const { body: session } = await createLiveSession().expect(201);
      const sessionId = (session as { sessionId: string }).sessionId;

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${sessionId}/attendance`)
        .set(...authHeader(app, student))
        .send({ durationSeconds: 10 })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/batches/${batchId}/sessions/${sessionId}/attendance/${student.userId}`)
        .set(...authHeader(app, admin))
        .send({ durationSeconds: 3600 })
        .expect(200);

      const { body: myAttendance } = await request(app.getHttpServer())
        .get(`/batches/${batchId}/attendance/me`)
        .set(...authHeader(app, student))
        .expect(200);

      const rows = myAttendance as {
        attendance: { source: string; correctedBy: string; durationSeconds: number };
      }[];
      expect(rows.length).toBe(1);
      expect(rows[0].attendance.source).toBe('INSTRUCTOR_CORRECTION');
      expect(rows[0].attendance.durationSeconds).toBe(3600);
    });

    it('a correction records who made it', async () => {
      const { body: session } = await createLiveSession().expect(201);
      const sessionId = (session as { sessionId: string }).sessionId;

      await request(app.getHttpServer())
        .patch(`/batches/${batchId}/sessions/${sessionId}/attendance/${student.userId}`)
        .set(...authHeader(app, admin))
        .send({})
        .expect(200);

      const { body: myAttendance } = await request(app.getHttpServer())
        .get(`/batches/${batchId}/attendance/me`)
        .set(...authHeader(app, student))
        .expect(200);

      const rows = myAttendance as {
        attendance: { correctedBy: string | null };
      }[];
      expect(rows.length).toBe(1);
      expect(rows[0].attendance.correctedBy).toBe(admin.userId);

      const entries = await auditEntries('attendance.corrected');
      expect(entries.length).toBeGreaterThan(0);
    });

    it('an instructor correction cannot be overridden by a subsequent student self-report', async () => {
      const { body: session } = await createLiveSession().expect(201);
      const sessionId = (session as { sessionId: string }).sessionId;

      await request(app.getHttpServer())
        .patch(`/batches/${batchId}/sessions/${sessionId}/attendance/${student.userId}`)
        .set(...authHeader(app, admin))
        .send({ durationSeconds: 3600 })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${sessionId}/attendance`)
        .set(...authHeader(app, student))
        .send({ durationSeconds: 1 })
        .expect(201);

      const { body: myAttendance } = await request(app.getHttpServer())
        .get(`/batches/${batchId}/attendance/me`)
        .set(...authHeader(app, student))
        .expect(200);

      const rows = myAttendance as {
        attendance: { source: string; durationSeconds: number };
      }[];
      expect(rows[0].attendance.source).toBe('INSTRUCTOR_CORRECTION');
      expect(rows[0].attendance.durationSeconds).toBe(3600);
    });

    it('a student sees their own attendance and not any other student', async () => {
      const { body: session } = await createLiveSession().expect(201);
      const sessionId = (session as { sessionId: string }).sessionId;

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${sessionId}/attendance`)
        .set(...authHeader(app, student))
        .send({})
        .expect(201);

      const { body: myAttendance } = await request(app.getHttpServer())
        .get(`/batches/${batchId}/attendance/me`)
        .set(...authHeader(app, student2))
        .expect(200);

      const rows = myAttendance as { attendance: { userId: string } }[];
      expect(rows.length).toBe(0);
    });

    it('a student cannot see batch attendance data belonging to other students', async () => {
      const { body: session } = await createLiveSession().expect(201);
      const sessionId = (session as { sessionId: string }).sessionId;

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/sessions/${sessionId}/attendance`)
        .set(...authHeader(app, student))
        .send({})
        .expect(201);

      await request(app.getHttpServer())
        .get(`/batches/${batchId}/sessions/${sessionId}/attendance`)
        .set(...authHeader(app, student))
        .expect(404);
    });
  });
});
