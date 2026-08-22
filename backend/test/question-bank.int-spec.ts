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
  createTest,
  placeQuestion,
  text,
  Taxonomy,
} from './support/assessment-factories';

describe('question bank', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let admin: TestActor;
  let instructor: TestActor;
  let taxonomy: Taxonomy;

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
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, admin.userId);
  });

  function postQuestion(actor: TestActor, body: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post('/assessment/questions')
      .set(...authHeader(app, actor))
      .send(body);
  }

  function validSingleCorrect(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      type: 'SINGLE_CORRECT',
      subjectId: taxonomy.subjectId,
      topicId: taxonomy.topicId,
      difficulty: 1,
      prompt: text('What is 2 + 2?'),
      options: [
        { id: 'a', content: text('3') },
        { id: 'b', content: text('4') },
        { id: 'c', content: text('5') },
      ],
      answerKey: { optionId: 'b' },
      explanation: text('Two plus two equals four.'),
      ...overrides,
    };
  }

  describe('ticket 03 - independent question', () => {
    it('creates a question without reference to any test and reads it back', async () => {
      const { body: created } = await postQuestion(
        admin,
        validSingleCorrect(),
      ).expect(201);

      expect(created.questionId).toBeDefined();
      expect(created.type).toBe('SINGLE_CORRECT');
      expect(created.subjectId).toBe(taxonomy.subjectId);
      expect(created.topicId).toBe(taxonomy.topicId);
      expect(created.version).toBe(1);
      expect(created.currentVersion).toBe(1);

      const { body: fetched } = await request(app.getHttpServer())
        .get(`/assessment/questions/${created.questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(fetched.questionId).toBe(created.questionId);
      expect(fetched.type).toBe('SINGLE_CORRECT');
    });

    it('instructors can create and read questions', async () => {
      const { body: created } = await postQuestion(
        instructor,
        validSingleCorrect(),
      ).expect(201);

      const { body: fetched } = await request(app.getHttpServer())
        .get(`/assessment/questions/${created.questionId}`)
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(fetched.questionId).toBe(created.questionId);
    });

    it('refuses to create a question without subjectId', async () => {
      await postQuestion(admin, {
        type: 'SINGLE_CORRECT',
        topicId: taxonomy.topicId,
        difficulty: 1,
        prompt: text('Missing subject'),
        options: [
          { id: 'a', content: text('A') },
          { id: 'b', content: text('B') },
        ],
        answerKey: { optionId: 'a' },
      }).expect(400);
    });

    it('refuses to create a question without topicId', async () => {
      await postQuestion(admin, {
        type: 'SINGLE_CORRECT',
        subjectId: taxonomy.subjectId,
        difficulty: 1,
        prompt: text('Missing topic'),
        options: [
          { id: 'a', content: text('A') },
          { id: 'b', content: text('B') },
        ],
        answerKey: { optionId: 'a' },
      }).expect(400);
    });

    it('refuses to create a question without difficulty', async () => {
      await postQuestion(admin, {
        type: 'SINGLE_CORRECT',
        subjectId: taxonomy.subjectId,
        topicId: taxonomy.topicId,
        prompt: text('Missing difficulty'),
        options: [
          { id: 'a', content: text('A') },
          { id: 'b', content: text('B') },
        ],
        answerKey: { optionId: 'a' },
      }).expect(400);
    });

    it('refuses a difficulty ordinal not on the configured scale', async () => {
      await postQuestion(
        admin,
        validSingleCorrect({ difficulty: 99 }),
      ).expect(400);
    });

    it('the same question can be referenced by two different tests', async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const test1Id = await createTest(database, admin.userId);
      const test2Id = await createTest(database, admin.userId);

      await placeQuestion(database, test1Id, questionId, { order: 1 });
      await placeQuestion(database, test2Id, questionId, { order: 1 });

      const { body } = await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(body.questionId).toBe(questionId);
    });

    it('authored difficulty is set at creation; observed difficulty starts null', async () => {
      const { body } = await postQuestion(
        admin,
        validSingleCorrect({ difficulty: 2 }),
      ).expect(201);

      expect(body.authoredDifficulty).toBe(2);
      expect(body.observedDifficulty).toBeNull();
      expect(body.observedAttemptCount).toBe(0);
    });

    it('observed difficulty is not writable via the retag endpoint', async () => {
      const { body: created } = await postQuestion(
        admin,
        validSingleCorrect({ difficulty: 1 }),
      ).expect(201);

      await request(app.getHttpServer())
        .patch(`/assessment/questions/${created.questionId}/tags`)
        .set(...authHeader(app, admin))
        .send({ difficulty: 2 })
        .expect(200);

      const { body: fetched } = await request(app.getHttpServer())
        .get(`/assessment/questions/${created.questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(fetched.observedDifficulty).toBeNull();
      expect(fetched.authoredDifficulty).toBe(2);
    });

    it('explanation is stored and returned with the question', async () => {
      const explanation = text('This is why the answer is four.');
      const { body } = await postQuestion(
        admin,
        validSingleCorrect({ explanation }),
      ).expect(201);

      expect(body.explanation).toEqual(explanation);

      const { body: fetched } = await request(app.getHttpServer())
        .get(`/assessment/questions/${body.questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(fetched.explanation).toEqual(explanation);
    });
  });

  describe('ticket 04 - structured rich content', () => {
    it('a prompt with text, math and image round-trips unchanged', async () => {
      const mixedPrompt = [
        { type: 'TEXT', text: 'Solve the equation' },
        { type: 'MATH', latex: 'x^2 + 2x + 1 = 0' },
        { type: 'IMAGE', fileId: 'file-uuid-001', alt: 'a graph' },
      ];

      const { body: created } = await postQuestion(
        admin,
        validSingleCorrect({ prompt: mixedPrompt }),
      ).expect(201);

      expect(created.prompt).toEqual(mixedPrompt);

      const { body: fetched } = await request(app.getHttpServer())
        .get(`/assessment/questions/${created.questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(fetched.prompt).toEqual(mixedPrompt);
    });

    it('an option can carry a mathematics block', async () => {
      const optionsWithMath = [
        { id: 'a', content: [{ type: 'MATH', latex: '\\sqrt{2}' }] },
        { id: 'b', content: [{ type: 'MATH', latex: '\\sqrt{3}' }] },
        { id: 'c', content: [{ type: 'TEXT', text: 'None of the above' }] },
      ];

      const { body } = await postQuestion(
        admin,
        validSingleCorrect({
          options: optionsWithMath,
          answerKey: { optionId: 'a' },
        }),
      ).expect(201);

      expect(body.options[0].content[0]).toEqual({
        type: 'MATH',
        latex: '\\sqrt{2}',
      });
    });

    it('a code block retains its language when read back', async () => {
      const codePrompt = [
        { type: 'CODE', language: 'python', code: 'print("hello")' },
      ];

      const { body } = await postQuestion(
        admin,
        validSingleCorrect({ prompt: codePrompt }),
      ).expect(201);

      expect(body.prompt[0]).toEqual({
        type: 'CODE',
        language: 'python',
        code: 'print("hello")',
      });

      const { body: fetched } = await request(app.getHttpServer())
        .get(`/assessment/questions/${body.questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(fetched.prompt[0].language).toBe('python');
    });

    it('an unknown block type is rejected at authoring', async () => {
      const badPrompt = [{ type: 'VIDEO', url: 'https://example.com' }];

      await postQuestion(admin, validSingleCorrect({ prompt: badPrompt })).expect(
        400,
      );
    });

    it('content is identical in the authoring read and the version read', async () => {
      const prompt = [{ type: 'TEXT', text: 'What is the capital of France?' }];
      const explanation = [{ type: 'TEXT', text: 'The capital is Paris.' }];

      const { body: created } = await postQuestion(
        admin,
        validSingleCorrect({ prompt, explanation }),
      ).expect(201);

      const { body: currentRead } = await request(app.getHttpServer())
        .get(`/assessment/questions/${created.questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      const { body: versionRead } = await request(app.getHttpServer())
        .get(`/assessment/questions/${created.questionId}/versions/1`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(currentRead.prompt).toEqual(versionRead.prompt);
      expect(currentRead.options).toEqual(versionRead.options);
      expect(currentRead.explanation).toEqual(versionRead.explanation);
    });

    it('an IMAGE block without alt text is accepted', async () => {
      const promptNoAlt = [{ type: 'IMAGE', fileId: 'file-uuid-002' }];

      const { body } = await postQuestion(
        admin,
        validSingleCorrect({ prompt: promptNoAlt }),
      ).expect(201);

      expect(body.prompt[0].fileId).toBe('file-uuid-002');
    });
  });

  describe('ticket 05 - versioning and retirement', () => {
    it('editing a question increments its version and leaves the prior version readable', async () => {
      const { body: created } = await postQuestion(
        admin,
        validSingleCorrect(),
      ).expect(201);
      const questionId = created.questionId;
      const originalPrompt = created.prompt;

      const newPrompt = [{ type: 'TEXT', text: 'Updated: What is 3 + 3?' }];

      const { body: edited } = await request(app.getHttpServer())
        .patch(`/assessment/questions/${questionId}`)
        .set(...authHeader(app, admin))
        .send({ prompt: newPrompt })
        .expect(200);

      expect(edited.version).toBe(2);
      expect(edited.currentVersion).toBe(2);
      expect(edited.prompt).toEqual(newPrompt);

      const { body: v1 } = await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}/versions/1`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(v1.version).toBe(1);
      expect(v1.prompt).toEqual(originalPrompt);
    });

    it('multiple edits accumulate versions, all of which remain readable', async () => {
      const { body: created } = await postQuestion(
        admin,
        validSingleCorrect(),
      ).expect(201);
      const questionId = created.questionId;

      await request(app.getHttpServer())
        .patch(`/assessment/questions/${questionId}`)
        .set(...authHeader(app, admin))
        .send({ prompt: [{ type: 'TEXT', text: 'Version 2' }] })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/assessment/questions/${questionId}`)
        .set(...authHeader(app, admin))
        .send({ prompt: [{ type: 'TEXT', text: 'Version 3' }] })
        .expect(200);

      const { body: q } = await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);
      expect(q.currentVersion).toBe(3);

      await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}/versions/1`)
        .set(...authHeader(app, admin))
        .expect(200);

      await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}/versions/2`)
        .set(...authHeader(app, admin))
        .expect(200);
    });

    it('a retired question remains readable', async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);

      await request(app.getHttpServer())
        .post(`/assessment/questions/${questionId}/retire`)
        .set(...authHeader(app, admin))
        .expect(201);

      const { body } = await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(body.isRetired).toBe(true);
      expect(body.questionId).toBe(questionId);
    });

    it('there is no endpoint that hard-deletes a question', async () => {
      const { body: created } = await postQuestion(
        admin,
        validSingleCorrect(),
      ).expect(201);

      await request(app.getHttpServer())
        .delete(`/assessment/questions/${created.questionId}`)
        .set(...authHeader(app, admin))
        .expect(404);

      const { body: stillThere } = await request(app.getHttpServer())
        .get(`/assessment/questions/${created.questionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect(stillThere.questionId).toBe(created.questionId);
    });

    it('retiring is recorded in the audit log with the actor', async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);

      await request(app.getHttpServer())
        .post(`/assessment/questions/${questionId}/retire`)
        .set(...authHeader(app, admin))
        .expect(201);

      const { body: log } = await request(app.getHttpServer())
        .get('/audit-log?action=assessment.question.retire')
        .set(...authHeader(app, admin))
        .expect(200);

      const entry = log.find(
        (e: { targetId: string }) => e.targetId === questionId,
      );
      expect(entry).toBeDefined();
      expect(entry.actorId).toBe(admin.userId);
    });

    it('version history of a retired question is still accessible', async () => {
      const { body: created } = await postQuestion(
        admin,
        validSingleCorrect(),
      ).expect(201);
      const questionId = created.questionId;

      await request(app.getHttpServer())
        .patch(`/assessment/questions/${questionId}`)
        .set(...authHeader(app, admin))
        .send({ prompt: [{ type: 'TEXT', text: 'Edited before retirement' }] })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/assessment/questions/${questionId}/retire`)
        .set(...authHeader(app, admin))
        .expect(201);

      await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}/versions/1`)
        .set(...authHeader(app, admin))
        .expect(200);

      await request(app.getHttpServer())
        .get(`/assessment/questions/${questionId}/versions/2`)
        .set(...authHeader(app, admin))
        .expect(200);
    });
  });

  describe('ticket 06 - search and filter', () => {
    it('filtering by topic returns questions tagged to that topic', async () => {
      const otherTaxonomy = await createTaxonomy(database, admin.userId);

      const q1 = await createQuestion(database, taxonomy, admin.userId);
      await createQuestion(database, otherTaxonomy, admin.userId);

      const { body } = await request(app.getHttpServer())
        .get(`/assessment/questions?topicId=${taxonomy.topicId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      const ids = body.data.map((q: { questionId: string }) => q.questionId);
      expect(ids).toContain(q1);
      expect(body.data).toHaveLength(1);
    });

    it('filtering by topic also returns questions tagged to its sub-topics', async () => {
      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const q2 = await createQuestion(database, taxonomy, admin.userId, {
        subTopicId: taxonomy.subTopicId,
      });

      const { body } = await request(app.getHttpServer())
        .get(`/assessment/questions?topicId=${taxonomy.topicId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      const ids = body.data.map((q: { questionId: string }) => q.questionId);
      expect(ids).toContain(q1);
      expect(ids).toContain(q2);
    });

    it('retired questions are excluded by default', async () => {
      const activeId = await createQuestion(database, taxonomy, admin.userId);
      const retiredId = await createQuestion(database, taxonomy, admin.userId, {
        isRetired: true,
      });

      const { body } = await request(app.getHttpServer())
        .get('/assessment/questions')
        .set(...authHeader(app, admin))
        .expect(200);

      const ids = body.data.map((q: { questionId: string }) => q.questionId);
      expect(ids).toContain(activeId);
      expect(ids).not.toContain(retiredId);
    });

    it('retired questions are included when requested', async () => {
      const activeId = await createQuestion(database, taxonomy, admin.userId);
      const retiredId = await createQuestion(database, taxonomy, admin.userId, {
        isRetired: true,
      });

      const { body } = await request(app.getHttpServer())
        .get('/assessment/questions?includeRetired=true')
        .set(...authHeader(app, admin))
        .expect(200);

      const ids = body.data.map((q: { questionId: string }) => q.questionId);
      expect(ids).toContain(activeId);
      expect(ids).toContain(retiredId);
    });

    it('text search matches prompt content', async () => {
      await createQuestion(database, taxonomy, admin.userId, {
        prompt: text('photosynthesis converts sunlight into energy'),
      });
      await createQuestion(database, taxonomy, admin.userId, {
        prompt: text('the mitochondria is the powerhouse'),
      });

      const { body } = await request(app.getHttpServer())
        .get('/assessment/questions?text=photosynthesis')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(body.data).toHaveLength(1);
      expect(body.data[0].prompt[0].text).toContain('photosynthesis');
    });

    it('text search matches across block types including math', async () => {
      await createQuestion(database, taxonomy, admin.userId, {
        prompt: [{ type: 'TEXT', text: 'integral calculus' }, { type: 'MATH', latex: '\\int_0^1 x dx' }],
      });
      await createQuestion(database, taxonomy, admin.userId, {
        prompt: text('basic arithmetic'),
      });

      const { body } = await request(app.getHttpServer())
        .get('/assessment/questions?text=integral')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(body.data).toHaveLength(1);
    });

    it('topic and difficulty filters compose to narrow results', async () => {
      const otherTaxonomy = await createTaxonomy(database, admin.userId);

      const match = await createQuestion(database, taxonomy, admin.userId, {
        difficulty: 1,
      });
      await createQuestion(database, taxonomy, admin.userId, { difficulty: 2 });
      await createQuestion(database, otherTaxonomy, admin.userId, {
        difficulty: 1,
      });

      const { body } = await request(app.getHttpServer())
        .get(
          `/assessment/questions?topicId=${taxonomy.topicId}&difficulty=1`,
        )
        .set(...authHeader(app, admin))
        .expect(200);

      expect(body.data).toHaveLength(1);
      expect(body.data[0].questionId).toBe(match);
      expect(body.data[0].topicId).toBe(taxonomy.topicId);
      expect(body.data[0].authoredDifficulty).toBe(1);
    });

    it('results are paginated and stable under repeated requests', async () => {
      for (let i = 0; i < 5; i++) {
        await createQuestion(database, taxonomy, admin.userId);
      }

      const { body: page1a } = await request(app.getHttpServer())
        .get('/assessment/questions?pageSize=3&page=1')
        .set(...authHeader(app, admin))
        .expect(200);

      const { body: page1b } = await request(app.getHttpServer())
        .get('/assessment/questions?pageSize=3&page=1')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(
        page1a.data.map((q: { questionId: string }) => q.questionId),
      ).toEqual(
        page1b.data.map((q: { questionId: string }) => q.questionId),
      );
      expect(page1a.pagination.total).toBe(5);
      expect(page1a.data).toHaveLength(3);

      const { body: page2 } = await request(app.getHttpServer())
        .get('/assessment/questions?pageSize=3&page=2')
        .set(...authHeader(app, admin))
        .expect(200);

      expect(page2.data).toHaveLength(2);
      expect(page2.pagination.total).toBe(5);

      const page1Ids = page1a.data.map((q: { questionId: string }) => q.questionId);
      const page2Ids = page2.data.map((q: { questionId: string }) => q.questionId);
      const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(overlap).toHaveLength(0);
    });
  });
});
