import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

import {
  assessmentTests,
  batchResources,
  batchSessions,
  lessons,
} from '../src/database/schema';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import {
  createBatch,
  createLesson,
  createSubject,
  createUser,
  enrol,
} from './support/factories';

describe('notes library and the unified curriculum', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;
  let batchId: string;
  let subjectId: string;

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
    batchId = await createBatch(database, admin.userId);
    subjectId = await createSubject(database, batchId);
    await enrol(database, batchId, student.userId);
  });

  function addResource(body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post(`/batches/${batchId}/resources`)
      .set(...authHeader(app, admin))
      .send({ title: 'Thermodynamics notes', type: 'NOTES', ...body });
  }

  function library(actor: TestActor) {
    return request(app.getHttpServer())
      .get(`/batches/${batchId}/resources/library`)
      .set(...authHeader(app, actor));
  }

  function curriculum(actor: TestActor) {
    return request(app.getHttpServer())
      .get(`/batches/${batchId}/curriculum/full`)
      .set(...authHeader(app, actor));
  }

  it('turns a resource added through the library into a document lesson', async () => {
    const created = await addResource({
      subjectId,
      fileKey: 'notes/thermo.pdf',
      pageCount: 14,
    }).expect(201);

    expect(created.body.lessonId).toBeTruthy();

    const [lesson] = await database.db
      .select()
      .from(lessons)
      .where(eq(lessons.lessonId, created.body.lessonId));

    expect(lesson).toMatchObject({
      type: 'DOCUMENT',
      documentFileKey: 'notes/thermo.pdf',
      documentPageCount: 14,
      resourceId: created.body.resourceId,
    });

    const shown = await curriculum(student).expect(200);
    const items = shown.body.flatMap(
      (subject: { items: { lessonId: string }[] }) => subject.items,
    );
    expect(items.filter((i: { lessonId: string }) => i.lessonId === lesson.lessonId)).toHaveLength(1);
  });

  it('shows a document lesson in the library without a second upload', async () => {
    const created = await request(app.getHttpServer())
      .post(`/batches/${batchId}/lessons`)
      .set(...authHeader(app, admin))
      .send({
        subjectId,
        title: 'Optics handout',
        type: 'DOCUMENT',
        order: 1,
        documentFileKey: 'notes/optics.pdf',
        documentPageCount: 6,
        status: 'READY',
      })
      .expect(201);

    expect(created.body.resourceId).toBeTruthy();

    const rows = await database.db
      .select()
      .from(batchResources)
      .where(eq(batchResources.batchId, batchId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      fileKey: 'notes/optics.pdf',
      lessonId: created.body.lessonId,
    });

    const shelf = await library(student).expect(200);
    const titles = shelf.body.flatMap(
      (group: { groups: { resources: { title: string }[] }[] }) =>
        group.groups.flatMap((g) => g.resources.map((r) => r.title)),
    );
    expect(titles).toContain('Optics handout');
  });

  it('removes it from both places because there is only one', async () => {
    const created = await addResource({
      subjectId,
      fileKey: 'notes/one.pdf',
      pageCount: 3,
    }).expect(201);

    await request(app.getHttpServer())
      .delete(`/batches/${batchId}/resources/${created.body.resourceId}`)
      .set(...authHeader(app, admin))
      .expect(200);

    const shelf = await library(student).expect(200);
    expect(shelf.body).toEqual([]);

    const shown = await curriculum(student).expect(200);
    const items = shown.body.flatMap(
      (subject: { items: unknown[] }) => subject.items,
    );
    expect(items).toEqual([]);
  });

  it('keeps existing phase 2 resources reachable after the change', async () => {
    await database.db.insert(batchResources).values({
      resourceId: randomUUID(),
      batchId,
      subjectId,
      title: 'Legacy DPP',
      type: 'DPP',
      fileKey: 'legacy/dpp.pdf',
      uploadedBy: admin.userId,
    });

    const shelf = await library(student).expect(200);
    const titles = shelf.body.flatMap(
      (group: { groups: { resources: { title: string }[] }[] }) =>
        group.groups.flatMap((g) => g.resources.map((r) => r.title)),
    );
    expect(titles).toContain('Legacy DPP');
  });

  it('decides library access by the single access module', async () => {
    await addResource({ subjectId, fileKey: 'notes/x.pdf' }).expect(201);

    const outsider = await createUser(database, 'LEARNER');
    await request(app.getHttpServer())
      .get(`/batches/${batchId}/resources/library`)
      .set(...authHeader(app, outsider))
      .expect(404);
  });

  it('returns every content type in one ordered curriculum', async () => {
    const sessionId = randomUUID();
    await database.db.insert(batchSessions).values({
      sessionId,
      batchId,
      subjectId,
      title: 'Live revision',
      type: 'LIVE',
      scheduledStartAt: new Date('2026-09-10T10:00:00.000Z'),
    });

    const videoId = await createLesson(database, subjectId, {
      type: 'VIDEO',
      duration: 600,
      order: 1,
    });
    const liveId = await createLesson(database, subjectId, {
      type: 'LIVE_SESSION',
      sessionId,
      order: 2,
    });
    await addResource({ subjectId, fileKey: 'notes/c.pdf' }).expect(201);

    const testId = randomUUID();
    await database.db.insert(assessmentTests).values({
      testId,
      batchId,
      title: 'Unit test 1',
      durationMinutes: 30,
      createdBy: admin.userId,
      publishedAt: new Date('2026-09-01T00:00:00.000Z'),
    });

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/subjects/${subjectId}/tests`)
      .set(...authHeader(app, admin))
      .send({ testId, order: 4 })
      .expect(201);

    const shown = await curriculum(student).expect(200);
    const items = shown.body[0].items;

    expect(items.map((i: { kind: string }) => i.kind)).toEqual([
      'LESSON',
      'LESSON',
      'LESSON',
      'TEST',
    ]);
    expect(items.map((i: { type: string }) => i.type)).toEqual([
      'VIDEO',
      'LIVE_SESSION',
      'DOCUMENT',
      'TEST',
    ]);

    const live = items.find((i: { lessonId: string }) => i.lessonId === liveId);
    expect(live.sessionId).toBe(sessionId);
    expect(new Date(live.scheduledStartAt).toISOString()).toBe(
      '2026-09-10T10:00:00.000Z',
    );

    const test = items[3];
    expect(test.testId).toBe(testId);
    expect(test.lessonId).toBeNull();

    const lessonRows = await database.db
      .select()
      .from(lessons)
      .where(eq(lessons.subjectId, subjectId));
    expect(lessonRows.map((l) => l.lessonId)).toContain(videoId);
    expect(lessonRows.filter((l) => l.type === 'QUIZ')).toHaveLength(0);
  });

  it('places live sessions in schedule order when they share an order', async () => {
    const later = randomUUID();
    const earlier = randomUUID();
    await database.db.insert(batchSessions).values([
      {
        sessionId: later,
        batchId,
        subjectId,
        title: 'Second class',
        type: 'LIVE',
        scheduledStartAt: new Date('2026-09-20T10:00:00.000Z'),
      },
      {
        sessionId: earlier,
        batchId,
        subjectId,
        title: 'First class',
        type: 'LIVE',
        scheduledStartAt: new Date('2026-09-11T10:00:00.000Z'),
      },
    ]);

    await createLesson(database, subjectId, {
      type: 'LIVE_SESSION',
      sessionId: later,
      title: 'Second class',
      order: 1,
    });
    await createLesson(database, subjectId, {
      type: 'LIVE_SESSION',
      sessionId: earlier,
      title: 'First class',
      order: 1,
    });

    const shown = await curriculum(student).expect(200);
    expect(shown.body[0].items.map((i: { title: string }) => i.title)).toEqual([
      'First class',
      'Second class',
    ]);
  });

  it('applies drip rules per item and reorders explicitly and stably', async () => {
    const early = await createLesson(database, subjectId, {
      type: 'VIDEO',
      duration: 60,
      order: 1,
    });
    const dripped = await createLesson(database, subjectId, {
      type: 'VIDEO',
      duration: 60,
      order: 2,
    });

    await request(app.getHttpServer())
      .patch(`/batches/${batchId}/lessons/${dripped}`)
      .set(...authHeader(app, admin))
      .send({ title: 'Later lesson' })
      .expect(200);

    const before = await curriculum(student).expect(200);
    const order = before.body[0].items.map((i: { lessonId: string }) => i.lessonId);
    expect(order).toEqual([early, dripped]);

    const placements = before.body[0].items.map(
      (i: { placementId: string }) => i.placementId,
    );
    await request(app.getHttpServer())
      .put(`/batches/${batchId}/curriculum/reorder`)
      .set(...authHeader(app, admin))
      .send({
        items: [
          { placementId: placements[0], order: 9 },
          { placementId: placements[1], order: 1 },
        ],
      })
      .expect(200);

    const after = await curriculum(student).expect(200);
    expect(after.body[0].items.map((i: { lessonId: string }) => i.lessonId)).toEqual([
      dripped,
      early,
    ]);

    const again = await curriculum(student).expect(200);
    expect(again.body[0].items.map((i: { lessonId: string }) => i.lessonId)).toEqual([
      dripped,
      early,
    ]);
  });
});
