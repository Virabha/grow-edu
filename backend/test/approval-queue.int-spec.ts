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
  createSubject,
  createUser,
  enrol,
} from './support/factories';

interface QueueItem {
  itemId: string;
  title: string;
  batchId: string;
  batchTitle: string;
  subjectName: string;
  submittedByName: string | null;
  submittedAt: string | null;
}

describe('approval queue and payment rejection', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let admin: TestActor;
  let teacher: TestActor;
  let student: TestActor;
  let batchId: string;
  let subjectId: string;

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
    clock.set('2026-10-05T09:00:00.000Z');
    admin = await createUser(database, 'PLATFORM_ADMIN');
    teacher = await createUser(database, 'INSTRUCTOR');
    student = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId, '2000.00');
    subjectId = await createSubject(database, batchId);
    await assignInstructor(database, batchId, teacher.userId);
    await enrol(database, batchId, student.userId);
  });

  async function submitLesson(
    title: string,
    batch = batchId,
    subject = subjectId,
  ): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .post(`/batches/${batch}/lessons`)
      .set(...authHeader(app, teacher))
      .send({ subjectId: subject, title, type: 'VIDEO', order: 1, status: 'READY' })
      .expect(201);
    return body.lessonId;
  }

  async function queue(): Promise<QueueItem[]> {
    const { body } = await request(app.getHttpServer())
      .get('/admin/approvals')
      .set(...authHeader(app, admin))
      .expect(200);
    return body;
  }

  async function visibleLessonTitles(): Promise<string[]> {
    const { body } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/content`)
      .set(...authHeader(app, student))
      .expect(200);
    return body.flatMap((s: { lessons: { title: string }[] }) =>
      s.lessons.map((l) => l.title),
    );
  }

  async function mySubmissions(actor: TestActor) {
    const { body } = await request(app.getHttpServer())
      .get('/instructor/submissions')
      .set(...authHeader(app, actor))
      .expect(200);
    return body as { itemId: string; status: string; comment: string | null }[];
  }

  async function unread(actor: TestActor): Promise<number> {
    const { body } = await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .set(...authHeader(app, actor))
      .expect(200);
    return body.count ?? body.unread ?? body;
  }

  describe('content approvals', () => {
    it('gathers what is waiting across every batch into one queue', async () => {
      const otherBatch = await createBatch(database, admin.userId);
      const otherSubject = await createSubject(database, otherBatch);
      await assignInstructor(database, otherBatch, teacher.userId);

      const here = await submitLesson('Kinematics');
      const there = await submitLesson('Entropy', otherBatch, otherSubject);

      const waiting = await queue();

      expect(waiting.map((i) => i.itemId).sort()).toEqual(
        [here, there].sort(),
      );
      expect(waiting.map((i) => i.batchId).sort()).toEqual(
        [batchId, otherBatch].sort(),
      );
    });

    it('shows who submitted it and when, without opening each item', async () => {
      await submitLesson('Kinematics');

      const [item] = await queue();

      expect(item.title).toBe('Kinematics');
      expect(item.batchTitle).toEqual(expect.any(String));
      expect(item.subjectName).toEqual(expect.any(String));
      expect(item.submittedByName).toEqual(expect.any(String));
      expect(item.submittedAt).toBe('2026-10-05T09:00:00.000Z');
    });

    it('keeps an unapproved lesson away from students', async () => {
      await submitLesson('Kinematics');

      expect(await visibleLessonTitles()).toEqual([]);
    });

    it('publishes a lesson to students when it is approved', async () => {
      const lessonId = await submitLesson('Kinematics');

      await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${lessonId}/approve`)
        .set(...authHeader(app, admin))
        .send({})
        .expect(201);

      expect(await visibleLessonTitles()).toEqual(['Kinematics']);
      expect(await queue()).toEqual([]);
    });

    it('refuses a rejection with no comment', async () => {
      const lessonId = await submitLesson('Kinematics');

      await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${lessonId}/reject`)
        .set(...authHeader(app, admin))
        .send({})
        .expect(400);

      expect(await queue()).toHaveLength(1);
    });

    it('returns a rejected item to its author with the comment', async () => {
      const lessonId = await submitLesson('Kinematics');

      await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${lessonId}/reject`)
        .set(...authHeader(app, admin))
        .send({ comment: 'The audio drops out after four minutes.' })
        .expect(201);

      const [mine] = await mySubmissions(teacher);

      expect(mine.itemId).toBe(lessonId);
      expect(mine.status).toBe('DRAFT');
      expect(mine.comment).toBe('The audio drops out after four minutes.');
      expect(await visibleLessonTitles()).toEqual([]);
      expect(await queue()).toEqual([]);
    });

    it('tells the author about an approval and about a rejection', async () => {
      const approved = await submitLesson('Kinematics');
      const rejected = await submitLesson('Dynamics');
      const before = await unread(teacher);

      await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${approved}/approve`)
        .set(...authHeader(app, admin))
        .send({})
        .expect(201);
      await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${rejected}/reject`)
        .set(...authHeader(app, admin))
        .send({ comment: 'Please re-record the last section.' })
        .expect(201);

      expect(await unread(teacher)).toBe(before + 2);
    });

    it('records both decisions with the actor', async () => {
      const approved = await submitLesson('Kinematics');
      const rejected = await submitLesson('Dynamics');

      await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${approved}/approve`)
        .set(...authHeader(app, admin))
        .send({})
        .expect(201);
      await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${rejected}/reject`)
        .set(...authHeader(app, admin))
        .send({ comment: 'Please re-record the last section.' })
        .expect(201);

      const { body: approvals } = await request(app.getHttpServer())
        .get('/audit-log?action=content.approve')
        .set(...authHeader(app, admin))
        .expect(200);
      const { body: rejections } = await request(app.getHttpServer())
        .get('/audit-log?action=content.reject')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(approvals[0].actorId).toBe(admin.userId);
      expect(approvals[0].targetId).toBe(approved);
      expect(rejections[0].actorId).toBe(admin.userId);
      expect(rejections[0].after.comment).toBe(
        'Please re-record the last section.',
      );
    });

    it('records a content edit with the actor and what changed', async () => {
      const lessonId = await submitLesson('Kinematics');

      await request(app.getHttpServer())
        .patch(`/batches/${batchId}/lessons/${lessonId}`)
        .set(...authHeader(app, admin))
        .send({ title: 'Kinematics, revised' })
        .expect(200);

      const { body } = await request(app.getHttpServer())
        .get('/audit-log?action=content.edit')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(body[0].actorId).toBe(admin.userId);
      expect(body[0].targetId).toBe(lessonId);
      expect(body[0].before.title).toBe('Kinematics');
      expect(body[0].after.title).toBe('Kinematics, revised');
    });

    it('records a permission change with the actor and both roles', async () => {
      const target = await createUser(database, 'LEARNER');

      await request(app.getHttpServer())
        .put(`/users/${target.userId}`)
        .set(...authHeader(app, admin))
        .send({ role: 'INSTRUCTOR' })
        .expect(200);

      const { body } = await request(app.getHttpServer())
        .get('/audit-log?action=user.role-change')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(body[0].actorId).toBe(admin.userId);
      expect(body[0].targetId).toBe(target.userId);
      expect(body[0].before.role).toBe('LEARNER');
      expect(body[0].after.role).toBe('INSTRUCTOR');
    });

    it('keeps an instructor out of the approval queue', async () => {
      await submitLesson('Kinematics');

      await request(app.getHttpServer())
        .get('/admin/approvals')
        .set(...authHeader(app, teacher))
        .expect(403);
    });

    it('refuses to approve something that is not waiting', async () => {
      const lessonId = await submitLesson('Kinematics');
      await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${lessonId}/approve`)
        .set(...authHeader(app, admin))
        .send({})
        .expect(201);

      await request(app.getHttpServer())
        .post(`/admin/approvals/lessons/${lessonId}/approve`)
        .set(...authHeader(app, admin))
        .send({})
        .expect(400);
    });
  });

  describe('payment queue', () => {
    let buyer: TestActor;

    beforeEach(async () => {
      buyer = await createUser(database, 'LEARNER');
    });

    async function startPayment(): Promise<string> {
      const { body } = await request(app.getHttpServer())
        .post(`/batches/${batchId}/checkout`)
        .set(...authHeader(app, buyer))
        .send({})
        .expect(201);
      return body.paymentId;
    }

    function uploadProof(paymentId: string, txn: string) {
      return request(app.getHttpServer())
        .post(`/payments/${paymentId}/upload-proof`)
        .set(...authHeader(app, buyer))
        .send({
          proofUrl: 'https://cdn.example.com/proof.png',
          transactionId: txn,
          payerName: 'Asha Rao',
        });
    }

    async function pendingQueue() {
      const { body } = await request(app.getHttpServer())
        .get('/payments/pending-review')
        .set(...authHeader(app, admin))
        .expect(200);
      return body.data as {
        paymentId: string;
        amount: number;
        proofUrl: string | null;
        payer: { name: string | null; email: string | null };
        product: { title: string; batchId: string | null };
      }[];
    }

    async function myPayment(paymentId: string) {
      const { body } = await request(app.getHttpServer())
        .get(`/payments/my/${paymentId}`)
        .set(...authHeader(app, buyer))
        .expect(200);
      return body;
    }

    it('shows proof, amount, payer and product together', async () => {
      const paymentId = await startPayment();
      await uploadProof(paymentId, 'TXN-100001').expect(201);

      const [entry] = await pendingQueue();

      expect(entry.paymentId).toBe(paymentId);
      expect(entry.amount).toBe(2000);
      expect(entry.proofUrl).toBe('https://cdn.example.com/proof.png');
      expect(entry.payer.name).toBe('Asha Rao');
      expect(entry.payer.email).toBe(buyer.email);
      expect(entry.product.batchId).toBe(batchId);
      expect(entry.product.title).toEqual(expect.any(String));
    });

    it('refuses a rejection with no reason', async () => {
      const paymentId = await startPayment();
      await uploadProof(paymentId, 'TXN-100002').expect(201);

      await request(app.getHttpServer())
        .post(`/payments/${paymentId}/reject`)
        .set(...authHeader(app, admin))
        .send({})
        .expect(400);

      expect(await pendingQueue()).toHaveLength(1);
    });

    it('lets the student read the reason and send new proof', async () => {
      const paymentId = await startPayment();
      await uploadProof(paymentId, 'TXN-100003').expect(201);

      await request(app.getHttpServer())
        .post(`/payments/${paymentId}/reject`)
        .set(...authHeader(app, admin))
        .send({ reason: 'The screenshot is cropped; the amount is not visible.' })
        .expect(200);

      const rejected = await myPayment(paymentId);
      expect(rejected.status).toBe('REJECTED');
      expect(rejected.reviewNotes).toBe(
        'The screenshot is cropped; the amount is not visible.',
      );

      await uploadProof(paymentId, 'TXN-100004').expect(201);

      const retried = await myPayment(paymentId);
      expect(retried.status).toBe('PROOF_UPLOADED');
      expect(await pendingQueue()).toHaveLength(1);
    });

    it('tells the student their proof was refused', async () => {
      const paymentId = await startPayment();
      await uploadProof(paymentId, 'TXN-100005').expect(201);
      const before = await unread(buyer);

      await request(app.getHttpServer())
        .post(`/payments/${paymentId}/reject`)
        .set(...authHeader(app, admin))
        .send({ reason: 'The transaction reference does not match.' })
        .expect(200);

      expect(await unread(buyer)).toBe(before + 1);
    });

    it('grants access and records the actor when a payment is approved', async () => {
      const paymentId = await startPayment();
      await uploadProof(paymentId, 'TXN-100006').expect(201);

      await request(app.getHttpServer())
        .post(`/payments/${paymentId}/approve`)
        .set(...authHeader(app, admin))
        .send({})
        .expect(200);

      const { body: enrolled } = await request(app.getHttpServer())
        .get('/batches/mine')
        .set(...authHeader(app, buyer))
        .expect(200);
      expect(
        (enrolled.data ?? enrolled).map((b: { batchId: string }) => b.batchId),
      ).toContain(batchId);

      const { body: log } = await request(app.getHttpServer())
        .get('/audit-log?action=payment.approve')
        .set(...authHeader(app, admin))
        .expect(200);
      expect(log[0].actorId).toBe(admin.userId);
      expect(log[0].targetId).toBe(paymentId);
    });

    it('records the rejection with the actor and the reason', async () => {
      const paymentId = await startPayment();
      await uploadProof(paymentId, 'TXN-100007').expect(201);

      await request(app.getHttpServer())
        .post(`/payments/${paymentId}/reject`)
        .set(...authHeader(app, admin))
        .send({ reason: 'Duplicate of an earlier submission.' })
        .expect(200);

      const { body } = await request(app.getHttpServer())
        .get('/audit-log?action=payment.reject')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(body[0].actorId).toBe(admin.userId);
      expect(body[0].after.notes).toBe('Duplicate of an earlier submission.');
    });
  });
});
