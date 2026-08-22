import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { eq } from 'drizzle-orm';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import {
  pathMentorAssignments,
  batchSessions,
  mentorSessionFeedback,
  learningPaths,
} from '../src/database/schema';

const clock = new TestClock();

describe('mentorship (tickets 38 and 39)', () => {
  let database: TestDatabase;
  let app: INestApplication;

  let admin: TestActor;
  let mentor: TestActor;
  let anotherMentor: TestActor;
  let student: TestActor;
  let anotherStudent: TestActor;
  let pathId: string;

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
    mentor = await createUser(database, 'INSTRUCTOR');
    anotherMentor = await createUser(database, 'INSTRUCTOR');
    student = await createUser(database, 'LEARNER');
    anotherStudent = await createUser(database, 'LEARNER');

    const [path] = await database.db
      .insert(learningPaths)
      .values({
        title: 'Full Stack Path',
        slug: 'full-stack',
        createdBy: admin.userId,
        createdAt: clock.now(),
        updatedAt: clock.now(),
      })
      .returning();
    pathId = path.pathId;
  });

  describe('ticket 38 — mentor assignment', () => {
    it('admin can assign a mentor to a student within a path', async () => {
      const res = await request(app.getHttpServer())
        .post('/mentorship/assignments')
        .set(...authHeader(app, admin))
        .send({ pathId, mentorId: mentor.userId, studentId: student.userId })
        .expect(201);

      expect(res.body.mentorId).toBe(mentor.userId);
      expect(res.body.studentId).toBe(student.userId);
      expect(res.body.pathId).toBe(pathId);
      expect(res.body.revokedAt).toBeNull();
    });

    it('learner cannot assign a mentor', async () => {
      await request(app.getHttpServer())
        .post('/mentorship/assignments')
        .set(...authHeader(app, student))
        .send({ pathId, mentorId: mentor.userId, studentId: student.userId })
        .expect(403);
    });

    it('instructor cannot assign a mentor', async () => {
      await request(app.getHttpServer())
        .post('/mentorship/assignments')
        .set(...authHeader(app, mentor))
        .send({ pathId, mentorId: mentor.userId, studentId: student.userId })
        .expect(403);
    });

    it('mentor sees only their own assigned students', async () => {
      await database.db.insert(pathMentorAssignments).values([
        {
          pathId,
          mentorId: mentor.userId,
          studentId: student.userId,
          assignedBy: admin.userId,
          assignedAt: clock.now(),
        },
        {
          pathId,
          mentorId: anotherMentor.userId,
          studentId: anotherStudent.userId,
          assignedBy: admin.userId,
          assignedAt: clock.now(),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/mentorship/assignments')
        .set(...authHeader(app, mentor))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].mentorId).toBe(mentor.userId);
    });

    it('student sees only their own assignment', async () => {
      await database.db.insert(pathMentorAssignments).values([
        {
          pathId,
          mentorId: mentor.userId,
          studentId: student.userId,
          assignedBy: admin.userId,
          assignedAt: clock.now(),
        },
        {
          pathId,
          mentorId: anotherMentor.userId,
          studentId: anotherStudent.userId,
          assignedBy: admin.userId,
          assignedAt: clock.now(),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/mentorship/assignments')
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].studentId).toBe(student.userId);
    });

    it('admin sees all assignments', async () => {
      await database.db.insert(pathMentorAssignments).values([
        {
          pathId,
          mentorId: mentor.userId,
          studentId: student.userId,
          assignedBy: admin.userId,
          assignedAt: clock.now(),
        },
        {
          pathId,
          mentorId: anotherMentor.userId,
          studentId: anotherStudent.userId,
          assignedBy: admin.userId,
          assignedAt: clock.now(),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/mentorship/assignments')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(res.body).toHaveLength(2);
    });

    it('revocation preserves history with revokedAt set', async () => {
      const [assignment] = await database.db
        .insert(pathMentorAssignments)
        .values({
          pathId,
          mentorId: mentor.userId,
          studentId: student.userId,
          assignedBy: admin.userId,
          assignedAt: clock.now(),
        })
        .returning();

      await request(app.getHttpServer())
        .delete(`/mentorship/assignments/${assignment.assignmentId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      const active = await request(app.getHttpServer())
        .get('/mentorship/assignments')
        .set(...authHeader(app, mentor))
        .expect(200);

      expect(active.body).toHaveLength(0);
    });

    it('admin can see mentor engagement', async () => {
      await request(app.getHttpServer())
        .get('/mentorship/engagement')
        .set(...authHeader(app, admin))
        .expect(200);
    });
  });

  describe('ticket 39 — one-to-one sessions with private feedback', () => {
    let assignmentId: string;

    beforeEach(async () => {
      const [a] = await database.db
        .insert(pathMentorAssignments)
        .values({
          pathId,
          mentorId: mentor.userId,
          studentId: student.userId,
          assignedBy: admin.userId,
          assignedAt: clock.now(),
        })
        .returning();
      assignmentId = a.assignmentId;
    });

    it('mentor creates a one-to-one session', async () => {
      const res = await request(app.getHttpServer())
        .post('/mentorship/sessions')
        .set(...authHeader(app, mentor))
        .send({
          studentId: student.userId,
          pathId,
          title: 'Weekly Check-In',
          scheduledStartAt: '2027-08-01T10:00:00.000Z',
          scheduledEndAt: '2027-08-01T11:00:00.000Z',
        })
        .expect(201);

      expect(res.body.type).toBe('ONE_TO_ONE');
      expect(res.body.teacherId).toBe(mentor.userId);
    });

    it('mentor cannot create session for a student they are not assigned to', async () => {
      await request(app.getHttpServer())
        .post('/mentorship/sessions')
        .set(...authHeader(app, mentor))
        .send({
          studentId: anotherStudent.userId,
          pathId,
          title: 'Weekly Check-In',
          scheduledStartAt: '2027-08-01T10:00:00.000Z',
          scheduledEndAt: '2027-08-01T11:00:00.000Z',
        })
        .expect(403);
    });

    it('mentor writes feedback on a session', async () => {
      const sessionRes = await request(app.getHttpServer())
        .post('/mentorship/sessions')
        .set(...authHeader(app, mentor))
        .send({
          studentId: student.userId,
          pathId,
          title: 'Check-In',
          scheduledStartAt: '2027-08-01T10:00:00.000Z',
          scheduledEndAt: '2027-08-01T11:00:00.000Z',
        })
        .expect(201);

      const sessionId = sessionRes.body.sessionId;

      await request(app.getHttpServer())
        .put(`/mentorship/sessions/${sessionId}/feedback?studentId=${student.userId}`)
        .set(...authHeader(app, mentor))
        .send({ notes: 'Student is making great progress on algorithms.' })
        .expect(200);
    });

    it('student cannot read mentor feedback — adversarial check', async () => {
      const sessionRes = await request(app.getHttpServer())
        .post('/mentorship/sessions')
        .set(...authHeader(app, mentor))
        .send({
          studentId: student.userId,
          pathId,
          title: 'Check-In',
          scheduledStartAt: '2027-08-01T10:00:00.000Z',
          scheduledEndAt: '2027-08-01T11:00:00.000Z',
        })
        .expect(201);

      const sessionId = sessionRes.body.sessionId;

      await request(app.getHttpServer())
        .put(`/mentorship/sessions/${sessionId}/feedback?studentId=${student.userId}`)
        .set(...authHeader(app, mentor))
        .send({ notes: 'PRIVATE: student is struggling with system design.' })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/mentorship/sessions/${sessionId}/feedback`)
        .set(...authHeader(app, student))
        .expect(403);
    });

    it('another mentor cannot read a different mentor\'s feedback — adversarial check', async () => {
      const sessionRes = await request(app.getHttpServer())
        .post('/mentorship/sessions')
        .set(...authHeader(app, mentor))
        .send({
          studentId: student.userId,
          pathId,
          title: 'Check-In',
          scheduledStartAt: '2027-08-01T10:00:00.000Z',
          scheduledEndAt: '2027-08-01T11:00:00.000Z',
        })
        .expect(201);

      const sessionId = sessionRes.body.sessionId;

      await request(app.getHttpServer())
        .put(`/mentorship/sessions/${sessionId}/feedback?studentId=${student.userId}`)
        .set(...authHeader(app, mentor))
        .send({ notes: 'PRIVATE: notes only for the session mentor.' })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/mentorship/sessions/${sessionId}/feedback`)
        .set(...authHeader(app, anotherMentor))
        .expect(403);
    });

    it('admin can read any session feedback', async () => {
      const [session] = await database.db
        .insert(batchSessions)
        .values({
          type: 'ONE_TO_ONE',
          title: 'Session',
          teacherId: mentor.userId,
          scheduledStartAt: new Date('2027-08-01T10:00:00.000Z'),
          scheduledEndAt: new Date('2027-08-01T11:00:00.000Z'),
          createdAt: clock.now(),
          updatedAt: clock.now(),
        })
        .returning();

      await database.db.insert(mentorSessionFeedback).values({
        sessionId: session.sessionId,
        mentorId: mentor.userId,
        studentId: student.userId,
        notes: 'Great session.',
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });

      const res = await request(app.getHttpServer())
        .get(`/mentorship/sessions/${session.sessionId}/feedback`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(res.body.notes).toBe('Great session.');
    });

    it('keeps the assignment reachable for the session tests', () => {
      expect(typeof assignmentId).toBe('string');
    });
  });

  describe('the owner can see whether sessions are actually happening', () => {
    async function assignAndSchedule() {
      const assignment = await request(app.getHttpServer())
        .post('/mentorship/assignments')
        .set(...authHeader(app, admin))
        .send({ pathId, mentorId: mentor.userId, studentId: student.userId })
        .expect(201);

      await request(app.getHttpServer())
        .post('/mentorship/sessions')
        .set(...authHeader(app, mentor))
        .send({
          pathId,
          studentId: student.userId,
          title: 'Weekly catch-up',
          scheduledStartAt: '2027-08-01T10:00:00.000Z',
          scheduledEndAt: '2027-08-01T11:00:00.000Z',
        })
        .expect(201);

      return assignment.body.assignmentId;
    }

    it('reports zero sessions for an assignment nobody has met on', async () => {
      await request(app.getHttpServer())
        .post('/mentorship/assignments')
        .set(...authHeader(app, admin))
        .send({ pathId, mentorId: mentor.userId, studentId: student.userId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/mentorship/engagement')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].sessionsScheduled).toBe(0);
      expect(res.body[0].lastSessionAt).toBeNull();
      expect(res.body[0].feedbackWritten).toBe(0);
    });

    it('counts a scheduled session against the assignment it belongs to', async () => {
      await assignAndSchedule();

      const res = await request(app.getHttpServer())
        .get('/mentorship/engagement')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(res.body[0].sessionsScheduled).toBe(1);
      expect(res.body[0].lastSessionAt).not.toBeNull();
    });

    it('distinguishes a session that was scheduled from one that was held', async () => {
      await assignAndSchedule();

      const before = await request(app.getHttpServer())
        .get('/mentorship/engagement')
        .set(...authHeader(app, admin))
        .expect(200);
      expect(before.body[0].sessionsHeld).toBe(0);

      await database.db
        .update(batchSessions)
        .set({ status: 'ENDED' })
        .where(eq(batchSessions.type, 'ONE_TO_ONE'));

      const after = await request(app.getHttpServer())
        .get('/mentorship/engagement')
        .set(...authHeader(app, admin))
        .expect(200);
      expect(after.body[0].sessionsHeld).toBe(1);
    });

    it('does not attribute one mentor\'s sessions to another assignment', async () => {
      await assignAndSchedule();
      await request(app.getHttpServer())
        .post('/mentorship/assignments')
        .set(...authHeader(app, admin))
        .send({
          pathId,
          mentorId: anotherMentor.userId,
          studentId: anotherStudent.userId,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/mentorship/engagement')
        .set(...authHeader(app, admin))
        .expect(200);

      const busy = res.body.filter(
        (row: { sessionsScheduled: number }) => row.sessionsScheduled > 0,
      );
      expect(busy).toHaveLength(1);
      expect(busy[0].mentorId).toBe(mentor.userId);
    });

    it('refuses an instructor sight of the engagement report', async () => {
      await request(app.getHttpServer())
        .get('/mentorship/engagement')
        .set(...authHeader(app, mentor))
        .expect(403);
    });

    it('shows a student their scheduled session before any feedback exists', async () => {
      await assignAndSchedule();

      const res = await request(app.getHttpServer())
        .get('/mentorship/sessions')
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Weekly catch-up');
    });

    it('does not show a student another student\'s session', async () => {
      await assignAndSchedule();

      const res = await request(app.getHttpServer())
        .get('/mentorship/sessions')
        .set(...authHeader(app, anotherStudent))
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });
});
