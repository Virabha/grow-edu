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
  assignInstructor,
} from './support/factories';

describe('community — batch discussion feed', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let instructor: TestActor;
  let studentA: TestActor;
  let studentB: TestActor;
  let batchId: string;
  let otherBatchId: string;

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
    instructor = await createUser(database, 'INSTRUCTOR');
    studentA = await createUser(database, 'LEARNER');
    studentB = await createUser(database, 'LEARNER');

    batchId = await createBatch(database, admin.userId);
    otherBatchId = await createBatch(database, admin.userId);

    await enrol(database, batchId, studentA.userId);
    await enrol(database, batchId, studentB.userId);
    await assignInstructor(database, batchId, instructor.userId);
    await enrol(database, otherBatchId, studentA.userId);
  });

  function feedUrl(bid: string) {
    return `/batches/${bid}/feed`;
  }

  it('enrolled student can post to the feed', async () => {
    const { body, status } = await request(app.getHttpServer())
      .post(feedUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ body: 'Hello class!' });

    expect(status).toBe(201);
    expect(body.postId).toBeDefined();
    expect(body.authorId).toBe(studentA.userId);
    expect(body.authorKind).toBe('STUDENT');
  });

  it('enrolled student can list feed posts', async () => {
    await request(app.getHttpServer())
      .post(feedUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ body: 'First post' })
      .expect(201);

    const { body } = await request(app.getHttpServer())
      .get(feedUrl(batchId))
      .set(...authHeader(app, studentA))
      .expect(200);

    expect(body).toHaveLength(1);
    expect(body[0].body).toBe('First post');
  });

  it('instructor posts are distinguishable — authorKind is INSTRUCTOR', async () => {
    const { body } = await request(app.getHttpServer())
      .post(feedUrl(batchId))
      .set(...authHeader(app, instructor))
      .send({ body: 'Instructor announcement' })
      .expect(201);

    expect(body.authorKind).toBe('INSTRUCTOR');
  });

  it('student cannot read or post to another batch feed (cross-batch scoping)', async () => {
    const stranger = await createUser(database, 'LEARNER');
    await enrol(database, otherBatchId, stranger.userId);

    await request(app.getHttpServer())
      .get(feedUrl(batchId))
      .set(...authHeader(app, stranger))
      .expect(404);

    await request(app.getHttpServer())
      .post(feedUrl(batchId))
      .set(...authHeader(app, stranger))
      .send({ body: 'Sneaking in' })
      .expect(404);
  });

  it('unenrolled student cannot read the feed of a batch', async () => {
    const stranger = await createUser(database, 'LEARNER');

    await request(app.getHttpServer())
      .get(feedUrl(batchId))
      .set(...authHeader(app, stranger))
      .expect(404);
  });

  it('instructor can read feed posts in their assigned batch', async () => {
    await request(app.getHttpServer())
      .post(feedUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ body: 'Question for teacher' })
      .expect(201);

    const { body } = await request(app.getHttpServer())
      .get(feedUrl(batchId))
      .set(...authHeader(app, instructor))
      .expect(200);

    expect(body).toHaveLength(1);
  });

  it('admin can read all posts in any batch', async () => {
    await request(app.getHttpServer())
      .post(feedUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ body: 'Post' })
      .expect(201);

    const { body } = await request(app.getHttpServer())
      .get(feedUrl(batchId))
      .set(...authHeader(app, admin))
      .expect(200);

    expect(body).toHaveLength(1);
  });

  it('student can reply to a post', async () => {
    const { body: post } = await request(app.getHttpServer())
      .post(feedUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ body: 'Top level post' })
      .expect(201);

    const { body: reply, status } = await request(app.getHttpServer())
      .post(`${feedUrl(batchId)}/${post.postId}/replies`)
      .set(...authHeader(app, studentB))
      .send({ body: 'My reply' });

    expect(status).toBe(201);
    expect(reply.parentPostId).toBe(post.postId);
    expect(reply.authorKind).toBe('STUDENT');
  });

  it('removed post does not appear to students but stays visible to staff', async () => {
    const { body: post } = await request(app.getHttpServer())
      .post(feedUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ body: 'Will be removed' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`${feedUrl(batchId)}/${post.postId}`)
      .set(...authHeader(app, admin))
      .send({ reason: 'spam' })
      .expect(200);

    const { body: studentFeed } = await request(app.getHttpServer())
      .get(feedUrl(batchId))
      .set(...authHeader(app, studentA))
      .expect(200);
    expect(studentFeed.find((p: { postId: string }) => p.postId === post.postId)).toBeUndefined();

    const { body: staffFeed } = await request(app.getHttpServer())
      .get(feedUrl(batchId))
      .set(...authHeader(app, instructor))
      .expect(200);
    const retained = staffFeed.find((p: { postId: string }) => p.postId === post.postId);
    expect(retained).toBeDefined();
    expect(retained.removedAt).toBeTruthy();
  });

  it('student cannot remove a post', async () => {
    const { body: post } = await request(app.getHttpServer())
      .post(feedUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ body: 'I will try to delete this' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`${feedUrl(batchId)}/${post.postId}`)
      .set(...authHeader(app, studentA))
      .send({ reason: 'testing' })
      .expect(404);
  });
});

describe('community — study groups', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let instructor: TestActor;
  let studentA: TestActor;
  let studentB: TestActor;
  let studentC: TestActor;
  let batchId: string;
  let otherBatchId: string;

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
    instructor = await createUser(database, 'INSTRUCTOR');
    studentA = await createUser(database, 'LEARNER');
    studentB = await createUser(database, 'LEARNER');
    studentC = await createUser(database, 'LEARNER');

    batchId = await createBatch(database, admin.userId);
    otherBatchId = await createBatch(database, admin.userId);

    await enrol(database, batchId, studentA.userId);
    await enrol(database, batchId, studentB.userId);
    await enrol(database, batchId, studentC.userId);
    await assignInstructor(database, batchId, instructor.userId);
    await enrol(database, otherBatchId, studentB.userId);
  });

  function groupsUrl(bid: string) {
    return `/batches/${bid}/study-groups`;
  }

  it('enrolled student can create a study group', async () => {
    const { body, status } = await request(app.getHttpServer())
      .post(groupsUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ name: 'Physics Study Crew', description: 'Optics and waves' });

    expect(status).toBe(201);
    expect(body.groupId).toBeDefined();
    expect(body.batchId).toBe(batchId);
    expect(body.name).toBe('Physics Study Crew');
  });

  it('group belongs to exactly one batch — cannot be created in another batch', async () => {
    const stranger = await createUser(database, 'LEARNER');
    await enrol(database, otherBatchId, stranger.userId);

    await request(app.getHttpServer())
      .post(groupsUrl(batchId))
      .set(...authHeader(app, stranger))
      .send({ name: 'Cross-batch attempt' })
      .expect(404);
  });

  it('student cannot see a group they do not belong to', async () => {
    const { body: group } = await request(app.getHttpServer())
      .post(groupsUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ name: 'Private group' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`${groupsUrl(batchId)}/${group.groupId}`)
      .set(...authHeader(app, studentB))
      .expect(404);
  });

  it('instructor can read every group in their batch', async () => {
    const { body: group } = await request(app.getHttpServer())
      .post(groupsUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ name: 'A student group' })
      .expect(201);

    const { body } = await request(app.getHttpServer())
      .get(`${groupsUrl(batchId)}/${group.groupId}`)
      .set(...authHeader(app, instructor))
      .expect(200);

    expect(body.groupId).toBe(group.groupId);
  });

  it('admin can read every group in any batch', async () => {
    const { body: group } = await request(app.getHttpServer())
      .post(groupsUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ name: 'Another group' })
      .expect(201);

    const { body } = await request(app.getHttpServer())
      .get(`${groupsUrl(batchId)}/${group.groupId}`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(body.groupId).toBe(group.groupId);
  });

  it('student can join a group that has room', async () => {
    const { body: group } = await request(app.getHttpServer())
      .post(groupsUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ name: 'Join test' })
      .expect(201);

    const { body } = await request(app.getHttpServer())
      .post(`${groupsUrl(batchId)}/${group.groupId}/join`)
      .set(...authHeader(app, studentB))
      .expect(201);

    expect(body.joined).toBe(true);
  });

  it('student from another batch cannot join this group', async () => {
    const { body: group } = await request(app.getHttpServer())
      .post(groupsUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ name: 'Scoped group' })
      .expect(201);

    const outsider = await createUser(database, 'LEARNER');
    await enrol(database, otherBatchId, outsider.userId);

    await request(app.getHttpServer())
      .post(`${groupsUrl(batchId)}/${group.groupId}/join`)
      .set(...authHeader(app, outsider))
      .expect(404);
  });

  it('staff cannot join a student study group', async () => {
    const { body: group } = await request(app.getHttpServer())
      .post(groupsUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ name: 'No staff allowed' })
      .expect(201);

    const { status } = await request(app.getHttpServer())
      .post(`${groupsUrl(batchId)}/${group.groupId}/join`)
      .set(...authHeader(app, instructor));

    expect(status).toBe(400);
  });

  it('student can send a message and member can read it', async () => {
    const { body: group } = await request(app.getHttpServer())
      .post(groupsUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ name: 'Messaging group' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${groupsUrl(batchId)}/${group.groupId}/join`)
      .set(...authHeader(app, studentB))
      .expect(201);

    await request(app.getHttpServer())
      .post(`${groupsUrl(batchId)}/${group.groupId}/messages`)
      .set(...authHeader(app, studentA))
      .send({ body: 'Hey everyone!' })
      .expect(201);

    const { body: messages } = await request(app.getHttpServer())
      .get(`${groupsUrl(batchId)}/${group.groupId}/messages`)
      .set(...authHeader(app, studentB))
      .expect(200);

    expect(messages).toHaveLength(1);
    expect(messages[0].body).toBe('Hey everyone!');
    expect(messages[0].authorKind).toBe('STUDENT');
  });

  it('non-member student cannot read group messages', async () => {
    const { body: group } = await request(app.getHttpServer())
      .post(groupsUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ name: 'Private messages' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${groupsUrl(batchId)}/${group.groupId}/messages`)
      .set(...authHeader(app, studentA))
      .send({ body: 'Secret' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`${groupsUrl(batchId)}/${group.groupId}/messages`)
      .set(...authHeader(app, studentC))
      .expect(404);
  });

  it('instructor can read all messages in a group (for moderation)', async () => {
    const { body: group } = await request(app.getHttpServer())
      .post(groupsUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ name: 'Moderated group' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${groupsUrl(batchId)}/${group.groupId}/messages`)
      .set(...authHeader(app, studentA))
      .send({ body: 'Normal message' })
      .expect(201);

    const { body: messages } = await request(app.getHttpServer())
      .get(`${groupsUrl(batchId)}/${group.groupId}/messages`)
      .set(...authHeader(app, instructor))
      .expect(200);

    expect(messages).toHaveLength(1);
  });

  it('staff cannot send messages to study groups (no DM surface)', async () => {
    const { body: group } = await request(app.getHttpServer())
      .post(groupsUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ name: 'No staff messages' })
      .expect(201);

    const { status } = await request(app.getHttpServer())
      .post(`${groupsUrl(batchId)}/${group.groupId}/messages`)
      .set(...authHeader(app, instructor))
      .send({ body: 'Staff broadcast' });

    expect(status).toBe(403);
  });

  it('removed message hidden from students but visible to staff', async () => {
    const { body: group } = await request(app.getHttpServer())
      .post(groupsUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ name: 'Remove test' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${groupsUrl(batchId)}/${group.groupId}/join`)
      .set(...authHeader(app, studentB))
      .expect(201);

    const { body: msg } = await request(app.getHttpServer())
      .post(`${groupsUrl(batchId)}/${group.groupId}/messages`)
      .set(...authHeader(app, studentA))
      .send({ body: 'Will be removed' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`${groupsUrl(batchId)}/${group.groupId}/messages/${msg.messageId}`)
      .set(...authHeader(app, admin))
      .send({ reason: 'inappropriate' })
      .expect(200);

    const { body: studentMessages } = await request(app.getHttpServer())
      .get(`${groupsUrl(batchId)}/${group.groupId}/messages`)
      .set(...authHeader(app, studentB))
      .expect(200);
    expect(studentMessages.find((m: { messageId: string }) => m.messageId === msg.messageId)).toBeUndefined();

    const { body: staffMessages } = await request(app.getHttpServer())
      .get(`${groupsUrl(batchId)}/${group.groupId}/messages`)
      .set(...authHeader(app, instructor))
      .expect(200);
    const retained = staffMessages.find((m: { messageId: string }) => m.messageId === msg.messageId);
    expect(retained).toBeDefined();
    expect(retained.removedAt).toBeTruthy();
  });

  it('cross-batch scoping: student cannot list groups from another batch', async () => {
    await request(app.getHttpServer())
      .post(groupsUrl(batchId))
      .set(...authHeader(app, studentA))
      .send({ name: 'Batch A group' })
      .expect(201);

    const outsider = await createUser(database, 'LEARNER');
    await enrol(database, otherBatchId, outsider.userId);

    await request(app.getHttpServer())
      .get(groupsUrl(batchId))
      .set(...authHeader(app, outsider))
      .expect(404);
  });

  it('no route addresses a message to an individual student — all messages are group-scoped', () => {
    const httpServer = app.getHttpServer();
    const router = httpServer._events?.request?._router ?? httpServer._events?.request;
    const routes: Array<{ path: string; methods: Record<string, boolean> }> = [];

    if (router && router.stack) {
      for (const layer of router.stack) {
        if (layer.route) {
          routes.push({ path: layer.route.path, methods: layer.route.methods });
        }
      }
    }

    const dmRoutes = routes.filter((r) => {
      const path = r.path as string;
      return (
        path.includes('direct-message') ||
        path.includes('/dm/') ||
        path.includes('/message-user/') ||
        (path.includes('/messages') && !path.includes(':groupId') && !path.includes('/moderation'))
      );
    });

    expect(dmRoutes).toHaveLength(0);
  });
});

describe('community — reporting and moderation queue', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  let admin: TestActor;
  let instructor: TestActor;
  let studentA: TestActor;
  let studentB: TestActor;
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
    instructor = await createUser(database, 'INSTRUCTOR');
    studentA = await createUser(database, 'LEARNER');
    studentB = await createUser(database, 'LEARNER');

    batchId = await createBatch(database, admin.userId);

    await enrol(database, batchId, studentA.userId);
    await enrol(database, batchId, studentB.userId);
    await assignInstructor(database, batchId, instructor.userId);
  });

  async function createPost() {
    const { body } = await request(app.getHttpServer())
      .post(`/batches/${batchId}/feed`)
      .set(...authHeader(app, studentA))
      .send({ body: 'Reportable post' })
      .expect(201);
    return body as { postId: string };
  }

  it('student can report a feed post with a reason', async () => {
    const post = await createPost();

    const { body, status } = await request(app.getHttpServer())
      .post(`/batches/${batchId}/moderation/reports`)
      .set(...authHeader(app, studentB))
      .send({ targetKind: 'FEED_POST', targetId: post.postId, reason: 'Spam' });

    expect(status).toBe(201);
    expect(body.reportId).toBeDefined();
    expect(body.targetKind).toBe('FEED_POST');
    expect(body.targetId).toBe(post.postId);
    expect(body.status).toBe('OPEN');
  });

  it('student cannot see who reported what — reportedBy is not in response', async () => {
    const post = await createPost();

    const { body } = await request(app.getHttpServer())
      .post(`/batches/${batchId}/moderation/reports`)
      .set(...authHeader(app, studentB))
      .send({ targetKind: 'FEED_POST', targetId: post.postId, reason: 'Spam' })
      .expect(201);

    expect(body).not.toHaveProperty('reportedBy');
  });

  it('reports appear in the staff queue scoped to their batch', async () => {
    const post = await createPost();

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/moderation/reports`)
      .set(...authHeader(app, studentB))
      .send({ targetKind: 'FEED_POST', targetId: post.postId, reason: 'Spam' })
      .expect(201);

    const { body } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/moderation/reports`)
      .set(...authHeader(app, instructor))
      .expect(200);

    expect(body).toHaveLength(1);
    expect(body[0].batchId).toBe(batchId);
  });

  it('student cannot access the moderation queue', async () => {
    await request(app.getHttpServer())
      .get(`/batches/${batchId}/moderation/reports`)
      .set(...authHeader(app, studentA))
      .expect(404);
  });

  it('staff can resolve a report and outcome is recorded', async () => {
    const post = await createPost();

    const { body: report } = await request(app.getHttpServer())
      .post(`/batches/${batchId}/moderation/reports`)
      .set(...authHeader(app, studentB))
      .send({ targetKind: 'FEED_POST', targetId: post.postId, reason: 'Abusive' })
      .expect(201);

    const { body: resolved } = await request(app.getHttpServer())
      .patch(`/batches/${batchId}/moderation/reports/${report.reportId}`)
      .set(...authHeader(app, instructor))
      .send({ status: 'RESOLVED', outcome: 'Post removed and warned' })
      .expect(200);

    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.resolvedBy).toBe(instructor.userId);
    expect(resolved.outcome).toBe('Post removed and warned');
    expect(resolved.resolvedAt).toBeTruthy();
  });

  it('staff can dismiss a report', async () => {
    const post = await createPost();

    const { body: report } = await request(app.getHttpServer())
      .post(`/batches/${batchId}/moderation/reports`)
      .set(...authHeader(app, studentB))
      .send({ targetKind: 'FEED_POST', targetId: post.postId, reason: 'Unclear' })
      .expect(201);

    const { body: dismissed } = await request(app.getHttpServer())
      .patch(`/batches/${batchId}/moderation/reports/${report.reportId}`)
      .set(...authHeader(app, admin))
      .send({ status: 'DISMISSED' })
      .expect(200);

    expect(dismissed.status).toBe('DISMISSED');
  });

  it('a student cannot submit duplicate reports for the same target', async () => {
    const post = await createPost();

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/moderation/reports`)
      .set(...authHeader(app, studentB))
      .send({ targetKind: 'FEED_POST', targetId: post.postId, reason: 'First' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/moderation/reports`)
      .set(...authHeader(app, studentB))
      .send({ targetKind: 'FEED_POST', targetId: post.postId, reason: 'Duplicate' })
      .expect(409);
  });

  it('reported post is still readable to staff after removal', async () => {
    const post = await createPost();

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/moderation/reports`)
      .set(...authHeader(app, studentB))
      .send({ targetKind: 'FEED_POST', targetId: post.postId, reason: 'Spam' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/batches/${batchId}/feed/${post.postId}`)
      .set(...authHeader(app, admin))
      .send({ reason: 'spam' })
      .expect(200);

    const { body: queue } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/moderation/reports`)
      .set(...authHeader(app, instructor))
      .expect(200);

    const report = queue.find((r: { targetId: string }) => r.targetId === post.postId);
    expect(report).toBeDefined();

    const { body: feed } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/feed`)
      .set(...authHeader(app, instructor))
      .expect(200);

    const retainedPost = feed.find((p: { postId: string }) => p.postId === post.postId);
    expect(retainedPost).toBeDefined();
    expect(retainedPost.removedAt).toBeTruthy();
  });

  it('staff from another batch cannot access the moderation queue', async () => {
    const otherBatchId = await createBatch(database, admin.userId);
    const otherInstructor = await createUser(database, 'INSTRUCTOR');
    await assignInstructor(database, otherBatchId, otherInstructor.userId);

    await request(app.getHttpServer())
      .get(`/batches/${batchId}/moderation/reports`)
      .set(...authHeader(app, otherInstructor))
      .expect(404);
  });

  it('student can report a group message', async () => {
    const { body: group } = await request(app.getHttpServer())
      .post(`/batches/${batchId}/study-groups`)
      .set(...authHeader(app, studentA))
      .send({ name: 'Report test group' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/study-groups/${group.groupId}/join`)
      .set(...authHeader(app, studentB))
      .expect(201);

    const { body: msg } = await request(app.getHttpServer())
      .post(`/batches/${batchId}/study-groups/${group.groupId}/messages`)
      .set(...authHeader(app, studentA))
      .send({ body: 'Offensive message' })
      .expect(201);

    const { body, status } = await request(app.getHttpServer())
      .post(`/batches/${batchId}/moderation/reports`)
      .set(...authHeader(app, studentB))
      .send({ targetKind: 'GROUP_MESSAGE', targetId: msg.messageId, reason: 'Offensive' });

    expect(status).toBe(201);
    expect(body.targetKind).toBe('GROUP_MESSAGE');
    expect(body.targetId).toBe(msg.messageId);
    expect(body).not.toHaveProperty('reportedBy');
  });
});
