import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import {
  jobApplications,
  jobOpenings,
  portfolios,
} from '../src/database/schema';

const clock = new TestClock();

describe('job board (ticket 41)', () => {
  let database: TestDatabase;
  let app: INestApplication;

  let admin: TestActor;
  let student: TestActor;
  let anotherStudent: TestActor;
  let portfolioId: string;

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
    anotherStudent = await createUser(database, 'LEARNER');

    const [portfolio] = await database.db
      .insert(portfolios)
      .values({
        userId: student.userId,
        handle: `student-${student.userId.slice(0, 8)}`,
        isPublished: true,
        createdAt: clock.now(),
        updatedAt: clock.now(),
      })
      .returning();
    portfolioId = portfolio.portfolioId;
  });

  describe('openings', () => {
    it('admin can post an opening', async () => {
      const res = await request(app.getHttpServer())
        .post('/job-board/openings')
        .set(...authHeader(app, admin))
        .send({
          title: 'Software Engineer',
          description: 'We are hiring!',
          location: 'Remote',
          tags: ['node', 'typescript'],
        })
        .expect(201);

      expect(res.body.title).toBe('Software Engineer');
      expect(res.body.status).toBe('OPEN');
    });

    it('student cannot post an opening', async () => {
      await request(app.getHttpServer())
        .post('/job-board/openings')
        .set(...authHeader(app, student))
        .send({ title: 'Job', description: 'Desc' })
        .expect(403);
    });

    it('students can list open openings', async () => {
      await database.db.insert(jobOpenings).values([
        {
          title: 'SWE',
          description: 'Open role',
          status: 'OPEN',
          postedBy: admin.userId,
          createdAt: clock.now(),
          updatedAt: clock.now(),
        },
        {
          title: 'Closed role',
          description: 'Not open',
          status: 'CLOSED',
          postedBy: admin.userId,
          createdAt: clock.now(),
          updatedAt: clock.now(),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/job-board/openings')
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('SWE');
    });

    it('admin sees all openings including closed', async () => {
      await database.db.insert(jobOpenings).values([
        {
          title: 'SWE',
          description: 'Open role',
          status: 'OPEN',
          postedBy: admin.userId,
          createdAt: clock.now(),
          updatedAt: clock.now(),
        },
        {
          title: 'Closed role',
          description: 'Not open',
          status: 'CLOSED',
          postedBy: admin.userId,
          createdAt: clock.now(),
          updatedAt: clock.now(),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/job-board/openings')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(res.body).toHaveLength(2);
    });
  });

  describe('applications — privacy enforcement', () => {
    let openingId: string;

    beforeEach(async () => {
      const [opening] = await database.db
        .insert(jobOpenings)
        .values({
          title: 'Backend Developer',
          description: 'Join us',
          status: 'OPEN',
          postedBy: admin.userId,
          createdAt: clock.now(),
          updatedAt: clock.now(),
        })
        .returning();
      openingId = opening.openingId;
    });

    it('student with published portfolio can apply', async () => {
      const res = await request(app.getHttpServer())
        .post(`/job-board/openings/${openingId}/apply`)
        .set(...authHeader(app, student))
        .send({ portfolioId })
        .expect(201);

      expect(res.body.studentId).toBe(student.userId);
      expect(res.body.status).toBe('NEW');
    });

    it('student cannot apply with someone else\'s portfolio — adversarial check', async () => {
      const [otherPortfolio] = await database.db
        .insert(portfolios)
        .values({
          userId: anotherStudent.userId,
          handle: `other-${anotherStudent.userId.slice(0, 8)}`,
          isPublished: true,
          createdAt: clock.now(),
          updatedAt: clock.now(),
        })
        .returning();

      await request(app.getHttpServer())
        .post(`/job-board/openings/${openingId}/apply`)
        .set(...authHeader(app, student))
        .send({ portfolioId: otherPortfolio.portfolioId })
        .expect(404);
    });

    it('unpublished portfolio is rejected when applying — adversarial check', async () => {
      const unpublishedOwner = await createUser(database, 'LEARNER');
      const [unpublished] = await database.db
        .insert(portfolios)
        .values({
          userId: unpublishedOwner.userId,
          handle: `unpub-${unpublishedOwner.userId.slice(0, 8)}`,
          isPublished: false,
          createdAt: clock.now(),
          updatedAt: clock.now(),
        })
        .returning();

      await request(app.getHttpServer())
        .post(`/job-board/openings/${openingId}/apply`)
        .set(...authHeader(app, unpublishedOwner))
        .send({ portfolioId: unpublished.portfolioId })
        .expect(403);
    });

    it('student cannot see another student\'s applications — adversarial check', async () => {
      await database.db.insert(jobApplications).values([
        {
          openingId,
          studentId: student.userId,
          portfolioId,
          status: 'NEW',
          appliedAt: clock.now(),
          updatedAt: clock.now(),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/job-board/applications')
        .set(...authHeader(app, anotherStudent))
        .expect(200);

      expect(res.body).toHaveLength(0);
    });

    it('student sees only their own applications', async () => {
      const [anotherPortfolio] = await database.db
        .insert(portfolios)
        .values({
          userId: anotherStudent.userId,
          handle: `other2-${anotherStudent.userId.slice(0, 8)}`,
          isPublished: true,
          createdAt: clock.now(),
          updatedAt: clock.now(),
        })
        .returning();

      await database.db.insert(jobApplications).values([
        {
          openingId,
          studentId: student.userId,
          portfolioId,
          status: 'NEW',
          appliedAt: clock.now(),
          updatedAt: clock.now(),
        },
        {
          openingId,
          studentId: anotherStudent.userId,
          portfolioId: anotherPortfolio.portfolioId,
          status: 'NEW',
          appliedAt: clock.now(),
          updatedAt: clock.now(),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/job-board/applications')
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].studentId).toBe(student.userId);
    });

    it('admin sees all applications', async () => {
      const [anotherPortfolio] = await database.db
        .insert(portfolios)
        .values({
          userId: anotherStudent.userId,
          handle: `other3-${anotherStudent.userId.slice(0, 8)}`,
          isPublished: true,
          createdAt: clock.now(),
          updatedAt: clock.now(),
        })
        .returning();

      await database.db.insert(jobApplications).values([
        {
          openingId,
          studentId: student.userId,
          portfolioId,
          status: 'NEW',
          appliedAt: clock.now(),
          updatedAt: clock.now(),
        },
        {
          openingId,
          studentId: anotherStudent.userId,
          portfolioId: anotherPortfolio.portfolioId,
          status: 'NEW',
          appliedAt: clock.now(),
          updatedAt: clock.now(),
        },
      ]);

      const res = await request(app.getHttpServer())
        .get('/job-board/applications')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(res.body).toHaveLength(2);
    });

    it('admin can update application status', async () => {
      const [application] = await database.db
        .insert(jobApplications)
        .values({
          openingId,
          studentId: student.userId,
          portfolioId,
          status: 'NEW',
          appliedAt: clock.now(),
          updatedAt: clock.now(),
        })
        .returning();

      const res = await request(app.getHttpServer())
        .patch(`/job-board/applications/${application.applicationId}`)
        .set(...authHeader(app, admin))
        .send({ status: 'REVIEWED' })
        .expect(200);

      expect(res.body.status).toBe('REVIEWED');
    });

    it('unpublished portfolio is not reachable through job board portfolio endpoint — adversarial check', async () => {
      const unpublishedOwner = await createUser(database, 'LEARNER');
      const [unpublished] = await database.db
        .insert(portfolios)
        .values({
          userId: unpublishedOwner.userId,
          handle: `unp2-${unpublishedOwner.userId.slice(0, 8)}`,
          isPublished: false,
          createdAt: clock.now(),
          updatedAt: clock.now(),
        })
        .returning();

      const [application] = await database.db
        .insert(jobApplications)
        .values({
          openingId,
          studentId: unpublishedOwner.userId,
          portfolioId: unpublished.portfolioId,
          status: 'NEW',
          appliedAt: clock.now(),
          updatedAt: clock.now(),
        })
        .returning();

      await request(app.getHttpServer())
        .get(`/job-board/applications/${application.applicationId}/portfolio`)
        .set(...authHeader(app, admin))
        .expect(404);
    });
  });
});
