import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { eq, inArray } from 'drizzle-orm';
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
  createSubject,
  createLesson,
  enrol,
} from './support/factories';
import {
  batchAttendance,
  batchCertificates,
  batchDoubts,
  batchEnrollments,
  batchQuizAttempts,
  batchQuizzes,
  batchResources,
  batchSessions,
} from '../src/database/schema';

describe('clone batch', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let learner: TestActor;
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
    clock.reset();
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    learner = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId);
  });

  function cloneReq(id: string, actor: TestActor, body: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post(`/batches/${id}/clone`)
      .set(...authHeader(app, actor))
      .send(body);
  }

  it('returns 404 for a missing batch', async () => {
    await cloneReq(randomUUID(), admin).expect(404);
  });

  it('returns 403 when a learner attempts to clone', async () => {
    await cloneReq(batchId, learner).expect(403);
  });

  async function contentOf(id: string) {
    const { body } = await request(app.getHttpServer())
      .get(`/batches/${id}/content`)
      .set(...authHeader(app, admin))
      .expect(200);
    return body as {
      subjectId: string;
      lessons: { lessonId: string; title: string; order: number }[];
    }[];
  }

  it('clones a batch into DRAFT with subjects and lessons copied', async () => {
    const subjectId = await createSubject(database, batchId);
    await createLesson(database, subjectId, { title: 'Kinematics', order: 1 });
    await createLesson(database, subjectId, { title: 'Dynamics', order: 2 });

    const { body } = await cloneReq(batchId, admin).expect(201);

    expect(body.batchId).not.toBe(batchId);
    expect(body.status).toBe('DRAFT');
    expect(body.slug).not.toBe('');

    const content = await contentOf(body.batchId);

    expect(content).toHaveLength(1);
    expect(content[0].subjectId).not.toBe(subjectId);
    expect(content[0].lessons.map((l) => l.title).sort()).toEqual([
      'Dynamics',
      'Kinematics',
    ]);
  });

  it('corrects a shared lesson in every batch that uses it', async () => {
    const subjectId = await createSubject(database, batchId);
    const lessonId = await createLesson(database, subjectId, {
      title: 'Kinematics',
      order: 1,
    });

    const { body: clone } = await cloneReq(batchId, admin).expect(201);

    expect((await contentOf(clone.batchId))[0].lessons[0].lessonId).toBe(
      lessonId,
    );

    await request(app.getHttpServer())
      .patch(`/batches/${batchId}/lessons/${lessonId}`)
      .set(...authHeader(app, admin))
      .send({ title: 'Kinematics, corrected' })
      .expect(200);

    expect((await contentOf(batchId))[0].lessons[0].title).toBe(
      'Kinematics, corrected',
    );
    expect((await contentOf(clone.batchId))[0].lessons[0].title).toBe(
      'Kinematics, corrected',
    );
  });

  it('removes a shared lesson from one batch without removing it from the other', async () => {
    const subjectId = await createSubject(database, batchId);
    const lessonId = await createLesson(database, subjectId, {
      title: 'Kinematics',
      order: 1,
    });

    const { body: clone } = await cloneReq(batchId, admin).expect(201);

    await request(app.getHttpServer())
      .delete(`/batches/${clone.batchId}/lessons/${lessonId}`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect((await contentOf(clone.batchId))[0].lessons).toEqual([]);
    expect((await contentOf(batchId))[0].lessons.map((l) => l.title)).toEqual([
      'Kinematics',
    ]);
  });

  it('copies sessions and resources but not student data', async () => {
    const subjectId = await createSubject(database, batchId);
    const sessionId = randomUUID();
    await database.db.insert(batchSessions).values({
      sessionId,
      batchId,
      subjectId,
      title: 'Live session 1',
      type: 'LIVE',
    });
    await database.db.insert(batchResources).values({
      batchId,
      subjectId,
      title: 'Chapter notes',
      type: 'NOTES',
      fileKey: 'files/notes.pdf',
      uploadedBy: admin.userId,
    });

    await enrol(database, batchId, learner.userId);
    await database.db.insert(batchAttendance).values({
      batchId,
      sessionId,
      userId: learner.userId,
    });

    const { body } = await cloneReq(batchId, admin).expect(201);
    const cloneId: string = body.batchId;

    const cloneSessions = await database.db
      .select()
      .from(batchSessions)
      .where(eq(batchSessions.batchId, cloneId));
    expect(cloneSessions).toHaveLength(1);
    expect(cloneSessions[0].title).toBe('Live session 1');

    const cloneResources = await database.db
      .select()
      .from(batchResources)
      .where(eq(batchResources.batchId, cloneId));
    expect(cloneResources).toHaveLength(1);

    const cloneEnrollments = await database.db
      .select()
      .from(batchEnrollments)
      .where(eq(batchEnrollments.batchId, cloneId));
    expect(cloneEnrollments).toHaveLength(0);

    const cloneAttendance = await database.db
      .select()
      .from(batchAttendance)
      .where(eq(batchAttendance.batchId, cloneId));
    expect(cloneAttendance).toHaveLength(0);
  });

  it('carries no doubts, quiz attempts or certificates into the clone', async () => {
    await enrol(database, batchId, learner.userId);

    const quizId = randomUUID();
    await database.db.insert(batchQuizzes).values({
      quizId,
      batchId,
      title: 'End-of-term quiz',
      createdBy: admin.userId,
    });

    await database.db.insert(batchDoubts).values({
      batchId,
      askedBy: learner.userId,
      anchorType: 'BATCH',
      title: 'What is inertia?',
      body: 'Please explain.',
    });

    await database.db.insert(batchQuizAttempts).values({
      quizId,
      userId: learner.userId,
      expiresAt: new Date('2027-12-31T00:00:00.000Z'),
      attemptNo: 1,
    });

    await database.db.insert(batchCertificates).values({
      batchId,
      userId: learner.userId,
      certificateNumber: 'CERT-001',
    });

    const { body } = await cloneReq(batchId, admin).expect(201);
    const cloneId: string = body.batchId;

    const cloneDoubts = await database.db
      .select()
      .from(batchDoubts)
      .where(eq(batchDoubts.batchId, cloneId));
    expect(cloneDoubts).toHaveLength(0);

    const cloneCertificates = await database.db
      .select()
      .from(batchCertificates)
      .where(eq(batchCertificates.batchId, cloneId));
    expect(cloneCertificates).toHaveLength(0);

    const cloneQuizzes = await database.db
      .select()
      .from(batchQuizzes)
      .where(eq(batchQuizzes.batchId, cloneId));
    expect(cloneQuizzes).toHaveLength(1);

    const cloneAttempts = await database.db
      .select()
      .from(batchQuizAttempts)
      .where(
        inArray(
          batchQuizAttempts.quizId,
          cloneQuizzes.map((q) => q.quizId),
        ),
      );
    expect(cloneAttempts).toHaveLength(0);
  });

  it('produces a different slug from the original and from a second clone', async () => {
    const { body: first } = await cloneReq(batchId, admin).expect(201);
    const { body: second } = await cloneReq(batchId, admin).expect(201);

    expect(first.slug).not.toBe(second.slug);
    expect(first.batchId).not.toBe(second.batchId);
    expect(first.slug).not.toBe('');
    expect(second.slug).not.toBe('');
  });

  it('uses a caller-supplied slug when provided', async () => {
    const { body } = await cloneReq(batchId, admin, {
      slug: 'physics-2027-batch',
    }).expect(201);

    expect(body.slug).toBe('physics-2027-batch');
  });

  it('records the clone operation in the audit log', async () => {
    const { body: cloneBody } = await cloneReq(batchId, admin).expect(201);
    const cloneId: string = cloneBody.batchId;

    const { body: log } = await request(app.getHttpServer())
      .get('/audit-log?action=BATCH_CLONED')
      .set(...authHeader(app, admin))
      .expect(200);

    const entry = log.find(
      (e: { targetId: string }) => e.targetId === cloneId,
    );
    expect(entry).toBeDefined();
    expect(entry.before.sourceBatchId).toBe(batchId);
    expect(entry.after.cloneBatchId).toBe(cloneId);
  });
});
