import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { and, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';

import {
  ENVIRONMENT_PROVIDER,
  EnvironmentProvider,
  ProvisionedEnvironment,
} from '../src/environments/environment-provider';
import {
  ENVIRONMENTS_HIBERNATE_JOB,
  ENVIRONMENTS_RECLAIM_JOB,
} from '../src/environments/environments.service';
import { ENVIRONMENTS_SETTINGS_GROUP } from '../src/settings/settings.definitions';
import { SettingsService } from '../src/settings/settings.service';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import {
  devEnvironments,
  devEnvironmentUsage,
  pathStages,
  pathEnrolments,
  learningPaths,
  projects,
} from '../src/database/schema';

async function insertPath(
  db: TestDatabase['db'],
  createdBy: string,
): Promise<string> {
  const pathId = randomUUID();
  const now = new Date();
  await db.insert(learningPaths).values({
    pathId,
    title: `path-${pathId.slice(0, 8)}`,
    slug: `path-${pathId.slice(0, 8)}`,
    status: 'ONGOING',
    createdBy,
    createdAt: now,
    updatedAt: now,
  });
  return pathId;
}

async function insertProject(
  db: TestDatabase['db'],
  createdBy: string,
): Promise<string> {
  const projectId = randomUUID();
  const now = new Date();
  await db.insert(projects).values({
    projectId,
    title: `proj-${projectId.slice(0, 8)}`,
    rubricId: randomUUID(),
    createdBy,
    createdAt: now,
    updatedAt: now,
  });
  return projectId;
}

async function insertProjectStage(
  db: TestDatabase['db'],
  pathId: string,
  projectId: string,
  ordinal = 1,
): Promise<string> {
  const stageId = randomUUID();
  const now = new Date();
  await db.insert(pathStages).values({
    stageId,
    pathId,
    ordinal,
    kind: 'PROJECT',
    title: `stage-${stageId.slice(0, 8)}`,
    projectId,
    createdAt: now,
    updatedAt: now,
  });
  return stageId;
}

async function insertBatchStage(
  db: TestDatabase['db'],
  pathId: string,
  ordinal = 2,
): Promise<string> {
  const stageId = randomUUID();
  const now = new Date();
  await db.insert(pathStages).values({
    stageId,
    pathId,
    ordinal,
    kind: 'BATCH',
    title: `batch-stage-${stageId.slice(0, 8)}`,
    createdAt: now,
    updatedAt: now,
  });
  return stageId;
}

async function insertEnrolment(
  db: TestDatabase['db'],
  pathId: string,
  userId: string,
  status: 'ACTIVE' | 'COMPLETED' | 'REVOKED' = 'ACTIVE',
): Promise<void> {
  const now = new Date();
  await db.insert(pathEnrolments).values({
    pathId,
    userId,
    status,
    enrolledAt: now,
  });
}

let provCounter = 0;

function makeFakeProvider(): jest.Mocked<EnvironmentProvider> {
  return {
    provision: jest.fn().mockImplementation(
      async (): Promise<ProvisionedEnvironment> => {
        provCounter += 1;
        return {
          providerRef: `prov-ref-${provCounter}`,
          workspaceRef: `ws-ref-${provCounter}`,
        };
      },
    ),
    hibernate: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    reclaim: jest.fn().mockResolvedValue(undefined),
  };
}

describe('cloud development environments (tickets 14–18)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let fakeProvider: jest.Mocked<EnvironmentProvider>;

  let admin: TestActor;
  let student: TestActor;
  let pathId: string;
  let projectId: string;
  let stageId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    fakeProvider = makeFakeProvider();
    app = await createTestApp(database, clock, [
      { token: ENVIRONMENT_PROVIDER, value: fakeProvider },
    ]);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    provCounter = 0;

    fakeProvider.provision.mockClear();
    fakeProvider.provision.mockImplementation(async () => ({
      providerRef: `prov-ref-${++provCounter}`,
      workspaceRef: `ws-ref-${provCounter}`,
    }));
    fakeProvider.hibernate.mockClear();
    fakeProvider.hibernate.mockResolvedValue(undefined);
    fakeProvider.resume.mockClear();
    fakeProvider.resume.mockResolvedValue(undefined);
    fakeProvider.reclaim.mockClear();
    fakeProvider.reclaim.mockResolvedValue(undefined);

    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    pathId = await insertPath(database.db, admin.userId);
    projectId = await insertProject(database.db, admin.userId);
    stageId = await insertProjectStage(database.db, pathId, projectId);
    await insertEnrolment(database.db, pathId, student.userId);
  });

  describe('ticket 14 — provisioning port', () => {
    it('provisions an environment through the injected provider', async () => {
      const res = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      expect(res.body.environmentId).toBeDefined();
      expect(res.body.status).toBe('RUNNING');
      expect(fakeProvider.provision).toHaveBeenCalledTimes(1);

      const call = fakeProvider.provision.mock.calls[0][0];
      expect(call.userId).toBe(student.userId);
      expect(call.projectId).toBe(projectId);
    });

    it('refuses to provision against a BATCH stage (not a PROJECT stage)', async () => {
      const batchStageId = await insertBatchStage(database.db, pathId);
      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId: batchStageId })
        .expect(422);

      expect(fakeProvider.provision).not.toHaveBeenCalled();
    });

    it('refuses to provision against a stage that does not exist', async () => {
      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId: randomUUID() })
        .expect(422);
    });

    it('refuses when the student has no active path enrolment', async () => {
      const other = await createUser(database, 'LEARNER');
      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, other))
        .send({ stageId })
        .expect(403);
    });

    it('refuses when the enrolment is REVOKED', async () => {
      const other = await createUser(database, 'LEARNER');
      await insertEnrolment(database.db, pathId, other.userId, 'REVOKED');
      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, other))
        .send({ stageId })
        .expect(403);
    });

    it('records FAILED status when provider throws, leaving a coherent record', async () => {
      fakeProvider.provision.mockRejectedValueOnce(
        new Error('provider down'),
      );

      const res = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const [row] = await database.db
        .select()
        .from(devEnvironments)
        .where(eq(devEnvironments.environmentId, res.body.environmentId));

      expect(row).toBeDefined();
      expect(row.status).toBe('FAILED');
      expect(row.failureReason).toContain('provider down');
    });
  });

  describe('ticket 15 — persistence', () => {
    it('reconnecting returns the same environment (same workspaceRef)', async () => {
      const first = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const second = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      expect(second.body.environmentId).toBe(first.body.environmentId);
      expect(second.body.workspaceRef).toBe(first.body.workspaceRef);
      expect(fakeProvider.provision).toHaveBeenCalledTimes(1);
    });

    it('workspace survives hibernation and is restored on resume', async () => {
      const first = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const originalWorkspaceRef = first.body.workspaceRef as string;

      await request(app.getHttpServer())
        .post(`/environments/${first.body.environmentId as string}/hibernate`)
        .set(...authHeader(app, student))
        .expect(200);

      const resumed = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      expect(resumed.body.workspaceRef).toBe(originalWorkspaceRef);
      expect(fakeProvider.resume).toHaveBeenCalledTimes(1);
    });

    it('a student can only reach their own environment', async () => {
      const first = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const other = await createUser(database, 'LEARNER');
      await insertEnrolment(database.db, pathId, other.userId);

      await request(app.getHttpServer())
        .get(`/environments/${first.body.environmentId as string}`)
        .set(...authHeader(app, other))
        .expect(403);
    });

    it('GET /environments/:id returns the environment for the owner', async () => {
      const created = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const got = await request(app.getHttpServer())
        .get(`/environments/${created.body.environmentId as string}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(got.body.environmentId).toBe(created.body.environmentId);
      expect(got.body.status).toBe('RUNNING');
    });

    it('one environment per student per stage — no duplicate rows', async () => {
      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const all = await database.db
        .select()
        .from(devEnvironments)
        .where(
          and(
            eq(devEnvironments.userId, student.userId),
            eq(devEnvironments.stageId, stageId),
          ),
        );

      expect(all).toHaveLength(1);
    });
  });

  describe('ticket 16 — idle hibernation and dormancy reclamation', () => {
    it('idle environment hibernates after the configured period', async () => {
      const created = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const queue = app.get<InlineJobQueue>(JOB_QUEUE);

      clock.advance(31 * 60 * 1000);
      await queue.enqueue(ENVIRONMENTS_HIBERNATE_JOB, undefined);

      const [row] = await database.db
        .select({ status: devEnvironments.status })
        .from(devEnvironments)
        .where(
          eq(devEnvironments.environmentId, created.body.environmentId as string),
        );

      expect(row.status).toBe('HIBERNATED');
      expect(fakeProvider.hibernate).toHaveBeenCalledTimes(1);
    });

    it('environment is NOT hibernated before the idle period expires', async () => {
      const created = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const queue = app.get<InlineJobQueue>(JOB_QUEUE);

      clock.advance(20 * 60 * 1000);
      await queue.enqueue(ENVIRONMENTS_HIBERNATE_JOB, undefined);

      const [row] = await database.db
        .select({ status: devEnvironments.status })
        .from(devEnvironments)
        .where(
          eq(devEnvironments.environmentId, created.body.environmentId as string),
        );

      expect(row.status).toBe('RUNNING');
      expect(fakeProvider.hibernate).not.toHaveBeenCalled();
    });

    it('dormant environment is reclaimed after the configured period', async () => {
      const created = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const queue = app.get<InlineJobQueue>(JOB_QUEUE);

      clock.advance(31 * 60 * 1000);
      await queue.enqueue(ENVIRONMENTS_HIBERNATE_JOB, undefined);

      const [afterHibernate] = await database.db
        .select({ status: devEnvironments.status })
        .from(devEnvironments)
        .where(
          eq(devEnvironments.environmentId, created.body.environmentId as string),
        );
      expect(afterHibernate.status).toBe('HIBERNATED');

      clock.advance(169 * 60 * 60 * 1000);
      await queue.enqueue(ENVIRONMENTS_RECLAIM_JOB, undefined);

      const [afterReclaim] = await database.db
        .select({
          status: devEnvironments.status,
          workspaceRef: devEnvironments.workspaceRef,
          reclaimedAt: devEnvironments.reclaimedAt,
        })
        .from(devEnvironments)
        .where(
          eq(devEnvironments.environmentId, created.body.environmentId as string),
        );

      expect(afterReclaim.status).toBe('RECLAIMED');
      expect(afterReclaim.workspaceRef).toBeTruthy();
      expect(afterReclaim.reclaimedAt).toBeDefined();
      expect(fakeProvider.reclaim).toHaveBeenCalledTimes(1);
    });

    it('reclamation preserves workspaceRef and a later request restores from it', async () => {
      const created = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const originalWorkspaceRef = created.body.workspaceRef as string;
      const queue = app.get<InlineJobQueue>(JOB_QUEUE);

      clock.advance(31 * 60 * 1000);
      await queue.enqueue(ENVIRONMENTS_HIBERNATE_JOB, undefined);
      clock.advance(169 * 60 * 60 * 1000);
      await queue.enqueue(ENVIRONMENTS_RECLAIM_JOB, undefined);

      const [reclaimed] = await database.db
        .select({
          status: devEnvironments.status,
          workspaceRef: devEnvironments.workspaceRef,
        })
        .from(devEnvironments)
        .where(
          eq(devEnvironments.environmentId, created.body.environmentId as string),
        );

      expect(reclaimed.status).toBe('RECLAIMED');
      expect(reclaimed.workspaceRef).toBe(originalWorkspaceRef);

      const restored = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      expect(restored.body.workspaceRef).toBeTruthy();

      const lastCall =
        fakeProvider.provision.mock.calls[
          fakeProvider.provision.mock.calls.length - 1
        ][0];
      expect(lastCall.workspaceRef).toBe(originalWorkspaceRef);
    });

    it('heartbeat resets the idle timer', async () => {
      const created = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const queue = app.get<InlineJobQueue>(JOB_QUEUE);

      clock.advance(20 * 60 * 1000);

      await request(app.getHttpServer())
        .post(
          `/environments/${created.body.environmentId as string}/heartbeat`,
        )
        .set(...authHeader(app, student))
        .expect(200);

      clock.advance(15 * 60 * 1000);
      await queue.enqueue(ENVIRONMENTS_HIBERNATE_JOB, undefined);

      const [row] = await database.db
        .select({ status: devEnvironments.status })
        .from(devEnvironments)
        .where(
          eq(devEnvironments.environmentId, created.body.environmentId as string),
        );

      expect(row.status).toBe('RUNNING');
      expect(fakeProvider.hibernate).not.toHaveBeenCalled();
    });

    it('activity (POST /environments) on a RUNNING environment resets the idle timer', async () => {
      const created = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const queue = app.get<InlineJobQueue>(JOB_QUEUE);

      clock.advance(20 * 60 * 1000);

      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      clock.advance(15 * 60 * 1000);
      await queue.enqueue(ENVIRONMENTS_HIBERNATE_JOB, undefined);

      const [row] = await database.db
        .select({ status: devEnvironments.status })
        .from(devEnvironments)
        .where(
          eq(devEnvironments.environmentId, created.body.environmentId as string),
        );

      expect(row.status).toBe('RUNNING');
    });
  });

  describe('ticket 17 — concurrency ceilings and usage metering', () => {
    it('blocks a second concurrent environment when ceiling is 1 (the default)', async () => {
      const projectId2 = await insertProject(database.db, admin.userId);
      const stageId2 = await insertProjectStage(
        database.db,
        pathId,
        projectId2,
        2,
      );

      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId: stageId2 })
        .expect(409);
    });

    it('concurrency ceiling is owner-managed — raising to 2 allows two, third is refused', async () => {
      await request(app.getHttpServer())
        .put('/settings/environments')
        .set(...authHeader(app, admin))
        .send({ maxConcurrentPerStudent: 2 })
        .expect(200);

      const projectId2 = await insertProject(database.db, admin.userId);
      const stageId2 = await insertProjectStage(database.db, pathId, projectId2, 2);

      const projectId3 = await insertProject(database.db, admin.userId);
      const stageId3 = await insertProjectStage(database.db, pathId, projectId3, 3);

      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId: stageId2 })
        .expect(201);

      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId: stageId3 })
        .expect(409);

      await request(app.getHttpServer())
        .put('/settings/environments')
        .set(...authHeader(app, admin))
        .send({ maxConcurrentPerStudent: 1 })
        .expect(200);

      const restrictedStudent = await createUser(database, 'LEARNER');
      await insertEnrolment(database.db, pathId, restrictedStudent.userId);

      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, restrictedStudent))
        .send({ stageId })
        .expect(201);

      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, restrictedStudent))
        .send({ stageId: stageId2 })
        .expect(409);
    });

    it('allows a second environment after the first is manually hibernated', async () => {
      const projectId2 = await insertProject(database.db, admin.userId);
      const stageId2 = await insertProjectStage(
        database.db,
        pathId,
        projectId2,
        2,
      );

      const first = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      await request(app.getHttpServer())
        .post(
          `/environments/${first.body.environmentId as string}/hibernate`,
        )
        .set(...authHeader(app, student))
        .expect(200);

      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId: stageId2 })
        .expect(201);
    });

    it('passes cpuLimit and memoryLimitMb to the provider', async () => {
      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const call = fakeProvider.provision.mock.calls[0][0];
      expect(typeof call.cpuLimit).toBe('number');
      expect(call.cpuLimit).toBeGreaterThan(0);
      expect(typeof call.memoryLimitMb).toBe('number');
      expect(call.memoryLimitMb).toBeGreaterThan(0);
    });

    it('records resource ceilings on the environment row', async () => {
      const res = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const [row] = await database.db
        .select({
          cpuLimit: devEnvironments.cpuLimit,
          memoryLimitMb: devEnvironments.memoryLimitMb,
        })
        .from(devEnvironments)
        .where(
          eq(devEnvironments.environmentId, res.body.environmentId as string),
        );

      expect(row.cpuLimit).toBeGreaterThan(0);
      expect(row.memoryLimitMb).toBeGreaterThan(0);
    });

    it('opens a usage row when environment starts RUNNING', async () => {
      const res = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const usageRows = await database.db
        .select()
        .from(devEnvironmentUsage)
        .where(
          and(
            eq(devEnvironmentUsage.environmentId, res.body.environmentId as string),
            isNull(devEnvironmentUsage.endedAt),
          ),
        );

      expect(usageRows).toHaveLength(1);
      expect(usageRows[0].userId).toBe(student.userId);
    });

    it('closes the usage row on manual hibernate', async () => {
      const res = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      clock.advance(5 * 60 * 1000);

      await request(app.getHttpServer())
        .post(
          `/environments/${res.body.environmentId as string}/hibernate`,
        )
        .set(...authHeader(app, student))
        .expect(200);

      const usageRows = await database.db
        .select()
        .from(devEnvironmentUsage)
        .where(
          eq(devEnvironmentUsage.environmentId, res.body.environmentId as string),
        );

      expect(usageRows).toHaveLength(1);
      expect(usageRows[0].endedAt).toBeTruthy();
      expect(usageRows[0].runningSeconds).toBeGreaterThan(0);
    });

    it('GET /environments/me/usage returns total running seconds for the student', async () => {
      const res = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      clock.advance(10 * 60 * 1000);

      await request(app.getHttpServer())
        .post(`/environments/${res.body.environmentId as string}/hibernate`)
        .set(...authHeader(app, student))
        .expect(200);

      const usage = await request(app.getHttpServer())
        .get('/environments/me/usage')
        .set(...authHeader(app, student))
        .expect(200);

      expect(usage.body.totalRunningSeconds).toBeGreaterThanOrEqual(600);
    });
  });

  describe('ticket 18 — controlled network egress', () => {
    it('passes the egress policy from settings to the provider', async () => {
      await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const call = fakeProvider.provision.mock.calls[0][0];
      expect(Array.isArray(call.egressPolicy)).toBe(true);
      expect(call.egressPolicy.length).toBeGreaterThan(0);
    });

    it('records the egress policy on the environment row for audit', async () => {
      const res = await request(app.getHttpServer())
        .post('/environments')
        .set(...authHeader(app, student))
        .send({ stageId })
        .expect(201);

      const [row] = await database.db
        .select({ egressPolicy: devEnvironments.egressPolicy })
        .from(devEnvironments)
        .where(
          eq(devEnvironments.environmentId, res.body.environmentId as string),
        );

      expect(Array.isArray(row.egressPolicy)).toBe(true);
      expect(row.egressPolicy.length).toBeGreaterThan(0);
    });
  });
});

describe('empty egress policy is refused (ticket 18)', () => {
  let database2: TestDatabase;
  let app2: INestApplication;
  const clock2 = new TestClock();
  let fakeProvider2: jest.Mocked<EnvironmentProvider>;

  let admin2: TestActor;
  let student2: TestActor;
  let pathId2: string;
  let projectId2: string;
  let stageId2: string;

  const fakeSettingsEmptyEgress = {
    getGroup: jest.fn().mockImplementation(async (group: string) => {
      if (group === ENVIRONMENTS_SETTINGS_GROUP) {
        return {
          group,
          meta: {},
          fields: [],
          values: {
            maxConcurrentPerStudent: 1,
            idleHibernateMinutes: 30,
            dormantReclaimHours: 168,
            cpuLimit: 2,
            memoryLimitMb: 4096,
            egressAllowList: '',
          },
        };
      }
      return { group, meta: {}, fields: [], values: {} };
    }),
    putGroup: jest.fn(),
  };

  beforeAll(async () => {
    database2 = await createTestDatabase();
    fakeProvider2 = {
      provision: jest.fn(),
      hibernate: jest.fn(),
      resume: jest.fn(),
      reclaim: jest.fn(),
    };
    app2 = await createTestApp(database2, clock2, [
      { token: ENVIRONMENT_PROVIDER, value: fakeProvider2 },
      { token: SettingsService, value: fakeSettingsEmptyEgress },
    ]);
  });

  afterAll(async () => {
    if (app2) await app2.close();
    if (database2) await database2.destroy();
  });

  beforeEach(async () => {
    clock2.reset();
    await truncateAll(database2);

    admin2 = await createUser(database2, 'PLATFORM_ADMIN');
    student2 = await createUser(database2, 'LEARNER');

    const now = new Date();
    pathId2 = randomUUID();
    await database2.db.insert(learningPaths).values({
      pathId: pathId2,
      title: `path2-${pathId2.slice(0, 8)}`,
      slug: `path2-${pathId2.slice(0, 8)}`,
      status: 'ONGOING',
      createdBy: admin2.userId,
      createdAt: now,
      updatedAt: now,
    });

    projectId2 = randomUUID();
    await database2.db.insert(projects).values({
      projectId: projectId2,
      title: `proj2-${projectId2.slice(0, 8)}`,
      rubricId: randomUUID(),
      createdBy: admin2.userId,
      createdAt: now,
      updatedAt: now,
    });

    stageId2 = randomUUID();
    await database2.db.insert(pathStages).values({
      stageId: stageId2,
      pathId: pathId2,
      ordinal: 1,
      kind: 'PROJECT',
      title: `stage2-${stageId2.slice(0, 8)}`,
      projectId: projectId2,
      createdAt: now,
      updatedAt: now,
    });

    await database2.db.insert(pathEnrolments).values({
      pathId: pathId2,
      userId: student2.userId,
      status: 'ACTIVE',
      enrolledAt: now,
    });
  });

  it('refuses to provision when egress policy is empty', async () => {
    await request(app2.getHttpServer())
      .post('/environments')
      .set(...authHeader(app2, student2))
      .send({ stageId: stageId2 })
      .expect(422);

    expect(fakeProvider2.provision).not.toHaveBeenCalled();
  });
});
