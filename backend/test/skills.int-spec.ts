import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import {
  codingRuns,
  skillDemonstrations,
  skillTags,
  skills,
} from '../src/database/schema';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { SKILL_DEMONSTRATION_SWEEP_JOB } from '../src/skills/skill-demonstration-sweep.service';

describe('skills taxonomy and demonstration', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let queue: InlineJobQueue;
  let admin: TestActor;
  let student: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    app = await createTestApp(database, clock);
    queue = app.get<InlineJobQueue>(JOB_QUEUE);
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
  });

  async function runSweep() {
    await queue.enqueue(SKILL_DEMONSTRATION_SWEEP_JOB, undefined);
  }

  async function createSkill(
    key: string,
    requiredItems = 1,
  ): Promise<{ skillId: string }> {
    const res = await request(app.getHttpServer())
      .post('/skills')
      .set(...authHeader(app, admin))
      .send({ key, label: `Skill: ${key}`, requiredItems })
      .expect(201);
    return { skillId: res.body.skillId };
  }

  async function tagProblem(skillId: string, problemId: string) {
    return request(app.getHttpServer())
      .post(`/skills/${skillId}/tags`)
      .set(...authHeader(app, admin))
      .send({ subjectKind: 'PROBLEM', subjectId: problemId })
      .expect(201);
  }

  async function insertAcceptedRun(userId: string, problemId: string): Promise<string> {
    const runId = randomUUID();
    await database.db.insert(codingRuns).values({
      runId,
      problemId,
      userId,
      kind: 'JUDGE_SUBMISSION' as never,
      language: 'python',
      sourceCode: 'pass',
      status: 'COMPLETE' as never,
      verdict: 'ACCEPTED' as never,
      queuedAt: clock.now(),
      completedAt: clock.now(),
    });
    return runId;
  }

  async function getDemonstration(userId: string, skillId: string) {
    const [row] = await database.db
      .select()
      .from(skillDemonstrations)
      .where(
        and(
          eq(skillDemonstrations.userId, userId),
          eq(skillDemonstrations.skillId, skillId),
        ),
      );
    return row ?? null;
  }

  describe('owner-managed taxonomy', () => {
    it('admin can create a skill', async () => {
      const res = await request(app.getHttpServer())
        .post('/skills')
        .set(...authHeader(app, admin))
        .send({ key: 'algo.bfs', label: 'BFS', requiredItems: 2 })
        .expect(201);

      expect(res.body.skillId).toBeDefined();
      expect(res.body.key).toBe('algo.bfs');
      expect(res.body.requiredItems).toBe(2);
    });

    it('rejects duplicate skill key', async () => {
      await createSkill('algo.dfs');
      await request(app.getHttpServer())
        .post('/skills')
        .set(...authHeader(app, admin))
        .send({ key: 'algo.dfs', label: 'DFS again' })
        .expect(409);
    });

    it('admin can list skills', async () => {
      await createSkill('algo.bfs');
      await createSkill('algo.dfs');

      const res = await request(app.getHttpServer())
        .get('/skills')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('admin can update a skill', async () => {
      const { skillId } = await createSkill('algo.sort', 1);

      const res = await request(app.getHttpServer())
        .patch(`/skills/${skillId}`)
        .set(...authHeader(app, admin))
        .send({ requiredItems: 3, isRetired: true })
        .expect(200);

      expect(res.body.requiredItems).toBe(3);
      expect(res.body.isRetired).toBe(true);
    });

    it('learner cannot create a skill', async () => {
      await request(app.getHttpServer())
        .post('/skills')
        .set(...authHeader(app, student))
        .send({ key: 'algo.bfs', label: 'BFS' })
        .expect(403);
    });

    it('admin can tag a problem with a skill', async () => {
      const { skillId } = await createSkill('algo.bfs');
      const problemId = randomUUID();

      const res = await tagProblem(skillId, problemId);
      expect(res.body).toBeTruthy();

      const tags = await database.db
        .select()
        .from(skillTags)
        .where(eq(skillTags.skillId, skillId));
      expect(tags).toHaveLength(1);
      expect(tags[0].subjectKind).toBe('PROBLEM');
      expect(tags[0].subjectId).toBe(problemId);
    });

    it('admin can remove a tag', async () => {
      const { skillId } = await createSkill('algo.dfs');
      const problemId = randomUUID();
      await tagProblem(skillId, problemId);

      const [tag] = await database.db
        .select()
        .from(skillTags)
        .where(eq(skillTags.skillId, skillId));

      await request(app.getHttpServer())
        .delete(`/skills/${skillId}/tags/${tag.skillTagId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      const remaining = await database.db
        .select()
        .from(skillTags)
        .where(eq(skillTags.skillId, skillId));
      expect(remaining).toHaveLength(0);
    });

    it('tagging the same item twice is idempotent', async () => {
      const { skillId } = await createSkill('algo.bfs');
      const problemId = randomUUID();

      await tagProblem(skillId, problemId);
      await tagProblem(skillId, problemId);

      const tags = await database.db
        .select()
        .from(skillTags)
        .where(eq(skillTags.skillId, skillId));
      expect(tags).toHaveLength(1);
    });
  });

  describe('skill demonstration — threshold enforcement', () => {
    it('no items completed → no demonstration record created', async () => {
      const { skillId } = await createSkill('algo.bfs', 1);
      const problemId = randomUUID();
      await tagProblem(skillId, problemId);

      await runSweep();

      const demo = await getDemonstration(student.userId, skillId);
      expect(demo).toBeNull();
    });

    it('completing one item when threshold is 1 credits the skill', async () => {
      const { skillId } = await createSkill('algo.bfs', 1);
      const problemId = randomUUID();
      await tagProblem(skillId, problemId);

      await insertAcceptedRun(student.userId, problemId);
      await runSweep();

      const demo = await getDemonstration(student.userId, skillId);
      expect(demo).not.toBeNull();
      expect(demo?.completedItems).toBe(1);
      expect(demo?.demonstratedAt).not.toBeNull();
    });

    it('skill is credited only at its defined threshold, never before — with requiredItems=3', async () => {
      const { skillId } = await createSkill('algo.graphs', 3);
      const problemA = randomUUID();
      const problemB = randomUUID();
      const problemC = randomUUID();
      await tagProblem(skillId, problemA);
      await tagProblem(skillId, problemB);
      await tagProblem(skillId, problemC);

      await insertAcceptedRun(student.userId, problemA);
      await insertAcceptedRun(student.userId, problemB);
      await runSweep();

      const demoBeforeThreshold = await getDemonstration(student.userId, skillId);
      expect(demoBeforeThreshold?.completedItems).toBe(2);
      expect(demoBeforeThreshold?.demonstratedAt).toBeNull();

      await insertAcceptedRun(student.userId, problemC);
      await runSweep();

      const demoAfterThreshold = await getDemonstration(student.userId, skillId);
      expect(demoAfterThreshold?.completedItems).toBe(3);
      expect(demoAfterThreshold?.demonstratedAt).not.toBeNull();
    });

    it('multiple accepted runs for the same problem count as one', async () => {
      const { skillId } = await createSkill('algo.bfs', 2);
      const problemA = randomUUID();
      const problemB = randomUUID();
      await tagProblem(skillId, problemA);
      await tagProblem(skillId, problemB);

      await insertAcceptedRun(student.userId, problemA);
      await insertAcceptedRun(student.userId, problemA);
      await runSweep();

      const demo = await getDemonstration(student.userId, skillId);
      expect(demo?.completedItems).toBe(1);
      expect(demo?.demonstratedAt).toBeNull();
    });

    it('losing access to an item does not retract a skill already demonstrated', async () => {
      const { skillId } = await createSkill('algo.bfs', 1);
      const problemId = randomUUID();
      await tagProblem(skillId, problemId);

      const runId = await insertAcceptedRun(student.userId, problemId);
      await runSweep();

      const demoBefore = await getDemonstration(student.userId, skillId);
      expect(demoBefore?.demonstratedAt).not.toBeNull();

      await database.db
        .delete(codingRuns)
        .where(eq(codingRuns.runId, runId));

      await runSweep();

      const demoAfter = await getDemonstration(student.userId, skillId);
      expect(demoAfter?.demonstratedAt).not.toBeNull();
    });

    it('sweep is idempotent — running twice does not duplicate or clear demonstrations', async () => {
      const { skillId } = await createSkill('algo.bfs', 1);
      const problemId = randomUUID();
      await tagProblem(skillId, problemId);
      await insertAcceptedRun(student.userId, problemId);

      await runSweep();
      await runSweep();

      const demos = await database.db
        .select()
        .from(skillDemonstrations)
        .where(
          and(
            eq(skillDemonstrations.userId, student.userId),
            eq(skillDemonstrations.skillId, skillId),
          ),
        );
      expect(demos).toHaveLength(1);
      expect(demos[0].demonstratedAt).not.toBeNull();
    });

    it('retired skill is not swept', async () => {
      const { skillId } = await createSkill('algo.old', 1);
      const problemId = randomUUID();
      await tagProblem(skillId, problemId);
      await insertAcceptedRun(student.userId, problemId);

      await request(app.getHttpServer())
        .patch(`/skills/${skillId}`)
        .set(...authHeader(app, admin))
        .send({ isRetired: true })
        .expect(200);

      await runSweep();

      const demo = await getDemonstration(student.userId, skillId);
      expect(demo).toBeNull();
    });
  });

  describe('student views their own demonstrations', () => {
    it('returns all non-retired skills with completion info', async () => {
      const { skillId } = await createSkill('algo.bfs', 1);
      const problemId = randomUUID();
      await tagProblem(skillId, problemId);
      await insertAcceptedRun(student.userId, problemId);
      await runSweep();

      const res = await request(app.getHttpServer())
        .get('/skills/my-demonstrations')
        .set(...authHeader(app, student))
        .expect(200);

      const entry = res.body.find(
        (d: Record<string, unknown>) => d.skillId === skillId,
      );
      expect(entry).toBeDefined();
      expect(entry.demonstrated).toBe(true);
      expect(entry.completedItems).toBe(1);
    });

    it('shows un-started skills with completedItems=0', async () => {
      const { skillId } = await createSkill('algo.notdone', 1);
      await tagProblem(skillId, randomUUID());

      const res = await request(app.getHttpServer())
        .get('/skills/my-demonstrations')
        .set(...authHeader(app, student))
        .expect(200);

      const entry = res.body.find(
        (d: Record<string, unknown>) => d.skillId === skillId,
      );
      expect(entry).toBeDefined();
      expect(entry.demonstrated).toBe(false);
      expect(entry.completedItems).toBe(0);
    });

    it('learner cannot list or create skills', async () => {
      await request(app.getHttpServer())
        .get('/skills')
        .set(...authHeader(app, student))
        .expect(403);

      await request(app.getHttpServer())
        .post('/skills')
        .set(...authHeader(app, student))
        .send({ key: 'x', label: 'y' })
        .expect(403);
    });

    it('unauthenticated cannot see demonstrations', async () => {
      await request(app.getHttpServer())
        .get('/skills/my-demonstrations')
        .expect(401);
    });
  });

  describe('skill tags with STAGE kind', () => {
    it('completing a stage credits the skill when threshold is met', async () => {
      const { pathStageProgress, pathStages, learningPaths, pathEnrolments } =
        await import('../src/database/schema');

      const pathId = randomUUID();
      const now = clock.now();
      await database.db.insert(learningPaths).values({
        pathId,
        title: 'Test Path',
        slug: `path-${randomUUID().slice(0, 8)}`,
        createdBy: admin.userId,
        createdAt: now,
        updatedAt: now,
      });

      const stageId = randomUUID();
      await database.db.insert(pathStages).values({
        stageId,
        pathId,
        ordinal: 1,
        kind: 'BATCH' as never,
        title: 'Stage 1',
        isCapstone: false,
        createdAt: now,
        updatedAt: now,
      });

      await database.db.insert(pathEnrolments).values({
        pathId,
        userId: student.userId,
        enrolledAt: now,
      });

      const { skillId } = await createSkill('path.stage', 1);
      await request(app.getHttpServer())
        .post(`/skills/${skillId}/tags`)
        .set(...authHeader(app, admin))
        .send({ subjectKind: 'STAGE', subjectId: stageId })
        .expect(201);

      await database.db.insert(pathStageProgress).values({
        pathId,
        stageId,
        userId: student.userId,
        state: 'COMPLETE' as never,
        completedAt: now,
        updatedAt: now,
      });

      await runSweep();

      const demo = await getDemonstration(student.userId, skillId);
      expect(demo?.demonstratedAt).not.toBeNull();
    });
  });
});
