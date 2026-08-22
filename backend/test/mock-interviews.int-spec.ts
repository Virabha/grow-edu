import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import {
  learningPaths,
  mockInterviews,
  pathMentorAssignments,
  skills,
} from '../src/database/schema';

const clock = new TestClock();

describe('mock interviews (ticket 40)', () => {
  let database: TestDatabase;
  let app: INestApplication;

  let admin: TestActor;
  let mentor: TestActor;
  let anotherMentor: TestActor;
  let student: TestActor;
  let anotherStudent: TestActor;
  let pathId: string;
  let skillId: string;

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
        title: 'Interview Prep Path',
        slug: 'interview-prep',
        createdBy: admin.userId,
        createdAt: clock.now(),
        updatedAt: clock.now(),
      })
      .returning();
    pathId = path.pathId;

    const [skill] = await database.db
      .insert(skills)
      .values({
        key: 'system-design',
        label: 'System Design',
        createdBy: admin.userId,
        createdAt: clock.now(),
        updatedAt: clock.now(),
      })
      .returning();
    skillId = skill.skillId;

    await database.db.insert(pathMentorAssignments).values({
      pathId,
      mentorId: mentor.userId,
      studentId: student.userId,
      assignedBy: admin.userId,
      assignedAt: clock.now(),
    });
  });

  it('mentor schedules a mock interview', async () => {
    const res = await request(app.getHttpServer())
      .post('/mock-interviews')
      .set(...authHeader(app, mentor))
      .send({
        pathId,
        studentId: student.userId,
        scheduledAt: '2027-09-01T14:00:00.000Z',
      })
      .expect(201);

    expect(res.body.studentId).toBe(student.userId);
    expect(res.body.mentorId).toBe(mentor.userId);
    expect(res.body.status).toBe('SCHEDULED');
  });

  it('mentor cannot schedule interview for student not assigned to them', async () => {
    await request(app.getHttpServer())
      .post('/mock-interviews')
      .set(...authHeader(app, mentor))
      .send({
        pathId,
        studentId: anotherStudent.userId,
        scheduledAt: '2027-09-01T14:00:00.000Z',
      })
      .expect(403);
  });

  it('student sees their own interviews', async () => {
    await database.db.insert(mockInterviews).values([
      {
        pathId,
        mentorId: mentor.userId,
        studentId: student.userId,
        scheduledAt: new Date('2027-09-01T14:00:00.000Z'),
        createdAt: clock.now(),
        updatedAt: clock.now(),
      },
      {
        pathId,
        mentorId: anotherMentor.userId,
        studentId: anotherStudent.userId,
        scheduledAt: new Date('2027-09-02T14:00:00.000Z'),
        createdAt: clock.now(),
        updatedAt: clock.now(),
      },
    ]);

    const res = await request(app.getHttpServer())
      .get('/mock-interviews')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].studentId).toBe(student.userId);
  });

  it('mentor submits competency scores after completing interview', async () => {
    const [interview] = await database.db
      .insert(mockInterviews)
      .values({
        pathId,
        mentorId: mentor.userId,
        studentId: student.userId,
        scheduledAt: new Date('2027-09-01T14:00:00.000Z'),
        createdAt: clock.now(),
        updatedAt: clock.now(),
      })
      .returning();

    await request(app.getHttpServer())
      .post(`/mock-interviews/${interview.mockInterviewId}/complete`)
      .set(...authHeader(app, mentor))
      .expect(201);

    const scoreRes = await request(app.getHttpServer())
      .post(`/mock-interviews/${interview.mockInterviewId}/scores`)
      .set(...authHeader(app, mentor))
      .send({ skillId, score: 4, notes: 'Strong performance' })
      .expect(201);

    expect(scoreRes.body.skillId).toBe(skillId);
    expect(scoreRes.body.score).toBe(4);
  });

  it('scores map onto the existing skill map via skillDemonstrations', async () => {
    const [interview] = await database.db
      .insert(mockInterviews)
      .values({
        pathId,
        mentorId: mentor.userId,
        studentId: student.userId,
        scheduledAt: new Date('2027-09-01T14:00:00.000Z'),
        createdAt: clock.now(),
        updatedAt: clock.now(),
      })
      .returning();

    await request(app.getHttpServer())
      .post(`/mock-interviews/${interview.mockInterviewId}/complete`)
      .set(...authHeader(app, mentor))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/mock-interviews/${interview.mockInterviewId}/scores`)
      .set(...authHeader(app, mentor))
      .send({ skillId, score: 4 })
      .expect(201);

    const demonstrations = await request(app.getHttpServer())
      .get('/skills/my-demonstrations')
      .set(...authHeader(app, student))
      .expect(200);

    const demo = demonstrations.body.find(
      (d: { skillId: string }) => d.skillId === skillId,
    );
    expect(demo).toBeDefined();
    expect(demo.completedItems).toBeGreaterThan(0);
  });

  it('student can read their own interview scores', async () => {
    const [interview] = await database.db
      .insert(mockInterviews)
      .values({
        pathId,
        mentorId: mentor.userId,
        studentId: student.userId,
        scheduledAt: new Date('2027-09-01T14:00:00.000Z'),
        createdAt: clock.now(),
        updatedAt: clock.now(),
      })
      .returning();

    await request(app.getHttpServer())
      .post(`/mock-interviews/${interview.mockInterviewId}/complete`)
      .set(...authHeader(app, mentor))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/mock-interviews/${interview.mockInterviewId}/scores`)
      .set(...authHeader(app, mentor))
      .send({ skillId, score: 3 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/mock-interviews/${interview.mockInterviewId}/scores`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].score).toBe(3);
  });

  it('scores submitted after student first views are flagged', async () => {
    const [interview] = await database.db
      .insert(mockInterviews)
      .values({
        pathId,
        mentorId: mentor.userId,
        studentId: student.userId,
        scheduledAt: new Date('2027-09-01T14:00:00.000Z'),
        createdAt: clock.now(),
        updatedAt: clock.now(),
      })
      .returning();

    await request(app.getHttpServer())
      .post(`/mock-interviews/${interview.mockInterviewId}/complete`)
      .set(...authHeader(app, mentor))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/mock-interviews/${interview.mockInterviewId}/scores`)
      .set(...authHeader(app, mentor))
      .send({ skillId, score: 3 })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/mock-interviews/${interview.mockInterviewId}/scores`)
      .set(...authHeader(app, student))
      .expect(200);

    const updatedScore = await request(app.getHttpServer())
      .post(`/mock-interviews/${interview.mockInterviewId}/scores`)
      .set(...authHeader(app, mentor))
      .send({ skillId, score: 5, notes: 'Updated score' })
      .expect(201);

    expect(updatedScore.body.editedAfterStudentViewed).toBe(true);
  });

  it('another student cannot see this student\'s interview', async () => {
    const [interview] = await database.db
      .insert(mockInterviews)
      .values({
        pathId,
        mentorId: mentor.userId,
        studentId: student.userId,
        scheduledAt: new Date('2027-09-01T14:00:00.000Z'),
        createdAt: clock.now(),
        updatedAt: clock.now(),
      })
      .returning();

    await request(app.getHttpServer())
      .get(`/mock-interviews/${interview.mockInterviewId}`)
      .set(...authHeader(app, anotherStudent))
      .expect(403);
  });
});
