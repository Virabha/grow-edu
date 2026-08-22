import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import {
  seedDifficultyScale,
  createTaxonomy,
  createQuestion,
  createQuestionGroup,
  text,
} from './support/assessment-factories';

describe('question groups', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let admin: TestActor;
  let instructor: TestActor;
  let learner: TestActor;

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
    clock.set('2026-10-01T09:00:00.000Z');
    admin = await createUser(database, 'PLATFORM_ADMIN');
    instructor = await createUser(database, 'INSTRUCTOR');
    learner = await createUser(database, 'LEARNER');
    await seedDifficultyScale(database);
  });

  const stimulus = text('Read this passage carefully.');

  function createGroup(actor: TestActor, body: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post('/assessment/question-groups')
      .set(...authHeader(app, actor))
      .send({ title: 'Comprehension Set 1', stimulus, ...body });
  }

  function getGroup(actor: TestActor, groupId: string) {
    return request(app.getHttpServer())
      .get(`/assessment/question-groups/${groupId}`)
      .set(...authHeader(app, actor));
  }

  function patchGroup(
    actor: TestActor,
    groupId: string,
    body: Record<string, unknown>,
  ) {
    return request(app.getHttpServer())
      .patch(`/assessment/question-groups/${groupId}`)
      .set(...authHeader(app, actor))
      .send(body);
  }

  function addMember(
    actor: TestActor,
    groupId: string,
    questionId: string,
    order: number,
  ) {
    return request(app.getHttpServer())
      .post(`/assessment/question-groups/${groupId}/members`)
      .set(...authHeader(app, actor))
      .send({ questionId, order });
  }

  function removeMember(
    actor: TestActor,
    groupId: string,
    questionId: string,
  ) {
    return request(app.getHttpServer())
      .delete(`/assessment/question-groups/${groupId}/members/${questionId}`)
      .set(...authHeader(app, actor));
  }

  function retireGroup(actor: TestActor, groupId: string) {
    return request(app.getHttpServer())
      .post(`/assessment/question-groups/${groupId}/retire`)
      .set(...authHeader(app, actor));
  }

  describe('POST /assessment/question-groups', () => {
    it('creates a group with structured stimulus and returns 201', async () => {
      const { body } = await createGroup(admin).expect(201);

      expect(body.groupId).toBeDefined();
      expect(body.title).toBe('Comprehension Set 1');
      expect(body.stimulus).toEqual(stimulus);
      expect(body.isRetired).toBe(false);
    });

    it('instructors can create groups', async () => {
      await createGroup(instructor).expect(201);
    });

    it('rejects unknown content block types in stimulus', async () => {
      await createGroup(admin, {
        stimulus: [{ type: 'UNKNOWN', text: 'bad' }],
      }).expect(400);
    });

    it('rejects an empty stimulus array', async () => {
      await createGroup(admin, { stimulus: [] }).expect(400);
    });

    it('forbids learners from creating groups', async () => {
      await createGroup(learner).expect(403);
    });

    it('forbids unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/assessment/question-groups')
        .send({ title: 'x', stimulus })
        .expect(401);
    });
  });

  describe('GET /assessment/question-groups/:groupId', () => {
    it('returns the stimulus and an empty members list initially', async () => {
      const { body: created } = await createGroup(admin).expect(201);

      const { body } = await getGroup(admin, created.groupId).expect(200);

      expect(body.groupId).toBe(created.groupId);
      expect(body.stimulus).toEqual(stimulus);
      expect(body.members).toEqual([]);
    });

    it('returns 404 for an unknown group', async () => {
      await getGroup(admin, 'no-such-id').expect(404);
    });

    it('returns members in order', async () => {
      const taxonomy = await createTaxonomy(database, admin.userId);
      const groupId = await createQuestionGroup(database, admin.userId, stimulus);
      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const q2 = await createQuestion(database, taxonomy, admin.userId);
      const q3 = await createQuestion(database, taxonomy, admin.userId);

      await addMember(admin, groupId, q3, 3).expect(200);
      await addMember(admin, groupId, q1, 1).expect(200);
      await addMember(admin, groupId, q2, 2).expect(200);

      const { body } = await getGroup(admin, groupId).expect(200);

      const orders = body.members.map(
        (m: { groupOrder: number }) => m.groupOrder,
      );
      expect(orders).toEqual([1, 2, 3]);
    });

    it('returns the stimulus alongside members', async () => {
      const taxonomy = await createTaxonomy(database, admin.userId);
      const groupId = await createQuestionGroup(database, admin.userId, stimulus);
      const q1 = await createQuestion(database, taxonomy, admin.userId);
      await addMember(admin, groupId, q1, 1).expect(200);

      const { body } = await getGroup(admin, groupId).expect(200);

      expect(body.stimulus).toEqual(stimulus);
      expect(body.members).toHaveLength(1);
      expect(body.members[0].questionId).toBe(q1);
    });
  });

  describe('PATCH /assessment/question-groups/:groupId', () => {
    it('updates title', async () => {
      const { body: created } = await createGroup(admin).expect(201);

      const { body } = await patchGroup(admin, created.groupId, {
        title: 'Updated Title',
      }).expect(200);

      expect(body.title).toBe('Updated Title');
    });

    it('updates stimulus', async () => {
      const { body: created } = await createGroup(admin).expect(201);
      const newStimulus = [{ type: 'CODE', language: 'python', code: 'print("hi")' }];

      const { body } = await patchGroup(admin, created.groupId, {
        stimulus: newStimulus,
      }).expect(200);

      expect(body.stimulus).toEqual(newStimulus);
    });

    it('rejects invalid stimulus block types', async () => {
      const { body: created } = await createGroup(admin).expect(201);

      await patchGroup(admin, created.groupId, {
        stimulus: [{ type: 'DIAGRAM' }],
      }).expect(400);
    });

    it('returns 409 when editing a retired group', async () => {
      const { body: created } = await createGroup(admin).expect(201);
      await retireGroup(admin, created.groupId).expect(200);

      await patchGroup(admin, created.groupId, { title: 'New' }).expect(409);
    });
  });

  describe('POST /assessment/question-groups/:groupId/members', () => {
    it('adds a question as a member with the given order', async () => {
      const taxonomy = await createTaxonomy(database, admin.userId);
      const { body: group } = await createGroup(admin).expect(201);
      const questionId = await createQuestion(database, taxonomy, admin.userId);

      const { body } = await addMember(admin, group.groupId, questionId, 1).expect(200);

      expect(body.members).toHaveLength(1);
      expect(body.members[0].questionId).toBe(questionId);
      expect(body.members[0].groupOrder).toBe(1);
    });

    it('refuses if the question already belongs to another group', async () => {
      const taxonomy = await createTaxonomy(database, admin.userId);
      const { body: g1 } = await createGroup(admin).expect(201);
      const { body: g2 } = await createGroup(admin, {
        title: 'Group 2',
      }).expect(201);
      const questionId = await createQuestion(database, taxonomy, admin.userId);

      await addMember(admin, g1.groupId, questionId, 1).expect(200);
      await addMember(admin, g2.groupId, questionId, 1).expect(409);
    });

    it('allows re-assigning a member within the same group (idempotent order update)', async () => {
      const taxonomy = await createTaxonomy(database, admin.userId);
      const { body: group } = await createGroup(admin).expect(201);
      const questionId = await createQuestion(database, taxonomy, admin.userId);

      await addMember(admin, group.groupId, questionId, 1).expect(200);
      await addMember(admin, group.groupId, questionId, 2).expect(200);

      const { body } = await getGroup(admin, group.groupId).expect(200);
      expect(body.members[0].groupOrder).toBe(2);
    });

    it('returns 404 for a non-existent question', async () => {
      const { body: group } = await createGroup(admin).expect(201);

      await addMember(admin, group.groupId, 'no-such-question', 1).expect(404);
    });

    it('returns 404 for a non-existent group', async () => {
      const taxonomy = await createTaxonomy(database, admin.userId);
      const questionId = await createQuestion(database, taxonomy, admin.userId);

      await addMember(admin, 'no-such-group', questionId, 1).expect(404);
    });
  });

  describe('DELETE /assessment/question-groups/:groupId/members/:questionId', () => {
    it('removes a member so it is no longer in the group', async () => {
      const taxonomy = await createTaxonomy(database, admin.userId);
      const { body: group } = await createGroup(admin).expect(201);
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      await addMember(admin, group.groupId, questionId, 1).expect(200);

      const { body } = await removeMember(admin, group.groupId, questionId).expect(200);

      expect(body.members).toHaveLength(0);
    });

    it('returns 404 when the question is not a member', async () => {
      const taxonomy = await createTaxonomy(database, admin.userId);
      const { body: group } = await createGroup(admin).expect(201);
      const questionId = await createQuestion(database, taxonomy, admin.userId);

      await removeMember(admin, group.groupId, questionId).expect(404);
    });

    it('leaves the question independently usable after removal', async () => {
      const taxonomy = await createTaxonomy(database, admin.userId);
      const { body: group } = await createGroup(admin).expect(201);
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      await addMember(admin, group.groupId, questionId, 1).expect(200);
      await removeMember(admin, group.groupId, questionId).expect(200);

      const { body: q } = await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(q.groupId).toBeNull();
    });
  });

  describe('POST /assessment/question-groups/:groupId/retire', () => {
    it('retires the group and returns isRetired true', async () => {
      const { body: group } = await createGroup(admin).expect(201);

      const { body } = await retireGroup(admin, group.groupId).expect(200);

      expect(body.isRetired).toBe(true);
    });

    it('does NOT retire the member questions', async () => {
      const taxonomy = await createTaxonomy(database, admin.userId);
      const { body: group } = await createGroup(admin).expect(201);
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      await addMember(admin, group.groupId, questionId, 1).expect(200);

      await retireGroup(admin, group.groupId).expect(200);

      const { body: q } = await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(q.isRetired).toBe(false);
    });

    it('returns 409 when already retired', async () => {
      const { body: group } = await createGroup(admin).expect(201);
      await retireGroup(admin, group.groupId).expect(200);

      await retireGroup(admin, group.groupId).expect(409);
    });

    it('returns 404 for a non-existent group', async () => {
      await retireGroup(admin, 'no-such-id').expect(404);
    });
  });

  describe('a question can belong to at most one group', () => {
    it('tracks groupId through the bank GET endpoint', async () => {
      const taxonomy = await createTaxonomy(database, admin.userId);
      const { body: group } = await createGroup(admin).expect(201);
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      await addMember(admin, group.groupId, questionId, 1).expect(200);

      const { body: q } = await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(q.groupId).toBe(group.groupId);
      expect(q.groupOrder).toBe(1);
    });
  });
});
