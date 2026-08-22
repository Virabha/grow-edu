import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { and, eq } from 'drizzle-orm';

import {
  batchEnrollments,
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
  assignInstructor,
} from './support/factories';

describe('study tools', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;
  let otherStudent: TestActor;
  let instructor: TestActor;
  let batchId: string;
  let subjectId: string;
  let videoLessonId: string;
  let documentLessonId: string;

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
    otherStudent = await createUser(database, 'LEARNER');
    instructor = await createUser(database, 'INSTRUCTOR');

    batchId = await createBatch(database, admin.userId);
    subjectId = await createSubject(database, batchId);

    await enrol(database, batchId, student.userId);
    await enrol(database, batchId, otherStudent.userId);
    await assignInstructor(database, batchId, instructor.userId);

    videoLessonId = await createLesson(database, subjectId, {
      type: 'VIDEO',
      videoUrl: 'https://cdn.test/v.m3u8',
      duration: 1800,
      order: 1,
      status: 'READY',
    });

    documentLessonId = await createLesson(database, subjectId, {
      type: 'DOCUMENT',
      documentFileKey: 'docs/physics.pdf',
      documentPageCount: 20,
      order: 2,
      status: 'READY',
    });
  });

  describe('Ticket 04 — video bookmarks', () => {
    it('creates a bookmark with timestamp and optional note', async () => {
      const res = await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${videoLessonId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .send({ timestampSeconds: 300, note: 'Important derivation' })
        .expect(201);

      expect(res.body.bookmarkId).toBeDefined();
      expect(res.body.timestampSeconds).toBe(300);
      expect(res.body.note).toBe('Important derivation');
      expect(res.body.userId).toBe(student.userId);
    });

    it('creates a bookmark without a note', async () => {
      const res = await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${videoLessonId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .send({ timestampSeconds: 120 })
        .expect(201);

      expect(res.body.note).toBeNull();
    });

    it('lists bookmarks for a lesson in timestamp order', async () => {
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${videoLessonId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .send({ timestampSeconds: 600 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${videoLessonId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .send({ timestampSeconds: 100 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${videoLessonId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .send({ timestampSeconds: 300 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${videoLessonId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .expect(200);

      const timestamps = (res.body as { timestampSeconds: number }[]).map(
        (b) => b.timestampSeconds,
      );
      expect(timestamps).toEqual([100, 300, 600]);
    });

    it('lists bookmarks across a batch in recency order', async () => {
      const anotherLessonId = await createLesson(database, subjectId, {
        type: 'VIDEO',
        videoUrl: 'https://cdn.test/v2.m3u8',
        order: 3,
        status: 'READY',
      });

      clock.set(new Date('2026-09-01T10:00:00Z'));
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${videoLessonId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .send({ timestampSeconds: 100 })
        .expect(201);

      clock.set(new Date('2026-09-01T11:00:00Z'));
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${anotherLessonId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .send({ timestampSeconds: 200 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .expect(200);

      const items = res.body as { timestampSeconds: number }[];
      expect(items).toHaveLength(2);
      expect(items[0].timestampSeconds).toBe(200);
      expect(items[1].timestampSeconds).toBe(100);
    });

    it('a student sees only their own bookmarks', async () => {
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${videoLessonId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .send({ timestampSeconds: 300 })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${videoLessonId}/video-bookmarks`)
        .set(...authHeader(app, otherStudent))
        .expect(200);

      expect(res.body).toHaveLength(0);

      const batchRes = await request(app.getHttpServer())
        .get(`/batches/${batchId}/video-bookmarks`)
        .set(...authHeader(app, otherStudent))
        .expect(200);

      expect(batchRes.body).toHaveLength(0);
    });

    it('bookmark survives the lesson video being re-encoded', async () => {
      const created = await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${videoLessonId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .send({ timestampSeconds: 450, note: 'Before re-encode' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/batches/${batchId}/lessons/${videoLessonId}`)
        .set(...authHeader(app, admin))
        .send({ videoUrl: 'https://cdn.test/v-hd.m3u8', duration: 1900 })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${videoLessonId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect((res.body as { bookmarkId: string }[])[0].bookmarkId).toBe(
        created.body.bookmarkId,
      );
      expect((res.body as { note: string }[])[0].note).toBe('Before re-encode');
    });

    it('deleting a bookmark removes it and nothing else', async () => {
      const b1 = await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${videoLessonId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .send({ timestampSeconds: 100 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${videoLessonId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .send({ timestampSeconds: 200 })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/batches/${batchId}/video-bookmarks/${b1.body.bookmarkId}`)
        .set(...authHeader(app, student))
        .expect(204);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${videoLessonId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect((res.body as { timestampSeconds: number }[])[0].timestampSeconds).toBe(200);
    });

    it('cannot delete another student\'s bookmark', async () => {
      const b = await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${videoLessonId}/video-bookmarks`)
        .set(...authHeader(app, student))
        .send({ timestampSeconds: 300 })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/batches/${batchId}/video-bookmarks/${b.body.bookmarkId}`)
        .set(...authHeader(app, otherStudent))
        .expect(403);
    });
  });

  describe('Ticket 11 — lesson notes', () => {
    it('creates a note for a lesson', async () => {
      const res = await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, student))
        .send({ body: 'Newton\'s second law recap' })
        .expect(200);

      expect(res.body.noteId).toBeDefined();
      expect(res.body.body).toBe('Newton\'s second law recap');
      expect(res.body.userId).toBe(student.userId);
    });

    it('editing a note does not create a second note', async () => {
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, student))
        .send({ body: 'Original content' })
        .expect(200);

      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, student))
        .send({ body: 'Updated content' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body.body).toBe('Updated content');
    });

    it('note is readable only by its author — instructor cannot read student note', async () => {
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, student))
        .send({ body: 'Private note' })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, instructor))
        .expect(404);
    });

    it('platform admin cannot read student note', async () => {
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, student))
        .send({ body: 'Private note' })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, admin))
        .expect(404);
    });

    it('soft-deletes a note without removing the lesson', async () => {
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, student))
        .send({ body: 'To be deleted' })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, student))
        .expect(204);

      await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, student))
        .expect(404);

      const lessonRes = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${videoLessonId}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(lessonRes.body.lessonId).toBe(videoLessonId);
    });

    it('exports all notes for a batch as a JSON document', async () => {
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, student))
        .send({ body: 'Note on video lesson' })
        .expect(200);

      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${documentLessonId}/note`)
        .set(...authHeader(app, student))
        .send({ body: 'Note on document lesson' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/notes/export`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body.batchId).toBe(batchId);
      expect(res.body.userId).toBe(student.userId);
      expect(res.body.notes).toHaveLength(2);
    });

    it('export only contains the requesting student\'s notes', async () => {
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, student))
        .send({ body: 'My note' })
        .expect(200);

      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, otherStudent))
        .send({ body: 'Other note' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/notes/export`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body.notes).toHaveLength(1);
      expect(res.body.notes[0].body).toBe('My note');
    });

    it('notes survive the lesson being updated', async () => {
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, student))
        .send({ body: 'Survives update' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/batches/${batchId}/lessons/${videoLessonId}`)
        .set(...authHeader(app, admin))
        .send({ title: 'Renamed lesson' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${videoLessonId}/note`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body.body).toBe('Survives update');
    });
  });

  describe('Ticket 12 — lesson bookmarks', () => {
    it('bookmarks any lesson type', async () => {
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/bookmark`)
        .set(...authHeader(app, student))
        .expect(200);

      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${documentLessonId}/bookmark`)
        .set(...authHeader(app, student))
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/bookmarks`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body).toHaveLength(2);
    });

    it('bookmarks list in recency order', async () => {
      const lessonA = await createLesson(database, subjectId, {
        type: 'TEXT',
        order: 3,
        status: 'READY',
      });
      const lessonB = await createLesson(database, subjectId, {
        type: 'TEXT',
        order: 4,
        status: 'READY',
      });

      clock.set(new Date('2026-09-01T09:00:00Z'));
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${lessonA}/bookmark`)
        .set(...authHeader(app, student))
        .expect(200);

      clock.set(new Date('2026-09-01T10:00:00Z'));
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${lessonB}/bookmark`)
        .set(...authHeader(app, student))
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/bookmarks`)
        .set(...authHeader(app, student))
        .expect(200);

      expect((res.body as { lessonId: string }[])[0].lessonId).toBe(lessonB);
      expect((res.body as { lessonId: string }[])[1].lessonId).toBe(lessonA);
    });

    it('bookmarking twice does not create a duplicate', async () => {
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/bookmark`)
        .set(...authHeader(app, student))
        .expect(200);

      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/bookmark`)
        .set(...authHeader(app, student))
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/bookmarks`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body).toHaveLength(1);
    });

    it('bookmark to a deleted lesson stops appearing', async () => {
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/bookmark`)
        .set(...authHeader(app, student))
        .expect(200);

      await database.db
        .update(lessons)
        .set({ isDeleted: true })
        .where(eq(lessons.lessonId, videoLessonId));

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/bookmarks`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body).toHaveLength(0);
    });

    it('bookmark to a lesson the student loses enrollment access to stops appearing', async () => {
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/bookmark`)
        .set(...authHeader(app, student))
        .expect(200);

      await database.db
        .update(batchEnrollments)
        .set({ status: 'REVOKED' })
        .where(
          and(
            eq(batchEnrollments.batchId, batchId),
            eq(batchEnrollments.userId, student.userId),
          ),
        );

      await request(app.getHttpServer())
        .get(`/batches/${batchId}/bookmarks`)
        .set(...authHeader(app, student))
        .expect(404);
    });

    it('removing a bookmark leaves the lesson untouched', async () => {
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/bookmark`)
        .set(...authHeader(app, student))
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/batches/${batchId}/lessons/${videoLessonId}/bookmark`)
        .set(...authHeader(app, student))
        .expect(204);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/bookmarks`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body).toHaveLength(0);

      await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${videoLessonId}`)
        .set(...authHeader(app, student))
        .expect(200);
    });

    it('list is per student', async () => {
      await request(app.getHttpServer())
        .put(`/batches/${batchId}/lessons/${videoLessonId}/bookmark`)
        .set(...authHeader(app, student))
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/bookmarks`)
        .set(...authHeader(app, otherStudent))
        .expect(200);

      expect(res.body).toHaveLength(0);
    });
  });

  describe('Ticket 14 — document annotations', () => {
    it('creates an annotation anchored to a position', async () => {
      const res = await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .send({
          page: 3,
          startOffset: 100,
          endOffset: 150,
          quotedText: 'kinetic energy is',
          note: 'Key definition',
          colour: '#FFFF00',
        })
        .expect(201);

      expect(res.body.annotationId).toBeDefined();
      expect(res.body.page).toBe(3);
      expect(res.body.startOffset).toBe(100);
      expect(res.body.endOffset).toBe(150);
      expect(res.body.quotedText).toBe('kinetic energy is');
      expect(res.body.state).toBe('ANCHORED');
      expect(res.body.positionReliable).toBe(true);
    });

    it('reads annotations back at the correct position', async () => {
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .send({
          page: 1,
          startOffset: 50,
          endOffset: 80,
          quotedText: 'Newton first law',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].startOffset).toBe(50);
      expect(res.body[0].endOffset).toBe(80);
      expect(res.body[0].positionReliable).toBe(true);
    });

    it('annotations are private — another student cannot see them', async () => {
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .send({
          page: 1,
          startOffset: 10,
          endOffset: 40,
          quotedText: 'force equals mass',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, otherStudent))
        .expect(200);

      expect(res.body).toHaveLength(0);
    });

    it('instructor cannot see student annotations', async () => {
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .send({
          page: 2,
          startOffset: 20,
          endOffset: 60,
          quotedText: 'momentum is conserved',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(res.body).toHaveLength(0);
    });

    it('replacing the document orphans annotations with suppressed offsets', async () => {
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .send({
          page: 1,
          startOffset: 100,
          endOffset: 130,
          quotedText: 'text that may move',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/batches/${batchId}/lessons/${documentLessonId}`)
        .set(...authHeader(app, admin))
        .send({ documentFileKey: 'docs/physics-v2.pdf', documentPageCount: 22 })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].state).toBe('ORPHANED');
      expect(res.body[0].startOffset).toBeNull();
      expect(res.body[0].endOffset).toBeNull();
      expect(res.body[0].positionReliable).toBe(false);
    });

    it('reconcile re-anchors annotation when quoted text is found', async () => {
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .send({
          page: 1,
          startOffset: 0,
          endOffset: 18,
          quotedText: 'kinetic energy is ',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/batches/${batchId}/lessons/${documentLessonId}`)
        .set(...authHeader(app, admin))
        .send({ documentFileKey: 'docs/physics-v2.pdf', documentPageCount: 22 })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .expect(200);

      const reconcileRes = await request(app.getHttpServer())
        .post(
          `/batches/${batchId}/lessons/${documentLessonId}/annotations/reconcile`,
        )
        .set(...authHeader(app, student))
        .send({
          documentText: 'Introduction to physics. kinetic energy is  half mv squared.',
        })
        .expect(201);

      expect(reconcileRes.body).toHaveLength(1);
      expect(reconcileRes.body[0].state).toBe('ANCHORED');
      expect(reconcileRes.body[0].positionReliable).toBe(true);
      expect(reconcileRes.body[0].startOffset).toBe(25);
    });

    it('reconcile leaves annotation orphaned when quoted text is not found', async () => {
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .send({
          page: 1,
          startOffset: 0,
          endOffset: 20,
          quotedText: 'deleted section text',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/batches/${batchId}/lessons/${documentLessonId}`)
        .set(...authHeader(app, admin))
        .send({ documentFileKey: 'docs/physics-v2.pdf', documentPageCount: 22 })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .expect(200);

      const reconcileRes = await request(app.getHttpServer())
        .post(
          `/batches/${batchId}/lessons/${documentLessonId}/annotations/reconcile`,
        )
        .set(...authHeader(app, student))
        .send({ documentText: 'Completely different content in new version.' })
        .expect(201);

      expect(reconcileRes.body[0].state).toBe('ORPHANED');
      expect(reconcileRes.body[0].positionReliable).toBe(false);
    });

    it('orphaned annotation is never silently shown as anchored', async () => {
      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .send({
          page: 2,
          startOffset: 50,
          endOffset: 90,
          quotedText: 'stale reference here',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/batches/${batchId}/lessons/${documentLessonId}`)
        .set(...authHeader(app, admin))
        .send({ documentFileKey: 'docs/physics-v2.pdf' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .expect(200);

      const annotation = res.body[0] as {
        state: string;
        positionReliable: boolean;
        startOffset: unknown;
        endOffset: unknown;
      };
      expect(annotation.state).toBe('ORPHANED');
      expect(annotation.positionReliable).toBe(false);
      expect(annotation.startOffset).toBeNull();
      expect(annotation.endOffset).toBeNull();
    });

    it('deleting an annotation removes only it', async () => {
      const a1 = await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .send({
          page: 1,
          startOffset: 10,
          endOffset: 30,
          quotedText: 'first annotation',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .send({
          page: 2,
          startOffset: 50,
          endOffset: 80,
          quotedText: 'second annotation',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(
          `/batches/${batchId}/lessons/${documentLessonId}/annotations/${a1.body.annotationId}`,
        )
        .set(...authHeader(app, student))
        .expect(204);

      const res = await request(app.getHttpServer())
        .get(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].quotedText).toBe('second annotation');
    });

    it('cannot delete another student annotation', async () => {
      const a = await request(app.getHttpServer())
        .post(`/batches/${batchId}/lessons/${documentLessonId}/annotations`)
        .set(...authHeader(app, student))
        .send({
          page: 1,
          startOffset: 0,
          endOffset: 20,
          quotedText: 'student annotation',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(
          `/batches/${batchId}/lessons/${documentLessonId}/annotations/${a.body.annotationId}`,
        )
        .set(...authHeader(app, otherStudent))
        .expect(403);
    });
  });
});
