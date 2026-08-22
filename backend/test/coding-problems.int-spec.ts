import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { EXECUTION_PROVIDER } from '../src/coding/execution/execution-provider';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import { makeProvider, RecordingProvider, seedProblem } from './support/coding-factories';

describe('coding problems, cases and the publication gate', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let provider: RecordingProvider;
  const clock = new TestClock();

  let admin: TestActor;
  let instructor: TestActor;
  let student: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
    provider = makeProvider();
    app = await createTestApp(database, clock, [
      { token: EXECUTION_PROVIDER, value: provider },
    ]);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    provider.calls = [];
    provider.failNext = false;
    provider.malformed = false;
    provider.outcomeFor = () => 'OK';
    provider.messageFor = () => '';
    admin = await createUser(database, 'PLATFORM_ADMIN');
    instructor = await createUser(database, 'INSTRUCTOR');
    student = await createUser(database, 'LEARNER');
  });

  it('authors a problem that belongs to no batch and no path', async () => {
    const created = await request(app.getHttpServer())
      .post('/coding/problems')
      .set(...authHeader(app, instructor))
      .send({
        title: 'Reverse a list',
        slug: 'reverse-a-list',
        difficulty: 3,
        topicId: 'arrays',
        statement: [{ type: 'TEXT', text: 'Reverse it.' }],
        constraints: [{ type: 'TEXT', text: 'n <= 100' }],
      })
      .expect(201);

    expect(created.body).toMatchObject({
      title: 'Reverse a list',
      difficulty: 3,
      status: 'DRAFT',
    });
    expect(created.body).not.toHaveProperty('batchId');
    expect(created.body).not.toHaveProperty('pathId');

    const read = await request(app.getHttpServer())
      .get(`/coding/problems/${created.body.problemId}`)
      .set(...authHeader(app, instructor))
      .expect(200);
    expect(read.body.statement).toEqual([{ type: 'TEXT', text: 'Reverse it.' }]);
  });

  it('refuses statement content the phase 3 parser rejects', async () => {
    await request(app.getHttpServer())
      .post('/coding/problems')
      .set(...authHeader(app, instructor))
      .send({
        title: 'Bad',
        slug: 'bad-content',
        statement: [{ type: 'CAROUSEL', slides: [] }],
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/coding/problems')
      .set(...authHeader(app, instructor))
      .send({ title: 'Bad', slug: 'bad-empty', statement: [] })
      .expect(400);
  });

  it('refuses a student authoring or editing a problem', async () => {
    await request(app.getHttpServer())
      .post('/coding/problems')
      .set(...authHeader(app, student))
      .send({
        title: 'Nope',
        slug: 'nope',
        statement: [{ type: 'TEXT', text: 'x' }],
      })
      .expect(403);
  });

  it('configures starter code and limits per language and refuses an unsupported one', async () => {
    const problemId = await seedProblem(app, admin, { publish: false });

    await request(app.getHttpServer())
      .put(`/coding/problems/${problemId}/languages`)
      .set(...authHeader(app, admin))
      .send({ language: 'brainfuck', starterCode: '' })
      .expect(400);

    await request(app.getHttpServer())
      .put(`/coding/problems/${problemId}/languages`)
      .set(...authHeader(app, admin))
      .send({
        language: 'go',
        starterCode: 'func solve() {}',
        referenceSolution: 'func solve() {}',
        timeLimitMs: 5000,
        memoryLimitMb: 512,
      })
      .expect(200);

    const read = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}`)
      .set(...authHeader(app, admin))
      .expect(200);

    const go = read.body.languages.find(
      (l: { language: string }) => l.language === 'go',
    );
    const python = read.body.languages.find(
      (l: { language: string }) => l.language === 'python',
    );
    expect(go).toMatchObject({ timeLimitMs: 5000, memoryLimitMb: 512 });
    expect(python).toMatchObject({ timeLimitMs: 2000, memoryLimitMb: 256 });
  });

  it('passes the per-language limits through to the execution port', async () => {
    const problemId = await seedProblem(app, admin, { publish: false });
    await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/validate?language=python`)
      .set(...authHeader(app, admin))
      .expect(201);

    const sent = provider.calls[provider.calls.length - 1];
    expect(sent).toMatchObject({
      language: 'python',
      timeLimitMs: 2000,
      memoryLimitMb: 256,
    });
  });

  it('refuses publication until the reference solution passes every case', async () => {
    const problemId = await seedProblem(app, admin, { publish: false });

    await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/publish`)
      .set(...authHeader(app, admin))
      .expect(409);

    provider.outcomeFor = (ordinal) => (ordinal === 2 ? 'WRONG_OUTPUT' : 'OK');
    const failed = await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/validate?language=python`)
      .set(...authHeader(app, admin))
      .expect(201);
    expect(failed.body).toMatchObject({ validated: false, failedCaseOrdinal: 2 });

    await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/publish`)
      .set(...authHeader(app, admin))
      .expect(409);

    provider.outcomeFor = () => 'OK';
    const passed = await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/validate?language=python`)
      .set(...authHeader(app, admin))
      .expect(201);
    expect(passed.body.validated).toBe(true);

    const published = await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/publish`)
      .set(...authHeader(app, admin))
      .expect(201);
    expect(published.body.status).toBe('PUBLISHED');
  });

  it('validates through the same execution path students use', async () => {
    const problemId = await seedProblem(app, admin, { publish: false });
    await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/validate?language=python`)
      .set(...authHeader(app, admin))
      .expect(201);

    const sent = provider.calls[provider.calls.length - 1];
    expect(sent.cases.map((c) => c.ordinal)).toEqual([1, 2]);
  });

  it('reopens the gate when a case or the reference solution changes', async () => {
    const problemId = await seedProblem(app, admin);

    await request(app.getHttpServer())
      .put(`/coding/problems/${problemId}/cases`)
      .set(...authHeader(app, admin))
      .send({
        ordinal: 2,
        visibility: 'HIDDEN',
        input: 'changed',
        expectedOutput: 'changed',
      })
      .expect(200);

    const afterEdit = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}`)
      .set(...authHeader(app, admin))
      .expect(200);
    expect(afterEdit.body.status).toBe('DRAFT');

    await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}`)
      .set(...authHeader(app, student))
      .expect(404);
  });

  it('refuses validation without at least one hidden case', async () => {
    const problemId = await seedProblem(app, admin, {
      publish: false,
      hiddenCases: [],
    });

    await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/validate?language=python`)
      .set(...authHeader(app, admin))
      .expect(400);
  });

  it('hides an unpublished problem from students and lists only published ones', async () => {
    await seedProblem(app, admin, { publish: false, slug: 'draft-one' });
    await seedProblem(app, admin, { slug: 'live-one' });

    const asStudent = await request(app.getHttpServer())
      .get('/coding/problems')
      .set(...authHeader(app, student))
      .expect(200);
    expect(asStudent.body).toHaveLength(1);
    expect(asStudent.body[0].slug).toBe('live-one');

    const asStaff = await request(app.getHttpServer())
      .get('/coding/problems')
      .set(...authHeader(app, admin))
      .expect(200);
    expect(asStaff.body).toHaveLength(2);
  });
});
