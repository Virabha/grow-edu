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
} from './support/assessment-factories';

describe('assessment taxonomy', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let admin: TestActor;
  let instructor: TestActor;

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
  });

  describe('hierarchy creation', () => {
    it('creates a subject, a topic under it and a sub-topic under that', async () => {
      const { body: subject } = await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'SUBJECT', name: 'Mathematics' })
        .expect(201);

      expect(subject.nodeId).toBeDefined();
      expect(subject.kind).toBe('SUBJECT');
      expect(subject.name).toBe('Mathematics');
      expect(subject.parentId).toBeNull();
      expect(subject.isRetired).toBe(false);

      const { body: topic } = await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'TOPIC', name: 'Algebra', parentId: subject.nodeId })
        .expect(201);

      expect(topic.kind).toBe('TOPIC');
      expect(topic.parentId).toBe(subject.nodeId);

      const { body: subTopic } = await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'SUB_TOPIC', name: 'Quadratics', parentId: topic.nodeId })
        .expect(201);

      expect(subTopic.kind).toBe('SUB_TOPIC');
      expect(subTopic.parentId).toBe(topic.nodeId);
    });

    it('refuses a topic without a parent', async () => {
      await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'TOPIC', name: 'Orphan' })
        .expect(400);
    });

    it('refuses a sub-topic under a subject', async () => {
      const { body: subject } = await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'SUBJECT', name: 'Physics' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'SUB_TOPIC', name: 'Mechanics', parentId: subject.nodeId })
        .expect(400);
    });

    it('refuses a sub-topic with no parent at all', async () => {
      await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'SUB_TOPIC', name: 'Orphaned subtopic' })
        .expect(400);
    });

    it('refuses a subject with a parent', async () => {
      const { body: subject } = await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'SUBJECT', name: 'Biology' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'SUBJECT', name: 'Cell Biology', parentId: subject.nodeId })
        .expect(400);
    });

    it('lists nodes visible to instructors too', async () => {
      const { body: subject } = await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'SUBJECT', name: 'Chemistry' })
        .expect(201);

      const { body: nodes } = await request(app.getHttpServer())
        .get('/assessment/taxonomy/nodes?kind=SUBJECT')
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(nodes.map((n: { nodeId: string }) => n.nodeId)).toContain(subject.nodeId);
    });

    it('returns the taxonomy as a tree with children nested', async () => {
      const { body: subject } = await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'SUBJECT', name: 'Science' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'TOPIC', name: 'Biology', parentId: subject.nodeId })
        .expect(201);

      const { body: tree } = await request(app.getHttpServer())
        .get('/assessment/taxonomy/tree')
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(Array.isArray(tree)).toBe(true);
      const scienceNode = tree.find((n: { nodeId: string }) => n.nodeId === subject.nodeId);
      expect(scienceNode).toBeDefined();
      expect(scienceNode.children).toHaveLength(1);
      expect(scienceNode.children[0].name).toBe('Biology');
    });
  });

  describe('rename', () => {
    it('rename propagates: a question tagged to a renamed topic still resolves to it by id', async () => {
      await seedDifficultyScale(database);
      const { subjectId, topicId } = await createTaxonomy(database, admin.userId);
      const questionId = await createQuestion(database, { subjectId, topicId }, admin.userId);

      const { body: renamed } = await request(app.getHttpServer())
        .patch(`/assessment/taxonomy/nodes/${topicId}`)
        .set(...authHeader(app, admin))
        .send({ name: 'Renamed Topic' })
        .expect(200);

      expect(renamed.name).toBe('Renamed Topic');
      expect(renamed.nodeId).toBe(topicId);

      const { body: question } = await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(question.topicId).toBe(topicId);
    });
  });

  describe('deletion and retirement', () => {
    it('refuses to delete a node that has questions tagged to it', async () => {
      await seedDifficultyScale(database);
      const { subjectId, topicId } = await createTaxonomy(database, admin.userId);
      await createQuestion(database, { subjectId, topicId }, admin.userId);

      await request(app.getHttpServer())
        .delete(`/assessment/taxonomy/nodes/${topicId}`)
        .set(...authHeader(app, admin))
        .expect(409);
    });

    it('refuses to delete a subject that has questions tagged to it', async () => {
      await seedDifficultyScale(database);
      const { subjectId, topicId } = await createTaxonomy(database, admin.userId);
      await createQuestion(database, { subjectId, topicId }, admin.userId);

      await request(app.getHttpServer())
        .delete(`/assessment/taxonomy/nodes/${subjectId}`)
        .set(...authHeader(app, admin))
        .expect(409);
    });

    it('deletes a node that has no questions', async () => {
      const { body: subject } = await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'SUBJECT', name: 'Unused' })
        .expect(201);

      const { body: result } = await request(app.getHttpServer())
        .delete(`/assessment/taxonomy/nodes/${subject.nodeId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(result.deleted).toBe(1);
    });

    it('retiring a node hides it from default list', async () => {
      const { body: subject } = await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'SUBJECT', name: 'ToRetire' })
        .expect(201);

      const { body: result } = await request(app.getHttpServer())
        .post(`/assessment/taxonomy/nodes/${subject.nodeId}/retire`)
        .set(...authHeader(app, admin))
        .expect(201);

      expect(result.retired).toBeGreaterThan(0);

      const { body: nodes } = await request(app.getHttpServer())
        .get('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(nodes.map((n: { nodeId: string }) => n.nodeId)).not.toContain(subject.nodeId);
    });

    it('a retired node appears when includeRetired is requested', async () => {
      const { body: subject } = await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'SUBJECT', name: 'RetiredSubject' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/taxonomy/nodes/${subject.nodeId}/retire`)
        .set(...authHeader(app, admin))
        .expect(201);

      const { body: nodes } = await request(app.getHttpServer())
        .get('/assessment/taxonomy/nodes?includeRetired=true')
        .set(...authHeader(app, admin))
        .expect(200);

      const found = nodes.find((n: { nodeId: string }) => n.nodeId === subject.nodeId);
      expect(found).toBeDefined();
      expect(found.isRetired).toBe(true);
    });

    it('retiring a parent retires all descendants', async () => {
      const { body: subject } = await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'SUBJECT', name: 'ParentSubject' })
        .expect(201);

      const { body: topic } = await request(app.getHttpServer())
        .post('/assessment/taxonomy/nodes')
        .set(...authHeader(app, admin))
        .send({ kind: 'TOPIC', name: 'ChildTopic', parentId: subject.nodeId })
        .expect(201);

      const { body: result } = await request(app.getHttpServer())
        .post(`/assessment/taxonomy/nodes/${subject.nodeId}/retire`)
        .set(...authHeader(app, admin))
        .expect(201);

      expect(result.retired).toBe(2);

      const { body: nodes } = await request(app.getHttpServer())
        .get('/assessment/taxonomy/nodes?includeRetired=true')
        .set(...authHeader(app, admin))
        .expect(200);

      const topicNode = nodes.find((n: { nodeId: string }) => n.nodeId === topic.nodeId);
      expect(topicNode.isRetired).toBe(true);
    });
  });

  describe('difficulty scale', () => {
    it('starts empty', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/assessment/difficulty-levels')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(body).toHaveLength(0);
    });

    it('replaces the scale with custom ordinal labels', async () => {
      await request(app.getHttpServer())
        .put('/assessment/difficulty-levels')
        .set(...authHeader(app, admin))
        .send({
          levels: [
            { ordinal: 1, label: 'Beginner' },
            { ordinal: 2, label: 'Intermediate' },
            { ordinal: 3, label: 'Expert' },
          ],
        })
        .expect(200);

      const { body } = await request(app.getHttpServer())
        .get('/assessment/difficulty-levels')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(body).toHaveLength(3);
      expect(body[0]).toEqual({ ordinal: 1, label: 'Beginner' });
      expect(body[1]).toEqual({ ordinal: 2, label: 'Intermediate' });
      expect(body[2]).toEqual({ ordinal: 3, label: 'Expert' });
    });

    it('refuses a scale with duplicate ordinals', async () => {
      await request(app.getHttpServer())
        .put('/assessment/difficulty-levels')
        .set(...authHeader(app, admin))
        .send({ levels: [{ ordinal: 1, label: 'A' }, { ordinal: 1, label: 'B' }] })
        .expect(400);
    });

    it('refuses to replace when questions are tagged at an ordinal being removed', async () => {
      await seedDifficultyScale(database);
      const { subjectId, topicId } = await createTaxonomy(database, admin.userId);
      await createQuestion(database, { subjectId, topicId }, admin.userId, { difficulty: 1 });

      await request(app.getHttpServer())
        .put('/assessment/difficulty-levels')
        .set(...authHeader(app, admin))
        .send({
          levels: [
            { ordinal: 2, label: 'Moderate' },
            { ordinal: 3, label: 'Hard' },
          ],
        })
        .expect(409);
    });

    it('an instructor can read the difficulty scale', async () => {
      await seedDifficultyScale(database);

      const { body } = await request(app.getHttpServer())
        .get('/assessment/difficulty-levels')
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(body).toHaveLength(3);
    });
  });

  describe('question tagged to a retired node', () => {
    it('still reads back correctly after its topic is retired', async () => {
      await seedDifficultyScale(database);
      const { subjectId, topicId } = await createTaxonomy(database, admin.userId);
      const questionId = await createQuestion(database, { subjectId, topicId }, admin.userId);

      await request(app.getHttpServer())
        .post(`/assessment/taxonomy/nodes/${topicId}/retire`)
        .set(...authHeader(app, admin))
        .expect(201);

      const { body: question } = await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(question.questionId).toBe(questionId);
      expect(question.topicId).toBe(topicId);
    });

    it('still reads back correctly after its subject is retired', async () => {
      await seedDifficultyScale(database);
      const { subjectId, topicId } = await createTaxonomy(database, admin.userId);
      const questionId = await createQuestion(database, { subjectId, topicId }, admin.userId);

      await request(app.getHttpServer())
        .post(`/assessment/taxonomy/nodes/${subjectId}/retire`)
        .set(...authHeader(app, admin))
        .expect(201);

      const { body: question } = await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(question.questionId).toBe(questionId);
      expect(question.subjectId).toBe(subjectId);
    });
  });
});
