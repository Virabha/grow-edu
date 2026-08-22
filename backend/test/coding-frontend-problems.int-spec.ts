import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';

import { codingRuns } from '../src/database/schema';
import { EXECUTION_PROVIDER } from '../src/coding/execution/execution-provider';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import { makeProvider, RecordingProvider } from './support/coding-factories';

const HIDDEN_SCRIPT = 'assert(document.querySelector(".secret-marker"))';

describe('front-end problems judged by assertions', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let provider: RecordingProvider;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;
  let problemId: string;

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
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    problemId = await seedFrontendProblem();
    provider.calls = [];
  });

  async function seedFrontendProblem(): Promise<string> {
    const created = await request(app.getHttpServer())
      .post('/coding/problems')
      .set(...authHeader(app, admin))
      .send({
        title: 'Build a card',
        slug: `build-a-card-${Math.floor(Math.random() * 1e9)}`,
        kind: 'FRONTEND',
        statement: [{ type: 'TEXT', text: 'Build the card.' }],
      })
      .expect(201);

    const id = created.body.problemId as string;

    await request(app.getHttpServer())
      .put(`/coding/problems/${id}/assertions`)
      .set(...authHeader(app, admin))
      .send({
        ordinal: 1,
        visibility: 'VISIBLE',
        description: 'The card has a heading',
        script: 'assert(document.querySelector("h1"))',
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/coding/problems/${id}/assertions`)
      .set(...authHeader(app, admin))
      .send({
        ordinal: 2,
        visibility: 'HIDDEN',
        description: 'The card is accessible',
        script: HIDDEN_SCRIPT,
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/coding/problems/${id}/editorial`)
      .set(...authHeader(app, admin))
      .send({
        body: [{ type: 'TEXT', text: 'Use semantic markup.' }],
        modelSolution: '<h1>Card</h1>',
        modelSolutionLanguage: 'html',
        timeComplexity: 'n/a',
        spaceComplexity: 'n/a',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/coding/problems/${id}/publish`)
      .set(...authHeader(app, admin))
      .expect(201);

    return id;
  }

  it('carries assertions rather than input and output test cases', async () => {
    const read = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(read.body.kind).toBe('FRONTEND');
    expect(read.body.cases).toEqual([]);
    expect(read.body.assertions).toHaveLength(1);
    expect(read.body.assertions[0]).toMatchObject({
      ordinal: 1,
      description: 'The card has a heading',
    });

    await request(app.getHttpServer())
      .put(`/coding/problems/${problemId}/cases`)
      .set(...authHeader(app, admin))
      .send({
        ordinal: 1,
        visibility: 'VISIBLE',
        input: 'x',
        expectedOutput: 'y',
      })
      .expect(400);
  });

  it('does not disclose a hidden assertion in the problem statement', async () => {
    const read = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(read.text).not.toContain('secret-marker');
    expect(read.text).not.toContain('The card is accessible');

    const sample = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}/assertions`)
      .set(...authHeader(app, student))
      .expect(200);
    expect(sample.body.assertions).toHaveLength(1);
    expect(sample.text).not.toContain('secret-marker');

    const asStaff = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}`)
      .set(...authHeader(app, admin))
      .expect(200);
    const hidden = asStaff.body.assertions.find(
      (a: { ordinal: number }) => a.ordinal === 2,
    );
    expect(hidden.script).toBe(HIDDEN_SCRIPT);
  });

  it('never touches the server execution provider', async () => {
    await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}/assertions/judge`)
      .set(...authHeader(app, admin))
      .expect(200);

    await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/frontend-result`)
      .set(...authHeader(app, student))
      .send({ passedOrdinals: [1] })
      .expect(201);

    expect(provider.calls).toHaveLength(0);

    const runs = await database.db
      .select()
      .from(codingRuns)
      .where(eq(codingRuns.problemId, problemId));
    expect(runs).toEqual([]);
  });

  it('refuses to run a front-end problem through the judge', async () => {
    await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/submit`)
      .set(...authHeader(app, student))
      .send({ language: 'python', sourceCode: 'print(1)' })
      .expect(404);
    expect(provider.calls).toHaveLength(0);
  });

  it('records which assertions passed rather than accepting "looks right"', async () => {
    const partial = await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/frontend-result`)
      .set(...authHeader(app, student))
      .send({ passedOrdinals: [1] })
      .expect(201);

    expect(partial.body).toMatchObject({
      passed: true,
      passedOrdinals: [1],
      totalAssertions: 1,
    });

    const complete = await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/frontend-result`)
      .set(...authHeader(app, student))
      .send({ passedOrdinals: [1] })
      .expect(201);
    expect(complete.body.passed).toBe(true);

    const claimed = await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/frontend-result`)
      .set(...authHeader(app, student))
      .send({ passedOrdinals: [] })
      .expect(201);
    expect(claimed.body.passed).toBe(false);
  });

  it('ignores an ordinal that is not an assertion on the problem', async () => {
    const result = await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/frontend-result`)
      .set(...authHeader(app, student))
      .send({ passedOrdinals: [1, 2, 99] })
      .expect(201);

    expect(result.body.passedOrdinals).toEqual([1]);
    expect(result.body.passed).toBe(true);
  });

  it('attaches the recorded result to the student and the problem', async () => {
    await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/frontend-result`)
      .set(...authHeader(app, student))
      .send({ passedOrdinals: [1] })
      .expect(201);

    const mine = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}/frontend-results`)
      .set(...authHeader(app, student))
      .expect(200);
    expect(mine.body).toHaveLength(1);

    const other = await createUser(database, 'LEARNER');
    const theirs = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}/frontend-results`)
      .set(...authHeader(app, other))
      .expect(200);
    expect(theirs.body).toEqual([]);
  });

  it('refuses to publish a front-end problem with no assertions', async () => {
    const created = await request(app.getHttpServer())
      .post('/coding/problems')
      .set(...authHeader(app, admin))
      .send({
        title: 'Empty',
        slug: `empty-frontend-${Math.floor(Math.random() * 1e9)}`,
        kind: 'FRONTEND',
        statement: [{ type: 'TEXT', text: 'Nothing.' }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/coding/problems/${created.body.problemId}/editorial`)
      .set(...authHeader(app, admin))
      .send({
        body: [{ type: 'TEXT', text: 'x' }],
        modelSolution: 'x',
        modelSolutionLanguage: 'html',
        timeComplexity: 'n/a',
        spaceComplexity: 'n/a',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/coding/problems/${created.body.problemId}/publish`)
      .set(...authHeader(app, admin))
      .expect(409);
  });
});
