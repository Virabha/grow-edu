import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import {
  assignInstructor,
  createBatch,
  createLesson,
  createSubject,
  createUser,
  enrol,
} from './support/factories';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';

interface ContentLesson {
  lessonId: string;
  title: string;
  locked: boolean;
  unlocksAt: string | null;
  videoUrl: string | null;
}

describe('scheduled publication and drip release', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let queue: InlineJobQueue;
  let admin: TestActor;
  let teacher: TestActor;
  let student: TestActor;
  let batchId: string;
  let subjectId: string;

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
    await truncateAll(database);
    clock.set('2026-11-01T09:00:00.000Z');
    admin = await createUser(database, 'PLATFORM_ADMIN');
    teacher = await createUser(database, 'INSTRUCTOR');
    student = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId);
    subjectId = await createSubject(database, batchId);
    await assignInstructor(database, batchId, teacher.userId);
    await enrol(database, batchId, student.userId, {
      accessStartsAt: new Date('2026-11-01T09:00:00.000Z'),
    });
  });

  async function content(actor: TestActor): Promise<ContentLesson[]> {
    const { body } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/content`)
      .set(...authHeader(app, actor))
      .expect(200);
    return body.flatMap((s: { lessons: ContentLesson[] }) => s.lessons);
  }

  function readLesson(actor: TestActor, lessonId: string) {
    return request(app.getHttpServer())
      .get(`/batches/${batchId}/lessons/${lessonId}`)
      .set(...authHeader(app, actor));
  }

  function setRule(lessonId: string, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .put(`/batches/${batchId}/lessons/${lessonId}/unlock-rule`)
      .set(...authHeader(app, admin))
      .send(body);
  }

  describe('scheduled publication', () => {
    async function submitLesson(title: string): Promise<string> {
      const { body } = await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons`)
        .set(...authHeader(app, teacher))
        .send({ subjectId, title, type: 'VIDEO', order: 1, status: 'READY' })
        .expect(201);
      return body.lessonId;
    }

    it('accepts an approval with a publication time in the future', async () => {
      const lessonId = await submitLesson('Monday opener');

      const { body } = await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${lessonId}/schedule`)
        .set(...authHeader(app, admin))
        .send({ publishAt: '2026-11-09T04:00:00.000Z' })
        .expect(201);

      expect(body.status).toBe('SCHEDULED');
      expect(await content(student)).toEqual([]);
    });

    it('publishes it when the clock passes, with nobody acting', async () => {
      const lessonId = await submitLesson('Monday opener');
      await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${lessonId}/schedule`)
        .set(...authHeader(app, admin))
        .send({ publishAt: '2026-11-09T04:00:00.000Z' })
        .expect(201);

      clock.set('2026-11-09T04:00:01.000Z');
      await queue.enqueue('content.publish.scheduled', undefined);

      expect((await content(student)).map((l) => l.title)).toEqual([
        'Monday opener',
      ]);
    });

    it('leaves it unpublished while the time has not come', async () => {
      const lessonId = await submitLesson('Monday opener');
      await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${lessonId}/schedule`)
        .set(...authHeader(app, admin))
        .send({ publishAt: '2026-11-09T04:00:00.000Z' })
        .expect(201);

      clock.set('2026-11-08T23:59:00.000Z');
      await queue.enqueue('content.publish.scheduled', undefined);

      expect(await content(student)).toEqual([]);
    });

    it('publishes at once when no time is given', async () => {
      const lessonId = await submitLesson('Publish now');

      const { body } = await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${lessonId}/schedule`)
        .set(...authHeader(app, admin))
        .send({})
        .expect(201);

      expect(body.status).toBe('READY');
      expect((await content(student)).map((l) => l.title)).toEqual([
        'Publish now',
      ]);
    });

    it('calls off a publication that has not fired', async () => {
      const lessonId = await submitLesson('Monday opener');
      await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${lessonId}/schedule`)
        .set(...authHeader(app, admin))
        .send({ publishAt: '2026-11-09T04:00:00.000Z' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/admin/approvals/lessons/${lessonId}/schedule`)
        .set(...authHeader(app, admin))
        .expect(200);

      clock.set('2026-11-09T04:00:01.000Z');
      await queue.enqueue('content.publish.scheduled', undefined);

      expect(await content(student)).toEqual([]);
    });

    it('moves a publication to a new time', async () => {
      const lessonId = await submitLesson('Monday opener');
      await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${lessonId}/schedule`)
        .set(...authHeader(app, admin))
        .send({ publishAt: '2026-11-09T04:00:00.000Z' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${lessonId}/schedule`)
        .set(...authHeader(app, admin))
        .send({ publishAt: '2026-11-16T04:00:00.000Z' })
        .expect(201);

      clock.set('2026-11-09T04:00:01.000Z');
      await queue.enqueue('content.publish.scheduled', undefined);
      expect(await content(student)).toEqual([]);

      clock.set('2026-11-16T04:00:01.000Z');
      await queue.enqueue('content.publish.scheduled', undefined);
      expect(await content(student)).toHaveLength(1);
    });

    it('is a repeating scheduled job, not something a request triggers', async () => {
      clock.set('2031-01-01T00:00:00.000Z');

      expect(await queue.tick()).toContain('content.publish.scheduled');
    });
  });

  describe('drip release', () => {
    let lessonId: string;

    beforeEach(async () => {
      lessonId = await createLesson(database, subjectId, {
        title: 'Week two',
        status: 'READY',
        videoUrl: 'https://cdn.example.com/week-two.m3u8',
      });
    });

    it('keeps a fixed-date item shut before its date', async () => {
      await setRule(lessonId, { unlockAt: '2026-11-15T00:00:00.000Z' }).expect(
        200,
      );

      const refused = await readLesson(student, lessonId).expect(403);

      expect(refused.body.code).toBe('CONTENT_LOCKED');
      expect(refused.body.unlocksAt).toBe('2026-11-15T00:00:00.000Z');
    });

    it('opens a fixed-date item once its date passes', async () => {
      await setRule(lessonId, { unlockAt: '2026-11-15T00:00:00.000Z' }).expect(
        200,
      );

      clock.set('2026-11-15T00:00:01.000Z');

      const { body } = await readLesson(student, lessonId).expect(200);
      expect(body.lessonId).toBe(lessonId);
    });

    it('counts an offset from each student\'s own enrolment', async () => {
      const late = await createUser(database, 'LEARNER');
      await enrol(database, batchId, late.userId, {
        accessStartsAt: new Date('2026-11-20T09:00:00.000Z'),
      });
      await setRule(lessonId, { unlockAfterDays: 7 }).expect(200);

      clock.set('2026-11-09T09:00:00.000Z');

      const { body } = await readLesson(student, lessonId).expect(200);
      expect(body.lessonId).toBe(lessonId);

      const refused = await readLesson(late, lessonId).expect(403);
      expect(refused.body.unlocksAt).toBe('2026-11-27T09:00:00.000Z');
    });

    it('tells a student when it opens rather than that it is missing', async () => {
      await setRule(lessonId, { unlockAfterDays: 14 }).expect(200);

      const refused = await readLesson(student, lessonId).expect(403);

      expect(refused.status).not.toBe(404);
      expect(refused.body.unlocksAt).toBe('2026-11-15T09:00:00.000Z');
    });

    it('shows a locked item in the syllabus without its content', async () => {
      await setRule(lessonId, { unlockAt: '2026-11-15T00:00:00.000Z' }).expect(
        200,
      );

      const [item] = await content(student);

      expect(item.title).toBe('Week two');
      expect(item.locked).toBe(true);
      expect(item.unlocksAt).toBe('2026-11-15T00:00:00.000Z');
      expect(item.videoUrl).toBeNull();
    });

    it('lets staff on the batch reach locked content', async () => {
      await setRule(lessonId, { unlockAt: '2027-06-01T00:00:00.000Z' }).expect(
        200,
      );

      await readLesson(teacher, lessonId).expect(200);
      await readLesson(admin, lessonId).expect(200);

      const [staffView] = await content(teacher);
      expect(staffView.locked).toBe(false);
      expect(staffView.videoUrl).toBe('https://cdn.example.com/week-two.m3u8');
    });

    it('leaves an item with no rule reachable', async () => {
      await readLesson(student, lessonId).expect(200);

      const [item] = await content(student);
      expect(item.locked).toBe(false);
      expect(item.unlocksAt).toBeNull();
    });

    it('takes a rule off again', async () => {
      await setRule(lessonId, { unlockAt: '2027-06-01T00:00:00.000Z' }).expect(
        200,
      );
      await readLesson(student, lessonId).expect(403);

      await setRule(lessonId, {}).expect(200);

      await readLesson(student, lessonId).expect(200);
    });

    it('refuses a rule that names both a date and an offset', async () => {
      await setRule(lessonId, {
        unlockAt: '2027-06-01T00:00:00.000Z',
        unlockAfterDays: 7,
      }).expect(400);
    });

    it('keeps someone outside the batch from setting a rule', async () => {
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${lessonId}/unlock-rule`)
        .set(...authHeader(app, student))
        .send({ unlockAfterDays: 7 })
        .expect(404);
    });

    it('still refuses a locked lesson to someone in another batch', async () => {
      const stranger = await createUser(database, 'LEARNER');
      await setRule(lessonId, { unlockAfterDays: 7 }).expect(200);

      await readLesson(stranger, lessonId).expect(404);
    });
  });
});
