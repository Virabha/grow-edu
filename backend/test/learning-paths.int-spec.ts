import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import {
  createUser,
  createBatch,
  enrol,
} from './support/factories';

describe('learning paths', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let learner: TestActor;
  let stranger: TestActor;

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
    learner = await createUser(database, 'LEARNER');
    stranger = await createUser(database, 'LEARNER');
  });

  function post(path: string, actor: TestActor, body?: object) {
    return request(app.getHttpServer())
      .post(path)
      .set(...authHeader(app, actor))
      .send(body ?? {});
  }

  function get(path: string, actor: TestActor) {
    return request(app.getHttpServer())
      .get(path)
      .set(...authHeader(app, actor));
  }

  function patch(path: string, actor: TestActor, body?: object) {
    return request(app.getHttpServer())
      .patch(path)
      .set(...authHeader(app, actor))
      .send(body ?? {});
  }

  function put(path: string, actor: TestActor, body?: object) {
    return request(app.getHttpServer())
      .put(path)
      .set(...authHeader(app, actor))
      .send(body ?? {});
  }

  function del(path: string, actor: TestActor) {
    return request(app.getHttpServer())
      .delete(path)
      .set(...authHeader(app, actor));
  }

  async function createPath(overrides?: { title?: string; slug?: string }) {
    const { body } = await post('/paths', admin, {
      title: overrides?.title ?? `Path ${randomUUID().slice(0, 8)}`,
      slug: overrides?.slug ?? `path-${randomUUID().slice(0, 8)}`,
    }).expect(201);
    return body as { pathId: string; title: string; slug: string; status: string };
  }

  async function addStage(pathId: string, opts: {
    ordinal: number;
    kind: string;
    title?: string;
    batchId?: string;
    problemSetId?: string;
    projectId?: string;
  }) {
    const { body } = await post(`/paths/${pathId}/stages`, admin, {
      ordinal: opts.ordinal,
      kind: opts.kind,
      title: opts.title ?? `Stage ${opts.ordinal}`,
      ...(opts.batchId && { batchId: opts.batchId }),
      ...(opts.problemSetId && { problemSetId: opts.problemSetId }),
      ...(opts.projectId && { projectId: opts.projectId }),
    }).expect(201);
    return body as { stageId: string; pathId: string; ordinal: number; kind: string; batchId: string | null };
  }

  async function addPrerequisite(pathId: string, stageId: string, requiredStageId: string) {
    return post(`/paths/${pathId}/stages/${stageId}/prerequisites`, admin, { requiredStageId }).expect(201);
  }

  async function enrollInPath(pathId: string, userId: string) {
    return post(`/paths/${pathId}/enrolments`, admin, { userId }).expect(201);
  }

  describe('ticket 26 — path and stage CRUD', () => {
    it('admin creates a path with ordered stages', async () => {
      const path = await createPath({ title: 'Full-Stack Path', slug: 'full-stack' });
      expect(path.pathId).toBeDefined();
      expect(path.status).toBe('DRAFT');

      const batchId = await createBatch(database, admin.userId);
      const stage = await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId });
      expect(stage.stageId).toBeDefined();
      expect(stage.pathId).toBe(path.pathId);
      expect(stage.ordinal).toBe(1);
      expect(stage.kind).toBe('BATCH');
      expect(stage.batchId).toBe(batchId);
    });

    it('a learner can list paths', async () => {
      await createPath({ slug: 'path-a' });
      await createPath({ slug: 'path-b' });
      const { body } = await get('/paths', learner).expect(200);
      expect(body).toHaveLength(2);
    });

    it('a learner can get a path by id', async () => {
      const path = await createPath();
      const { body } = await get(`/paths/${path.pathId}`, learner).expect(200);
      expect(body.pathId).toBe(path.pathId);
    });

    it('returns 404 for a missing path', async () => {
      await get(`/paths/${randomUUID()}`, learner).expect(404);
    });

    it('admin can update a path', async () => {
      const path = await createPath({ slug: 'original' });
      const { body } = await patch(`/paths/${path.pathId}`, admin, { title: 'Updated Title', status: 'ONGOING' }).expect(200);
      expect(body.title).toBe('Updated Title');
      expect(body.status).toBe('ONGOING');
    });

    it('a path never appears in batch listings', async () => {
      await createPath();
      const { body } = await get('/paths', learner).expect(200);
      expect(body[0]).not.toHaveProperty('batchId');
      expect(body[0]).toHaveProperty('pathId');
    });

    it('stages are returned in ordinal order', async () => {
      const path = await createPath();
      const b1 = await createBatch(database, admin.userId);
      const b2 = await createBatch(database, admin.userId);
      const b3 = await createBatch(database, admin.userId);

      await addStage(path.pathId, { ordinal: 2, kind: 'BATCH', batchId: b2 });
      await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId: b1 });
      await addStage(path.pathId, { ordinal: 3, kind: 'BATCH', batchId: b3 });

      const { body } = await get(`/paths/${path.pathId}/stages`, learner).expect(200);
      expect(body.map((s: { ordinal: number }) => s.ordinal)).toEqual([1, 2, 3]);
    });

    it('reordering stages is stable', async () => {
      const path = await createPath();
      const b1 = await createBatch(database, admin.userId);
      const b2 = await createBatch(database, admin.userId);
      const s1 = await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId: b1 });
      const s2 = await addStage(path.pathId, { ordinal: 2, kind: 'BATCH', batchId: b2 });

      const { body } = await put(`/paths/${path.pathId}/stages/reorder`, admin, {
        stages: [
          { stageId: s1.stageId, ordinal: 2 },
          { stageId: s2.stageId, ordinal: 1 },
        ],
      }).expect(200);

      expect(body[0].stageId).toBe(s2.stageId);
      expect(body[1].stageId).toBe(s1.stageId);
    });

    it('a stage references existing content by id and never copies it', async () => {
      const path = await createPath();
      const batchId = await createBatch(database, admin.userId);
      const stage = await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId });

      expect(stage.batchId).toBe(batchId);
    });

    it('soft-deleting a stage hides it from listing', async () => {
      const path = await createPath();
      const batchId = await createBatch(database, admin.userId);
      const stage = await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId });

      await del(`/paths/${path.pathId}/stages/${stage.stageId}`, admin).expect(200);

      const { body } = await get(`/paths/${path.pathId}/stages`, learner).expect(200);
      expect(body).toHaveLength(0);
    });
  });

  describe('ticket 27 — stage prerequisites', () => {
    it('a stage can declare a prerequisite', async () => {
      const path = await createPath();
      const b1 = await createBatch(database, admin.userId);
      const b2 = await createBatch(database, admin.userId);
      const s1 = await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId: b1 });
      const s2 = await addStage(path.pathId, { ordinal: 2, kind: 'BATCH', batchId: b2 });

      const { body } = await addPrerequisite(path.pathId, s2.stageId, s1.stageId);
      expect(body.stageId).toBe(s2.stageId);
      expect(body.requiredStageId).toBe(s1.stageId);
    });

    it('prerequisite cycle (A requires B while B requires A) is refused', async () => {
      const path = await createPath();
      const b1 = await createBatch(database, admin.userId);
      const b2 = await createBatch(database, admin.userId);
      const s1 = await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId: b1 });
      const s2 = await addStage(path.pathId, { ordinal: 2, kind: 'BATCH', batchId: b2 });

      await addPrerequisite(path.pathId, s2.stageId, s1.stageId);
      const { body } = await post(`/paths/${path.pathId}/stages/${s1.stageId}/prerequisites`, admin, {
        requiredStageId: s2.stageId,
      }).expect(400);
      expect(body.code).toBe('PREREQUISITE_CYCLE');
    });

    it('a stage cannot require itself', async () => {
      const path = await createPath();
      const batchId = await createBatch(database, admin.userId);
      const s1 = await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId });

      const { body } = await post(`/paths/${path.pathId}/stages/${s1.stageId}/prerequisites`, admin, {
        requiredStageId: s1.stageId,
      }).expect(400);
      expect(body.code).toBe('PREREQUISITE_CYCLE');
    });

    it('transitive cycle detection works (A→B→C and then C→A is refused)', async () => {
      const path = await createPath();
      const b1 = await createBatch(database, admin.userId);
      const b2 = await createBatch(database, admin.userId);
      const b3 = await createBatch(database, admin.userId);
      const s1 = await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId: b1 });
      const s2 = await addStage(path.pathId, { ordinal: 2, kind: 'BATCH', batchId: b2 });
      const s3 = await addStage(path.pathId, { ordinal: 3, kind: 'BATCH', batchId: b3 });

      await addPrerequisite(path.pathId, s2.stageId, s1.stageId);
      await addPrerequisite(path.pathId, s3.stageId, s2.stageId);

      const { body } = await post(`/paths/${path.pathId}/stages/${s1.stageId}/prerequisites`, admin, {
        requiredStageId: s3.stageId,
      }).expect(400);
      expect(body.code).toBe('PREREQUISITE_CYCLE');
    });

    it('a stage is LOCKED on enrolment when it has prerequisites', async () => {
      const path = await createPath();
      const b1 = await createBatch(database, admin.userId);
      const b2 = await createBatch(database, admin.userId);
      const s1 = await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId: b1 });
      const s2 = await addStage(path.pathId, { ordinal: 2, kind: 'BATCH', batchId: b2 });
      await addPrerequisite(path.pathId, s2.stageId, s1.stageId);

      await enrollInPath(path.pathId, learner.userId);

      const { body } = await get(`/paths/${path.pathId}/my-progress`, learner).expect(200);
      const s1Progress = body.find((p: { stageId: string }) => p.stageId === s1.stageId);
      const s2Progress = body.find((p: { stageId: string }) => p.stageId === s2.stageId);
      expect(s1Progress.state).toBe('OPEN');
      expect(s2Progress.state).toBe('LOCKED');
    });

    it('completing a prerequisite opens the dependent stage immediately', async () => {
      const path = await createPath();
      const b1 = await createBatch(database, admin.userId);
      const b2 = await createBatch(database, admin.userId);
      const s1 = await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId: b1 });
      const s2 = await addStage(path.pathId, { ordinal: 2, kind: 'BATCH', batchId: b2 });
      await addPrerequisite(path.pathId, s2.stageId, s1.stageId);

      await enrollInPath(path.pathId, learner.userId);

      await post(`/paths/${path.pathId}/stages/${s1.stageId}/complete`, learner).expect(201);

      const { body } = await get(`/paths/${path.pathId}/my-progress`, learner).expect(200);
      const s2Progress = body.find((p: { stageId: string }) => p.stageId === s2.stageId);
      expect(s2Progress.state).toBe('OPEN');
    });

    it('a student cannot complete a locked stage', async () => {
      const path = await createPath();
      const b1 = await createBatch(database, admin.userId);
      const b2 = await createBatch(database, admin.userId);
      const s1 = await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId: b1 });
      const s2 = await addStage(path.pathId, { ordinal: 2, kind: 'BATCH', batchId: b2 });
      await addPrerequisite(path.pathId, s2.stageId, s1.stageId);

      await enrollInPath(path.pathId, learner.userId);

      const { body } = await post(`/paths/${path.pathId}/stages/${s2.stageId}/complete`, learner).expect(403);
      expect(body.code).toBe('STAGE_LOCKED');
    });

    it('stage unreachable until prerequisite complete — evaluated through single access module (BATCH stage)', async () => {
      const path = await createPath();
      const batchA = await createBatch(database, admin.userId);
      const batchB = await createBatch(database, admin.userId);
      const s1 = await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId: batchA });
      const s2 = await addStage(path.pathId, { ordinal: 2, kind: 'BATCH', batchId: batchB });
      await addPrerequisite(path.pathId, s2.stageId, s1.stageId);

      await enrollInPath(path.pathId, learner.userId);

      await get(`/batches/${batchB}/sessions`, learner).expect(404);

      await post(`/paths/${path.pathId}/stages/${s1.stageId}/complete`, learner).expect(201);

      await get(`/batches/${batchB}/sessions`, learner).expect(200);
    });
  });

  describe('ticket 28 — path enrolment', () => {
    it('enrolling in a path grants access to batch stages via access module', async () => {
      const path = await createPath();
      const batchId = await createBatch(database, admin.userId);
      await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId });

      await get(`/batches/${batchId}/sessions`, learner).expect(404);

      await enrollInPath(path.pathId, learner.userId);

      await get(`/batches/${batchId}/sessions`, learner).expect(200);
    });

    it('a stranger not enrolled in the path cannot access batch stages', async () => {
      const path = await createPath();
      const batchId = await createBatch(database, admin.userId);
      await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId });

      await enrollInPath(path.pathId, learner.userId);

      await get(`/batches/${batchId}/sessions`, stranger).expect(404);
    });

    it('revoking path enrolment withdraws the access it granted', async () => {
      const path = await createPath();
      const batchId = await createBatch(database, admin.userId);
      await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId });

      await enrollInPath(path.pathId, learner.userId);
      await get(`/batches/${batchId}/sessions`, learner).expect(200);

      await del(`/paths/${path.pathId}/enrolments/${learner.userId}`, admin).expect(200);

      await get(`/batches/${batchId}/sessions`, learner).expect(404);
    });

    it('direct batch enrolment is unaffected when path enrolment is revoked', async () => {
      const path = await createPath();
      const batchId = await createBatch(database, admin.userId);
      await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId });

      await enrol(database, batchId, learner.userId);
      await enrollInPath(path.pathId, learner.userId);

      await get(`/batches/${batchId}/sessions`, learner).expect(200);

      await del(`/paths/${path.pathId}/enrolments/${learner.userId}`, admin).expect(200);

      await get(`/batches/${batchId}/sessions`, learner).expect(200);
    });

    it('admin lists enrolled students', async () => {
      const path = await createPath();
      await enrollInPath(path.pathId, learner.userId);

      const { body } = await get(`/paths/${path.pathId}/enrolments`, admin).expect(200);
      expect(body).toHaveLength(1);
      expect(body[0].userId).toBe(learner.userId);
    });

    it('a student can see their own enrolled paths', async () => {
      const path1 = await createPath({ slug: 'path-one' });
      const path2 = await createPath({ slug: 'path-two' });

      await enrollInPath(path1.pathId, learner.userId);
      await enrollInPath(path2.pathId, learner.userId);

      const { body } = await get('/paths/mine', learner).expect(200);
      const pathIds = body.map((e: { pathId: string }) => e.pathId);
      expect(pathIds).toContain(path1.pathId);
      expect(pathIds).toContain(path2.pathId);
    });

    it('double enrolment is rejected', async () => {
      const path = await createPath();
      await enrollInPath(path.pathId, learner.userId);
      const { body } = await post(`/paths/${path.pathId}/enrolments`, admin, { userId: learner.userId }).expect(409);
      expect(body.code).toBe('ALREADY_ENROLLED');
    });

    it('path enrolment does not grant access to batches not in its stages', async () => {
      const path = await createPath();
      const batchInPath = await createBatch(database, admin.userId);
      const batchNotInPath = await createBatch(database, admin.userId);
      await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId: batchInPath });

      await enrollInPath(path.pathId, learner.userId);

      await get(`/batches/${batchInPath}/sessions`, learner).expect(200);
      await get(`/batches/${batchNotInPath}/sessions`, learner).expect(404);
    });
  });

  describe('ticket 31 — path progress', () => {
    it('staff can see all students progress for a path', async () => {
      const path = await createPath();
      const batchId = await createBatch(database, admin.userId);
      await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId });

      const learner2 = await createUser(database, 'LEARNER');

      await enrollInPath(path.pathId, learner.userId);
      await enrollInPath(path.pathId, learner2.userId);

      const { body } = await get(`/paths/${path.pathId}/students`, admin).expect(200);

      const userIds = new Set(body.map((p: { userId: string }) => p.userId));
      expect(userIds.has(learner.userId)).toBe(true);
      expect(userIds.has(learner2.userId)).toBe(true);
    });

    it('a student is refused the staff progress view', async () => {
      const path = await createPath();
      await enrollInPath(path.pathId, learner.userId);

      await get(`/paths/${path.pathId}/students`, learner).expect(403);
    });

    it('a student sees only their own progress', async () => {
      const path = await createPath();
      const batchId = await createBatch(database, admin.userId);
      await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId });

      const learner2 = await createUser(database, 'LEARNER');
      await enrollInPath(path.pathId, learner.userId);
      await enrollInPath(path.pathId, learner2.userId);

      const { body } = await get(`/paths/${path.pathId}/my-progress`, learner).expect(200);
      const userIds = new Set(body.map((p: { userId: string }) => p.userId));
      expect(userIds.has(learner.userId)).toBe(true);
      expect(userIds.has(learner2.userId)).toBe(false);
    });

    it('progress timestamps are driven by the injected clock', async () => {
      clock.set('2027-03-01T10:00:00.000Z');

      const path = await createPath();
      const batchId = await createBatch(database, admin.userId);
      const stage = await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId });

      await enrollInPath(path.pathId, learner.userId);

      const { body } = await get(`/paths/${path.pathId}/my-progress`, learner).expect(200);
      const progress = body.find((p: { stageId: string }) => p.stageId === stage.stageId);
      expect(new Date(progress.openedAt).toISOString()).toBe('2027-03-01T10:00:00.000Z');
    });

    it('stalled students are identifiable: updatedAt reflects last progress event', async () => {
      clock.set('2027-03-01T10:00:00.000Z');

      const path = await createPath();
      const b1 = await createBatch(database, admin.userId);
      const b2 = await createBatch(database, admin.userId);
      const s1 = await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId: b1 });
      await addStage(path.pathId, { ordinal: 2, kind: 'BATCH', batchId: b2 });

      await enrollInPath(path.pathId, learner.userId);

      clock.advance(7 * 24 * 60 * 60 * 1000);

      await post(`/paths/${path.pathId}/stages/${s1.stageId}/complete`, learner).expect(201);

      const { body } = await get(`/paths/${path.pathId}/students`, admin).expect(200);

      const s1Row = body.find(
        (p: { stageId: string; userId: string }) =>
          p.stageId === s1.stageId && p.userId === learner.userId,
      );
      expect(s1Row.state).toBe('COMPLETE');
      expect(new Date(s1Row.completedAt).toISOString()).toBe('2027-03-08T10:00:00.000Z');
    });

    it('a non-enrolled student cannot view their own progress', async () => {
      const path = await createPath();
      await get(`/paths/${path.pathId}/my-progress`, stranger).expect(404);
    });

    it('progress survives re-enrolment after revocation', async () => {
      const path = await createPath();
      const batchId = await createBatch(database, admin.userId);
      const stage = await addStage(path.pathId, { ordinal: 1, kind: 'BATCH', batchId });

      await enrollInPath(path.pathId, learner.userId);
      await post(`/paths/${path.pathId}/stages/${stage.stageId}/complete`, learner).expect(201);
      await del(`/paths/${path.pathId}/enrolments/${learner.userId}`, admin).expect(200);

      await post(`/paths/${path.pathId}/enrolments`, admin, { userId: learner.userId }).expect(201);

      const { body } = await get(`/paths/${path.pathId}/my-progress`, learner).expect(200);
      const progress = body.find((p: { stageId: string }) => p.stageId === stage.stageId);
      expect(progress.state).toBe('OPEN');
    });
  });
});
