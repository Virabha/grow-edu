import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';

import { subjectLessons } from '../src/database/schema';
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

describe('continue-learning surface', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;

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
    clock.set('2026-09-01T09:00:00.000Z');
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
  });

  function surface(actor: TestActor) {
    return request(app.getHttpServer())
      .get('/batches/continue-learning')
      .set(...authHeader(app, actor));
  }

  function watch(
    batchId: string,
    lessonId: string,
    body: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .put(`/batches/${batchId}/lessons/${lessonId}/progress`)
      .set(...authHeader(app, student))
      .send(body);
  }

  async function batchWithLessons(count: number, titlePrefix: string) {
    const batchId = await createBatch(database, admin.userId);
    const subjectId = await createSubject(database, batchId);
    await enrol(database, batchId, student.userId);
    const lessonIds: string[] = [];
    for (let index = 0; index < count; index += 1) {
      lessonIds.push(
        await createLesson(database, subjectId, {
          type: 'VIDEO',
          duration: 1000,
          title: `${titlePrefix} ${index + 1}`,
          order: index + 1,
        }),
      );
    }
    return { batchId, subjectId, lessonIds };
  }

  it('names the last incomplete item and where the student stopped', async () => {
    const { batchId, lessonIds } = await batchWithLessons(3, 'Lesson');

    await watch(batchId, lessonIds[0], { watchedSeconds: 950 }).expect(200);
    clock.advance(60_000);
    await watch(batchId, lessonIds[1], { watchedSeconds: 200 }).expect(200);
    await request(app.getHttpServer())
      .put(`/batches/${batchId}/positions`)
      .set(...authHeader(app, student))
      .send({
        positions: [
          {
            lessonId: lessonIds[1],
            positionSeconds: 212,
            recordedAt: '2026-09-01T09:05:00.000Z',
          },
        ],
      })
      .expect(200);

    const shown = await surface(student).expect(200);
    expect(shown.body).toHaveLength(1);
    expect(shown.body[0]).toMatchObject({
      batchId,
      lessonId: lessonIds[1],
      title: 'Lesson 2',
      positionSeconds: 212,
      resumed: true,
    });
  });

  it('does not offer a completed item as the thing to continue', async () => {
    const { batchId, lessonIds } = await batchWithLessons(2, 'Lesson');

    await watch(batchId, lessonIds[0], { watchedSeconds: 1000 }).expect(200);

    const shown = await surface(student).expect(200);
    expect(shown.body[0].lessonId).toBe(lessonIds[1]);
    expect(shown.body[0].resumed).toBe(false);
  });

  it('gives a student with no history a sensible first item', async () => {
    const { batchId, lessonIds } = await batchWithLessons(2, 'Lesson');

    const shown = await surface(student).expect(200);
    expect(shown.body).toHaveLength(1);
    expect(shown.body[0]).toMatchObject({
      batchId,
      lessonId: lessonIds[0],
      positionSeconds: 0,
      resumed: false,
    });
  });

  it('spans every enrolled batch, most recent first', async () => {
    const first = await batchWithLessons(2, 'Alpha');
    const second = await batchWithLessons(2, 'Beta');

    await watch(first.batchId, first.lessonIds[0], { watchedSeconds: 100 }).expect(200);
    clock.advance(3_600_000);
    await watch(second.batchId, second.lessonIds[0], { watchedSeconds: 100 }).expect(200);

    const shown = await surface(student).expect(200);
    expect(shown.body.map((i: { batchId: string }) => i.batchId)).toEqual([
      second.batchId,
      first.batchId,
    ]);

    clock.advance(3_600_000);
    await watch(first.batchId, first.lessonIds[0], { watchedSeconds: 150 }).expect(200);

    const after = await surface(student).expect(200);
    expect(after.body.map((i: { batchId: string }) => i.batchId)).toEqual([
      first.batchId,
      second.batchId,
    ]);
  });

  it('respects drip and access rules', async () => {
    const batchId = await createBatch(database, admin.userId);
    const subjectId = await createSubject(database, batchId);
    await enrol(database, batchId, student.userId);

    const locked = await createLesson(database, subjectId, {
      type: 'VIDEO',
      duration: 1000,
      title: 'Locked',
      order: 1,
    });
    const open = await createLesson(database, subjectId, {
      type: 'VIDEO',
      duration: 1000,
      title: 'Open',
      order: 2,
    });

    await request(app.getHttpServer())
      .put(`/batches/${batchId}/lessons/reorder`)
      .set(...authHeader(app, admin))
      .send({ lessons: [{ lessonId: locked, order: 1 }, { lessonId: open, order: 2 }] })
      .expect(200);

    await database.db
      .update(subjectLessons)
      .set({ unlockAt: new Date('2027-01-01T00:00:00.000Z') })
      .where(eq(subjectLessons.lessonId, locked));

    const shown = await surface(student).expect(200);
    expect(shown.body).toHaveLength(1);
    expect(shown.body[0].lessonId).toBe(open);
  });

  it('returns nothing for a student with no enrolment rather than failing', async () => {
    const shown = await surface(student).expect(200);
    expect(shown.body).toEqual([]);
  });

  it('drops a batch whose access has been revoked', async () => {
    const { batchId, lessonIds } = await batchWithLessons(2, 'Lesson');
    await watch(batchId, lessonIds[0], { watchedSeconds: 100 }).expect(200);

    await request(app.getHttpServer())
      .delete(`/batches/${batchId}/enrollments/${student.userId}`)
      .set(...authHeader(app, admin))
      .expect(200);

    const shown = await surface(student).expect(200);
    expect(shown.body).toEqual([]);
  });
});
