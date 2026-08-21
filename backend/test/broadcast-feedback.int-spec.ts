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
  addSubGroupMember,
  assignInstructor,
  createBatch,
  createCompany,
  createCorporateAdmin,
  createSubGroup,
  createUser,
  enrol,
} from './support/factories';
import {
  corporateContracts,
  corporateSeats,
  users,
} from '../src/database/schema';

describe('broadcast and student feedback', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let admin: TestActor;
  let teacher: TestActor;
  let student: TestActor;
  let batchId: string;

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
    await truncateAll(database);
    clock.set('2027-01-05T09:00:00.000Z');
    admin = await createUser(database, 'PLATFORM_ADMIN');
    teacher = await createUser(database, 'INSTRUCTOR');
    student = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId);
    await assignInstructor(database, batchId, teacher.userId);
    await enrol(database, batchId, student.userId);
  });

  function broadcast(body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post('/admin/broadcasts')
      .set(...authHeader(app, admin))
      .send(body);
  }

  async function unread(actor: TestActor): Promise<number> {
    const { body } = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(...authHeader(app, actor))
      .expect(200);
    return body.count ?? body.unread ?? body;
  }

  async function inbox(actor: TestActor) {
    const { body } = await request(app.getHttpServer())
      .get('/notifications')
      .set(...authHeader(app, actor))
      .expect(200);
    return (body.data ?? body) as { title: string }[];
  }

  describe('broadcast', () => {
    it('reaches everyone on a batch and nobody else', async () => {
      const alsoEnrolled = await createUser(database, 'LEARNER');
      await enrol(database, batchId, alsoEnrolled.userId);
      const outsider = await createUser(database, 'LEARNER');

      await broadcast({
        audienceType: 'BATCH',
        audienceId: batchId,
        title: 'Class moved to Thursday',
        body: 'Please note the change.',
      }).expect(201);

      expect((await inbox(student)).map((n) => n.title)).toContain(
        'Class moved to Thursday',
      );
      expect((await inbox(alsoEnrolled)).map((n) => n.title)).toContain(
        'Class moved to Thursday',
      );
      expect(await unread(outsider)).toBe(0);
    });

    it('delivers to each recipient exactly once', async () => {
      await broadcast({
        audienceType: 'BATCH',
        audienceId: batchId,
        title: 'Only once',
        body: 'You should see this a single time.',
      }).expect(201);

      const received = (await inbox(student)).filter(
        (n) => n.title === 'Only once',
      );
      expect(received).toHaveLength(1);
    });

    it('reaches a whole college', async () => {
      const companyId = await createCompany(database);
      const corporateAdmin = await createCorporateAdmin(database, companyId);
      const seated = await createUser(database, 'LEARNER');
      const outsider = await createUser(database, 'LEARNER');

      const [contract] = await database.db
        .insert(corporateContracts)
        .values({
          companyId,
          title: 'Autumn cohort',
          seatCount: 10,
          startsAt: new Date('2026-09-01T00:00:00.000Z'),
          endsAt: new Date('2027-08-31T00:00:00.000Z'),
          createdBy: corporateAdmin.userId,
        })
        .returning();
      await database.db
        .insert(corporateSeats)
        .values({ contractId: contract.contractId, userId: seated.userId });

      await broadcast({
        audienceType: 'CORPORATE',
        audienceId: companyId,
        title: 'College notice',
        body: 'Your placement week is confirmed.',
      }).expect(201);

      expect((await inbox(seated)).map((n) => n.title)).toContain(
        'College notice',
      );
      expect(await unread(outsider)).toBe(0);
    });

    it('reaches only one sub-group', async () => {
      const companyId = await createCompany(database);
      const corporateAdmin = await createCorporateAdmin(database, companyId);
      const inGroup = await createUser(database, 'LEARNER');
      const outOfGroup = await createUser(database, 'LEARNER');

      const [contract] = await database.db
        .insert(corporateContracts)
        .values({
          companyId,
          title: 'Autumn cohort',
          seatCount: 10,
          startsAt: new Date('2026-09-01T00:00:00.000Z'),
          endsAt: new Date('2027-08-31T00:00:00.000Z'),
          createdBy: corporateAdmin.userId,
        })
        .returning();
      const subGroupId = await createSubGroup(
        database,
        contract.contractId,
        corporateAdmin.userId,
      );
      await addSubGroupMember(
        database,
        subGroupId,
        contract.contractId,
        inGroup.userId,
        corporateAdmin.userId,
      );

      await broadcast({
        audienceType: 'SUB_GROUP',
        audienceId: subGroupId,
        title: 'Section B only',
        body: 'Your lab slot has moved.',
      }).expect(201);

      expect((await inbox(inGroup)).map((n) => n.title)).toContain(
        'Section B only',
      );
      expect(await unread(outOfGroup)).toBe(0);
    });

    it('reaches a filtered segment', async () => {
      const instructor = await createUser(database, 'INSTRUCTOR');

      await broadcast({
        audienceType: 'SEGMENT',
        segment: { role: 'INSTRUCTOR' },
        title: 'Staff briefing',
        body: 'Marking deadlines are out.',
      }).expect(201);

      expect((await inbox(instructor)).map((n) => n.title)).toContain(
        'Staff briefing',
      );
      expect(await unread(student)).toBe(0);
    });

    it('refuses a segment with no filter at all', async () => {
      await broadcast({
        audienceType: 'SEGMENT',
        segment: {},
        title: 'Everyone',
        body: 'This should not be allowed.',
      }).expect(400);

      expect(await unread(student)).toBe(0);
    });

    it('refuses a batch broadcast with no batch named', async () => {
      await broadcast({
        audienceType: 'BATCH',
        title: 'Nowhere',
        body: 'No audience.',
      }).expect(400);
    });

    it('shows what was sent, to whom and when', async () => {
      const { body: sent } = await broadcast({
        audienceType: 'BATCH',
        audienceId: batchId,
        title: 'Class moved to Thursday',
        body: 'Please note the change.',
      }).expect(201);

      const { body: history } = await request(app.getHttpServer())
        .get('/admin/broadcasts')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(history[0].broadcastId).toBe(sent.broadcastId);
      expect(history[0].recipientCount).toBe(1);
      expect(history[0].sentAt).toBe('2027-01-05T09:00:00.000Z');

      const { body: detail } = await request(app.getHttpServer())
        .get(`/admin/broadcasts/${sent.broadcastId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(detail.recipients.map((r: { userId: string }) => r.userId)).toEqual(
        [student.userId],
      );
    });

    it('records the actor and the audience', async () => {
      const { body: sent } = await broadcast({
        audienceType: 'BATCH',
        audienceId: batchId,
        title: 'Class moved to Thursday',
        body: 'Please note the change.',
      }).expect(201);

      const { body } = await request(app.getHttpServer())
        .get('/audit-log?action=broadcast.send')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(body[0].actorId).toBe(admin.userId);
      expect(body[0].targetId).toBe(sent.broadcastId);
      expect(body[0].after.audienceType).toBe('BATCH');
      expect(body[0].after.audienceId).toBe(batchId);
      expect(body[0].after.recipientCount).toBe(1);
    });

    it('keeps an instructor from broadcasting', async () => {
      await request(app.getHttpServer())
        .post('/admin/broadcasts')
        .set(...authHeader(app, teacher))
        .send({
          audienceType: 'BATCH',
          audienceId: batchId,
          title: 'Not allowed',
          body: 'This must not send.',
        })
        .expect(403);

      expect(await unread(student)).toBe(0);
    });
  });

  describe('student feedback', () => {
    function writeFeedback(actor: TestActor, subject: TestActor, body: string) {
      return request(app.getHttpServer())
        .post(`/batches/${batchId}/students/${subject.userId}/feedback`)
        .set(...authHeader(app, actor))
        .send({ body });
    }

    async function feedbackFor(actor: TestActor, subject: TestActor) {
      const { body } = await request(app.getHttpServer())
        .get(`/batches/${batchId}/students/${subject.userId}/feedback`)
        .set(...authHeader(app, actor))
        .expect(200);
      return body as {
        feedbackId: string;
        body: string;
        authorId: string;
        authorName: string | null;
        createdAt: string;
      }[];
    }

    it('lets an instructor leave feedback the student can read', async () => {
      await writeFeedback(
        teacher,
        student,
        'Strong on mechanics, needs work on optics.',
      ).expect(201);

      const [note] = await feedbackFor(student, student);

      expect(note.body).toBe('Strong on mechanics, needs work on optics.');
      expect(note.authorId).toBe(teacher.userId);
      expect(note.createdAt).toBe('2027-01-05T09:00:00.000Z');
    });

    it('records who wrote it', async () => {
      await writeFeedback(teacher, student, 'Good progress this term.').expect(
        201,
      );

      const [note] = await feedbackFor(teacher, student);

      expect(note.authorId).toBe(teacher.userId);
      expect(note.authorName).toEqual(expect.any(String));
    });

    it('tells the student that feedback was left', async () => {
      const before = await unread(student);

      await writeFeedback(teacher, student, 'Good progress this term.').expect(
        201,
      );

      expect(await unread(student)).toBe(before + 1);
    });

    it('keeps one student from reading another\'s feedback', async () => {
      const classmate = await createUser(database, 'LEARNER');
      await enrol(database, batchId, classmate.userId);
      await writeFeedback(teacher, student, 'Private to this student.').expect(
        201,
      );

      await request(app.getHttpServer())
        .get(`/batches/${batchId}/students/${student.userId}/feedback`)
        .set(...authHeader(app, classmate))
        .expect(403);
    });

    it('keeps someone outside the batch out entirely', async () => {
      const stranger = await createUser(database, 'LEARNER');
      await writeFeedback(teacher, student, 'Private to this batch.').expect(
        201,
      );

      await request(app.getHttpServer())
        .get(`/batches/${batchId}/students/${student.userId}/feedback`)
        .set(...authHeader(app, stranger))
        .expect(404);
    });

    it('keeps a student from writing feedback on themselves', async () => {
      await writeFeedback(student, student, 'I am doing great.').expect(404);

      expect(await feedbackFor(student, student)).toEqual([]);
    });

    it('refuses feedback on someone who is not on the batch', async () => {
      const stranger = await createUser(database, 'LEARNER');

      await writeFeedback(teacher, stranger, 'Not on this batch.').expect(400);
    });

    it('gathers a student\'s feedback across batches', async () => {
      const otherBatch = await createBatch(database, admin.userId);
      await assignInstructor(database, otherBatch, teacher.userId);
      await enrol(database, otherBatch, student.userId);

      await writeFeedback(teacher, student, 'Physics note.').expect(201);
      await request(app.getHttpServer())
        .post(`/batches/${otherBatch}/students/${student.userId}/feedback`)
        .set(...authHeader(app, teacher))
        .send({ body: 'Chemistry note.' })
        .expect(201);

      const { body } = await request(app.getHttpServer())
        .get('/me/feedback')
        .set(...authHeader(app, student))
        .expect(200);

      expect(body.map((f: { body: string }) => f.body).sort()).toEqual([
        'Chemistry note.',
        'Physics note.',
      ]);
      expect(body[0].batchTitle).toEqual(expect.any(String));
    });

    it('withdraws a piece of feedback', async () => {
      await writeFeedback(teacher, student, 'Written by mistake.').expect(201);
      const [note] = await feedbackFor(student, student);

      await request(app.getHttpServer())
        .delete(`/batches/${batchId}/feedback/${note.feedbackId}`)
        .set(...authHeader(app, teacher))
        .expect(200);

      expect(await feedbackFor(student, student)).toEqual([]);
      expect(await database.db.select().from(users).limit(1)).toHaveLength(1);
    });
  });
});
