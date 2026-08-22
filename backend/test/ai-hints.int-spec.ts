import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { EXECUTION_PROVIDER } from '../src/coding/execution/execution-provider';
import { MODEL_PROVIDER } from '../src/ai/model-provider';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import { makeProvider, RecordingProvider, seedProblem } from './support/coding-factories';
import { makeModelProvider, RecordingModelProvider } from './support/ai-factories';

describe('ai hints', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let queue: InlineJobQueue;
  let execProvider: RecordingProvider;
  let modelProvider: RecordingModelProvider;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;
  let problemId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    execProvider = makeProvider();
    modelProvider = makeModelProvider();
    app = await createTestApp(database, clock, [
      { token: EXECUTION_PROVIDER, value: execProvider },
      { token: MODEL_PROVIDER, value: modelProvider },
    ]);
    queue = app.get<InlineJobQueue>(JOB_QUEUE);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    execProvider.calls = [];
    execProvider.failNext = false;
    execProvider.malformed = false;
    execProvider.outcomeFor = () => 'OK';
    execProvider.messageFor = () => '';
    modelProvider.calls = [];
    modelProvider.batches = [];
    modelProvider.failNext = false;
    modelProvider.textFor = () => 'Consider the time complexity of your loop.';

    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    problemId = await seedProblem(app, admin, {
      visibleCases: [{ input: 'visible-in', expectedOutput: 'visible-out' }],
      hiddenCases: [{ input: 'hidden-in', expectedOutput: 'hidden-out' }],
    });

    execProvider.outcomeFor = () => 'WRONG_OUTPUT';
  });

  async function submitAndJudge(actor: TestActor) {
    const queued = await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/submit`)
      .set(...authHeader(app, actor))
      .send({ language: 'python', sourceCode: 'def solve(): pass' })
      .expect(201);

    await queue.enqueue('coding.runs.drain', undefined);
    return queued.body.runId as string;
  }

  it('returns a first hint with level 1 and records it', async () => {
    const runId = await submitAndJudge(student);

    const res = await request(app.getHttpServer())
      .post(`/coding/runs/${runId}/hints`)
      .set(...authHeader(app, student))
      .expect(201);

    expect(res.body.hintLevel).toBe(1);
    expect(res.body.hintText).toBeTruthy();
    expect(res.body.hintsRemaining).toBe(2);
  });

  it('records hint against the run', async () => {
    const runId = await submitAndJudge(student);

    await request(app.getHttpServer())
      .post(`/coding/runs/${runId}/hints`)
      .set(...authHeader(app, student))
      .expect(201);

    const listRes = await request(app.getHttpServer())
      .get(`/coding/runs/${runId}/hints`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(listRes.body.hints).toHaveLength(1);
    expect(listRes.body.hintsUsed).toBe(1);
    expect(listRes.body.hints[0].hintLevel).toBe(1);
  });

  it('escalates to level 2 on second request', async () => {
    const runId = await submitAndJudge(student);

    await request(app.getHttpServer())
      .post(`/coding/runs/${runId}/hints`)
      .set(...authHeader(app, student))
      .expect(201);

    const res2 = await request(app.getHttpServer())
      .post(`/coding/runs/${runId}/hints`)
      .set(...authHeader(app, student))
      .expect(201);

    expect(res2.body.hintLevel).toBe(2);
    expect(res2.body.hintsRemaining).toBe(1);
  });

  it('enforces the server-side bound — refuses a 4th hint', async () => {
    const runId = await submitAndJudge(student);

    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post(`/coding/runs/${runId}/hints`)
        .set(...authHeader(app, student))
        .expect(201);
    }

    await request(app.getHttpServer())
      .post(`/coding/runs/${runId}/hints`)
      .set(...authHeader(app, student))
      .expect(403);
  });

  it('enforces the rate limit independently of run rate limit', async () => {
    const runId1 = await submitAndJudge(student);

    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post(`/coding/runs/${runId1}/hints`)
        .set(...authHeader(app, student))
        .expect(201);
    }

    const runId2 = await submitAndJudge(student);

    const rateLimited = await request(app.getHttpServer())
      .post(`/coding/runs/${runId2}/hints`)
      .set(...authHeader(app, student))
      .expect(403);

    expect(rateLimited.body.message?.code ?? rateLimited.body.code).toBe('HINT_RATE_LIMIT');
  });

  it('refuses hints for a run that does not belong to the requesting user', async () => {
    const other = await createUser(database, 'LEARNER');
    const runId = await submitAndJudge(student);

    await request(app.getHttpServer())
      .post(`/coding/runs/${runId}/hints`)
      .set(...authHeader(app, other))
      .expect(403);
  });

  it('refuses hints on a sample run', async () => {
    const queued = await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/run`)
      .set(...authHeader(app, student))
      .send({ language: 'python', sourceCode: 'def solve(): pass' })
      .expect(201);

    await queue.enqueue('coding.runs.drain', undefined);

    await request(app.getHttpServer())
      .post(`/coding/runs/${queued.body.runId}/hints`)
      .set(...authHeader(app, student))
      .expect(403);
  });

  it('refuses hints before the run is complete', async () => {
    const queued = await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/submit`)
      .set(...authHeader(app, student))
      .send({ language: 'python', sourceCode: 'def solve(): pass' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/coding/runs/${queued.body.runId}/hints`)
      .set(...authHeader(app, student))
      .expect(403);
  });

  it('lists hints as empty before any are taken', async () => {
    const runId = await submitAndJudge(student);

    const res = await request(app.getHttpServer())
      .get(`/coding/runs/${runId}/hints`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.hints).toHaveLength(0);
    expect(res.body.maxHints).toBe(3);
  });

  it('staff can see hints for any student run', async () => {
    const runId = await submitAndJudge(student);

    await request(app.getHttpServer())
      .post(`/coding/runs/${runId}/hints`)
      .set(...authHeader(app, student))
      .expect(201);

    await request(app.getHttpServer())
      .get(`/coding/runs/${runId}/hints`)
      .set(...authHeader(app, admin))
      .expect(200);
  });

  it('another student cannot list hints for a run they do not own', async () => {
    const other = await createUser(database, 'LEARNER');
    const runId = await submitAndJudge(student);

    await request(app.getHttpServer())
      .get(`/coding/runs/${runId}/hints`)
      .set(...authHeader(app, other))
      .expect(403);
  });

  it('does not include hidden case data in the model request', async () => {
    const hiddenSentinel = 'SUPER-SECRET-HIDDEN-CASE-DATA';
    execProvider.outcomeFor = () => 'OK';
    problemId = await seedProblem(app, admin, {
      visibleCases: [{ input: 'pub-in', expectedOutput: 'pub-out' }],
      hiddenCases: [{ input: hiddenSentinel, expectedOutput: 'hidden-exp' }],
    });
    execProvider.outcomeFor = () => 'WRONG_OUTPUT';
    const runId = await submitAndJudge(student);

    await request(app.getHttpServer())
      .post(`/coding/runs/${runId}/hints`)
      .set(...authHeader(app, student))
      .expect(201);

    const modelRequests = modelProvider.calls;
    const payload = JSON.stringify(modelRequests);
    expect(payload).not.toContain(hiddenSentinel);
  });

  it('three hint levels produce three different prompts to the model', async () => {
    const runId = await submitAndJudge(student);

    for (let i = 0; i < 3; i += 1) {
      await request(app.getHttpServer())
        .post(`/coding/runs/${runId}/hints`)
        .set(...authHeader(app, student))
        .expect(201);
    }

    expect(modelProvider.calls.length).toBe(3);
    const prefixes = modelProvider.calls.map((c) => c.cachedPrefix);
    expect(prefixes[0]).not.toBe(prefixes[1]);
    expect(prefixes[1]).not.toBe(prefixes[2]);
    expect(prefixes[0]).not.toBe(prefixes[2]);
  });

  it('hint text containing a code block is redacted by the solution guard before storage', async () => {
    const runId = await submitAndJudge(student);

    modelProvider.textFor = () =>
      'Here is the complete working solution:\n```python\ndef solve(a, b):\n    return a + b\n```\nHope that helps!';

    const res = await request(app.getHttpServer())
      .post(`/coding/runs/${runId}/hints`)
      .set(...authHeader(app, student))
      .expect(201);

    expect(res.body.hintText).not.toContain('def solve');
    expect(res.body.hintText).not.toContain('```');
    expect(res.body.hintText).toContain('[code removed by solution guard]');
  });
});
