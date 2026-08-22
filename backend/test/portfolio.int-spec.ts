import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import {
  portfolios,
  portfolioItems,
  projects,
  projectMilestoneProgress,
  skills,
  skillDemonstrations,
  batchCertificates,
} from '../src/database/schema';

describe('Portfolio (Tickets 32 and 33)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let student: TestActor;
  let otherStudent: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    app = await createTestApp(database, clock);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    student = await createUser(database, 'LEARNER');
    otherStudent = await createUser(database, 'LEARNER');
  });

  function upsertPortfolio(
    actor: TestActor,
    handle: string,
    overrides: Record<string, string> = {},
  ) {
    return request(app.getHttpServer())
      .put('/portfolio/me')
      .set(...authHeader(app, actor))
      .send({ handle, displayName: 'Alice Dev', headline: 'Software Engineer', ...overrides });
  }

  function publishPortfolio(actor: TestActor) {
    return request(app.getHttpServer())
      .put('/portfolio/me/publish')
      .set(...authHeader(app, actor));
  }

  async function seedProject(createdBy: string): Promise<string> {
    const projectId = randomUUID();
    await database.db.insert(projects).values({
      projectId,
      title: 'Test Project',
      rubricId: randomUUID(),
      createdBy,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    return projectId;
  }

  async function seedPassedMilestone(projectId: string, userId: string): Promise<string> {
    const milestoneId = randomUUID();
    await database.db.insert(projectMilestoneProgress).values({
      projectId,
      milestoneId,
      userId,
      state: 'PASSED',
      passedAt: clock.now(),
      updatedAt: clock.now(),
    });
    return milestoneId;
  }

  async function seedSkill(createdBy: string): Promise<string> {
    const skillId = randomUUID();
    await database.db.insert(skills).values({
      skillId,
      key: `skill-${randomUUID().slice(0, 8)}`,
      label: 'TypeScript',
      createdBy,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    return skillId;
  }

  async function seedDemonstratedSkill(skillId: string, userId: string): Promise<void> {
    await database.db.insert(skillDemonstrations).values({
      userId,
      skillId,
      completedItems: 3,
      demonstratedAt: clock.now(),
      updatedAt: clock.now(),
    });
  }

  async function seedBatchCertificate(
    userId: string,
  ): Promise<{ certificateId: string; verificationCode: string }> {
    const certificateId = randomUUID();
    const verificationCode = randomUUID().replace(/-/g, '');
    await database.db.insert(batchCertificates).values({
      certificateId,
      batchId: randomUUID(),
      userId,
      certificateNumber: `CERT-${randomUUID().slice(0, 8)}`,
      verificationCode,
      issuedAt: clock.now(),
    });
    return { certificateId, verificationCode };
  }

  async function getPortfolioId(userId: string): Promise<string> {
    const [row] = await database.db
      .select({ portfolioId: portfolios.portfolioId })
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .limit(1);
    return row.portfolioId;
  }

  describe('portfolio management', () => {
    it('creates a portfolio profile via PUT /portfolio/me', async () => {
      await upsertPortfolio(student, 'alice-dev').expect(200);
    });

    it('upserts the profile on subsequent PUT calls', async () => {
      await upsertPortfolio(student, 'alice-dev').expect(200);
      await upsertPortfolio(student, 'alice-dev', { headline: 'Updated headline' }).expect(200);
    });

    it('rejects an invalid handle with non-allowed characters', async () => {
      await request(app.getHttpServer())
        .put('/portfolio/me')
        .set(...authHeader(app, student))
        .send({ handle: 'Invalid Handle!' })
        .expect(400);
    });

    it('rejects an unauthenticated PUT', async () => {
      await request(app.getHttpServer())
        .put('/portfolio/me')
        .send({ handle: 'hacker' })
        .expect(401);
    });

    it('publishes and unpublishes portfolio', async () => {
      await upsertPortfolio(student, 'alice-dev').expect(200);
      await publishPortfolio(student).expect(200);

      await request(app.getHttpServer())
        .delete('/portfolio/me/publish')
        .set(...authHeader(app, student))
        .expect(200);
    });
  });

  describe('public profile accessibility', () => {
    it('is readable without signing in when published', async () => {
      await upsertPortfolio(student, 'alice-dev').expect(200);
      await publishPortfolio(student).expect(200);

      const res = await request(app.getHttpServer())
        .get('/portfolio/alice-dev')
        .expect(200);

      expect(res.body.handle).toBe('alice-dev');
      expect(res.body.displayName).toBe('Alice Dev');
      expect(res.body.items).toEqual([]);
    });

    it('returns 404 for an unknown handle revealing nothing about existence', async () => {
      await request(app.getHttpServer())
        .get('/portfolio/no-such-handle')
        .expect(404);
    });

    it('returns 404 when portfolio exists but is not published', async () => {
      await upsertPortfolio(student, 'unpublished-dev').expect(200);

      await request(app.getHttpServer())
        .get('/portfolio/unpublished-dev')
        .expect(404);
    });

    it('exposes only handle, displayName, headline, bio and items — never userId, portfolioId, isPublished or email', async () => {
      await upsertPortfolio(student, 'alice-dev').expect(200);
      await publishPortfolio(student).expect(200);

      const res = await request(app.getHttpServer())
        .get('/portfolio/alice-dev')
        .expect(200);

      const body = res.body;
      expect(body.handle).toBeDefined();
      expect(body.displayName).toBeDefined();
      expect(body.items).toBeDefined();

      expect(body.userId).toBeUndefined();
      expect(body.portfolioId).toBeUndefined();
      expect(body.isPublished).toBeUndefined();
      expect(body.createdAt).toBeUndefined();
      expect(body.updatedAt).toBeUndefined();
      expect(body.email).toBeUndefined();
    });
  });

  describe('project items', () => {
    it('publishes a project item when the student has a passed milestone', async () => {
      const admin = await createUser(database, 'PLATFORM_ADMIN');
      const projectId = await seedProject(admin.userId);
      await seedPassedMilestone(projectId, student.userId);

      await upsertPortfolio(student, 'alice-dev').expect(200);
      await publishPortfolio(student).expect(200);

      await request(app.getHttpServer())
        .post('/portfolio/me/items')
        .set(...authHeader(app, student))
        .send({ kind: 'PROJECT', referenceId: projectId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/portfolio/alice-dev')
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].kind).toBe('PROJECT');
      expect(res.body.items[0].snapshot.projectId).toBe(projectId);
      expect(res.body.items[0].snapshot.title).toBe('Test Project');
      expect(res.body.items[0].snapshot.completedMilestones).toBe(1);
    });

    it('rejects publishing a project when the student has no passed milestones', async () => {
      const admin = await createUser(database, 'PLATFORM_ADMIN');
      const projectId = await seedProject(admin.userId);

      await upsertPortfolio(student, 'alice-dev').expect(200);

      await request(app.getHttpServer())
        .post('/portfolio/me/items')
        .set(...authHeader(app, student))
        .send({ kind: 'PROJECT', referenceId: projectId })
        .expect(403);
    });

    it('rejects publishing a project milestone passed by another user', async () => {
      const admin = await createUser(database, 'PLATFORM_ADMIN');
      const projectId = await seedProject(admin.userId);
      await seedPassedMilestone(projectId, otherStudent.userId);

      await upsertPortfolio(student, 'alice-dev').expect(200);

      await request(app.getHttpServer())
        .post('/portfolio/me/items')
        .set(...authHeader(app, student))
        .send({ kind: 'PROJECT', referenceId: projectId })
        .expect(403);
    });

    it('snapshot does not change when the underlying project title changes after publishing', async () => {
      const admin = await createUser(database, 'PLATFORM_ADMIN');
      const projectId = await seedProject(admin.userId);
      await seedPassedMilestone(projectId, student.userId);

      await upsertPortfolio(student, 'alice-dev').expect(200);
      await publishPortfolio(student).expect(200);

      await request(app.getHttpServer())
        .post('/portfolio/me/items')
        .set(...authHeader(app, student))
        .send({ kind: 'PROJECT', referenceId: projectId })
        .expect(201);

      await database.db
        .update(projects)
        .set({ title: 'Changed Title', updatedAt: clock.now() })
        .where(eq(projects.projectId, projectId));

      const res = await request(app.getHttpServer())
        .get('/portfolio/alice-dev')
        .expect(200);

      expect(res.body.items[0].snapshot.title).toBe('Test Project');
    });
  });

  describe('skill items', () => {
    it('publishes a demonstrated skill and exposes it publicly', async () => {
      const admin = await createUser(database, 'PLATFORM_ADMIN');
      const skillId = await seedSkill(admin.userId);
      await seedDemonstratedSkill(skillId, student.userId);

      await upsertPortfolio(student, 'alice-dev').expect(200);
      await publishPortfolio(student).expect(200);

      await request(app.getHttpServer())
        .post('/portfolio/me/items')
        .set(...authHeader(app, student))
        .send({ kind: 'SKILL', referenceId: skillId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/portfolio/alice-dev')
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].kind).toBe('SKILL');
      expect(res.body.items[0].snapshot.skillId).toBe(skillId);
      expect(res.body.items[0].snapshot.label).toBe('TypeScript');
      expect(res.body.items[0].snapshot.demonstratedAt).toBeDefined();
    });

    it('rejects publishing a skill not yet demonstrated by the student', async () => {
      const admin = await createUser(database, 'PLATFORM_ADMIN');
      const skillId = await seedSkill(admin.userId);

      await upsertPortfolio(student, 'alice-dev').expect(200);

      await request(app.getHttpServer())
        .post('/portfolio/me/items')
        .set(...authHeader(app, student))
        .send({ kind: 'SKILL', referenceId: skillId })
        .expect(403);
    });

    it('rejects publishing a skill demonstrated by a different user', async () => {
      const admin = await createUser(database, 'PLATFORM_ADMIN');
      const skillId = await seedSkill(admin.userId);
      await seedDemonstratedSkill(skillId, otherStudent.userId);

      await upsertPortfolio(student, 'alice-dev').expect(200);

      await request(app.getHttpServer())
        .post('/portfolio/me/items')
        .set(...authHeader(app, student))
        .send({ kind: 'SKILL', referenceId: skillId })
        .expect(403);
    });
  });

  describe('certificate items', () => {
    it('publishes a batch certificate with a verifyUrl linking to the verification endpoint', async () => {
      const { certificateId, verificationCode } = await seedBatchCertificate(student.userId);

      await upsertPortfolio(student, 'alice-dev').expect(200);
      await publishPortfolio(student).expect(200);

      await request(app.getHttpServer())
        .post('/portfolio/me/items')
        .set(...authHeader(app, student))
        .send({ kind: 'CERTIFICATE', referenceId: certificateId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/portfolio/alice-dev')
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      const item = res.body.items[0];
      expect(item.kind).toBe('CERTIFICATE');
      expect(item.snapshot.certificateKind).toBe('BATCH');
      expect(item.snapshot.verificationCode).toBe(verificationCode);
      expect(item.snapshot.verifyUrl).toBe(`/verify/certificates/${verificationCode}`);
      expect(item.snapshot.isValid).toBeUndefined();
    });

    it('rejects publishing a certificate that belongs to another user', async () => {
      const { certificateId } = await seedBatchCertificate(otherStudent.userId);

      await upsertPortfolio(student, 'alice-dev').expect(200);

      await request(app.getHttpServer())
        .post('/portfolio/me/items')
        .set(...authHeader(app, student))
        .send({ kind: 'CERTIFICATE', referenceId: certificateId })
        .expect(403);
    });
  });

  describe('unpublishing items', () => {
    it('removes an item from the public profile immediately on DELETE', async () => {
      const admin = await createUser(database, 'PLATFORM_ADMIN');
      const projectId = await seedProject(admin.userId);
      await seedPassedMilestone(projectId, student.userId);

      await upsertPortfolio(student, 'alice-dev').expect(200);
      await publishPortfolio(student).expect(200);

      const publishRes = await request(app.getHttpServer())
        .post('/portfolio/me/items')
        .set(...authHeader(app, student))
        .send({ kind: 'PROJECT', referenceId: projectId })
        .expect(201);

      const { itemId } = publishRes.body;

      const before = await request(app.getHttpServer())
        .get('/portfolio/alice-dev')
        .expect(200);
      expect(before.body.items).toHaveLength(1);

      await request(app.getHttpServer())
        .delete(`/portfolio/me/items/${itemId}`)
        .set(...authHeader(app, student))
        .expect(200);

      const after = await request(app.getHttpServer())
        .get('/portfolio/alice-dev')
        .expect(200);
      expect(after.body.items).toHaveLength(0);
    });

    it('rejects deletion of an item belonging to another user', async () => {
      const admin = await createUser(database, 'PLATFORM_ADMIN');
      const projectId = await seedProject(admin.userId);
      await seedPassedMilestone(projectId, otherStudent.userId);

      await upsertPortfolio(otherStudent, 'other-dev').expect(200);
      const publishRes = await request(app.getHttpServer())
        .post('/portfolio/me/items')
        .set(...authHeader(app, otherStudent))
        .send({ kind: 'PROJECT', referenceId: projectId })
        .expect(201);

      const { itemId } = publishRes.body;

      await upsertPortfolio(student, 'alice-dev').expect(200);

      await request(app.getHttpServer())
        .delete(`/portfolio/me/items/${itemId}`)
        .set(...authHeader(app, student))
        .expect(403);
    });
  });

  describe('disclosure limits', () => {
    it('unpublished items do not appear in the public profile even when the portfolio is published', async () => {
      const admin = await createUser(database, 'PLATFORM_ADMIN');
      const projectId = await seedProject(admin.userId);
      await seedPassedMilestone(projectId, student.userId);

      await upsertPortfolio(student, 'alice-dev').expect(200);
      await publishPortfolio(student).expect(200);

      const res = await request(app.getHttpServer())
        .get('/portfolio/alice-dev')
        .expect(200);

      expect(res.body.items).toHaveLength(0);
    });

    it('directly inserted portfolio item is visible once portfolio is published', async () => {
      await upsertPortfolio(student, 'alice-dev').expect(200);
      await publishPortfolio(student).expect(200);

      const portfolioId = await getPortfolioId(student.userId);

      await database.db.insert(portfolioItems).values({
        portfolioId,
        userId: student.userId,
        kind: 'PROJECT',
        referenceId: randomUUID(),
        snapshot: { projectId: randomUUID(), title: 'Direct Insert Project', completedMilestones: 1 },
        publishedAt: clock.now(),
        updatedAt: clock.now(),
      });

      const res = await request(app.getHttpServer())
        .get('/portfolio/alice-dev')
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].snapshot.title).toBe('Direct Insert Project');
    });

    it('public profile does not expose email, userId, batch rosters, grades or reviewer feedback', async () => {
      const admin = await createUser(database, 'PLATFORM_ADMIN');
      const projectId = await seedProject(admin.userId);
      await seedPassedMilestone(projectId, student.userId);

      await upsertPortfolio(student, 'alice-dev').expect(200);
      await publishPortfolio(student).expect(200);

      await request(app.getHttpServer())
        .post('/portfolio/me/items')
        .set(...authHeader(app, student))
        .send({ kind: 'PROJECT', referenceId: projectId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/portfolio/alice-dev')
        .expect(200);

      const body = res.body;
      expect(body.email).toBeUndefined();
      expect(body.userId).toBeUndefined();

      const item = body.items[0];
      expect(item.snapshot.reviewerFeedback).toBeUndefined();
      expect(item.snapshot.rubricScores).toBeUndefined();
      expect(item.snapshot.grade).toBeUndefined();
      expect(item.snapshot.similarityScore).toBeUndefined();
      expect(item.snapshot.reviewedBy).toBeUndefined();
      expect(item.snapshot.batchRoster).toBeUndefined();
    });

    it('unpublishing the portfolio hides all items from unauthenticated access', async () => {
      const admin = await createUser(database, 'PLATFORM_ADMIN');
      const projectId = await seedProject(admin.userId);
      await seedPassedMilestone(projectId, student.userId);

      await upsertPortfolio(student, 'alice-dev').expect(200);
      await publishPortfolio(student).expect(200);

      await request(app.getHttpServer())
        .post('/portfolio/me/items')
        .set(...authHeader(app, student))
        .send({ kind: 'PROJECT', referenceId: projectId })
        .expect(201);

      const before = await request(app.getHttpServer())
        .get('/portfolio/alice-dev')
        .expect(200);
      expect(before.body.items).toHaveLength(1);

      await request(app.getHttpServer())
        .delete('/portfolio/me/publish')
        .set(...authHeader(app, student))
        .expect(200);

      await request(app.getHttpServer())
        .get('/portfolio/alice-dev')
        .expect(404);
    });
  });
});
