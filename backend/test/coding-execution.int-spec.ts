import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';

import { codingExecutionUsage, codingRuns } from '../src/database/schema';
import { EXECUTION_PROVIDER } from '../src/coding/execution/execution-provider';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import { makeProvider, RecordingProvider, seedProblem } from './support/coding-factories';

const DRAIN = 'coding.runs.drain';

describe('code execution, queueing, verdicts and cost control', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let queue: InlineJobQueue;
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
    queue = app.get<InlineJobQueue>(JOB_QUEUE);
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
    student = await createUser(database, 'LEARNER');
    await setLimits({
      sampleRunsPerMinute: 10,
      sampleRunsPerDay: 300,
      submissionsPerMinute: 5,
      submissionsPerDay: 100,
    });
    problemId = await seedProblem(app, admin);
    provider.calls = [];
  });

  async function setLimits(values: Record<string, number>) {
    await request(app.getHttpServer())
      .put('/settings/execution')
      .set(...authHeader(app, admin))
      .send(values)
      .expect(200);
  }

  function submit(actor: TestActor = student, source = 'print(1)') {
    return request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/submit`)
      .set(...authHeader(app, actor))
      .send({ language: 'python', sourceCode: source });
  }

  function sampleRun(actor: TestActor = student) {
    return request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/run`)
      .set(...authHeader(app, actor))
      .send({ language: 'python', sourceCode: 'print(1)' });
  }

  function readRun(runId: string, actor: TestActor = student) {
    return request(app.getHttpServer())
      .get(`/coding/runs/${runId}`)
      .set(...authHeader(app, actor));
  }

  it('never executes inline with the request and returns a pending verdict', async () => {
    const queued = await submit().expect(201);

    expect(queued.body).toMatchObject({ status: 'PENDING', verdict: null });
    expect(provider.calls).toHaveLength(0);

    await queue.enqueue(DRAIN, undefined);

    expect(provider.calls).toHaveLength(1);
    const settled = await readRun(queued.body.runId).expect(200);
    expect(settled.body).toMatchObject({
      status: 'COMPLETE',
      verdict: 'ACCEPTED',
    });
  });

  it('attaches a result to the correct submission and is idempotent on re-drain', async () => {
    const first = await submit(student, 'A').expect(201);
    const second = await submit(student, 'B').expect(201);

    provider.outcomeFor = (_ordinal, req) =>
      req.sourceCode === 'B' ? 'WRONG_OUTPUT' : 'OK';

    await queue.enqueue(DRAIN, undefined);
    await queue.enqueue(DRAIN, undefined);

    const a = await readRun(first.body.runId).expect(200);
    const b = await readRun(second.body.runId).expect(200);
    expect(a.body.verdict).toBe('ACCEPTED');
    expect(b.body.verdict).toBe('WRONG_ANSWER');

    const usage = await database.db
      .select()
      .from(codingExecutionUsage)
      .where(eq(codingExecutionUsage.userId, student.userId));
    expect(usage).toHaveLength(2);
  });

  it('maps every provider outcome to the right verdict', async () => {
    await setLimits({ submissionsPerMinute: 50, submissionsPerDay: 500 });
    const cases: [string, string][] = [
      ['OK', 'ACCEPTED'],
      ['WRONG_OUTPUT', 'WRONG_ANSWER'],
      ['TIMEOUT', 'TIME_LIMIT_EXCEEDED'],
      ['OUT_OF_MEMORY', 'MEMORY_LIMIT_EXCEEDED'],
      ['RUNTIME_FAULT', 'RUNTIME_ERROR'],
      ['COMPILE_FAILURE', 'COMPILATION_ERROR'],
    ];

    for (const [outcome, verdict] of cases) {
      provider.outcomeFor = () => outcome as never;
      const queued = await submit().expect(201);
      await queue.enqueue(DRAIN, undefined);
      const run = await readRun(queued.body.runId).expect(200);
      expect(run.body.verdict).toBe(verdict);
    }
  });

  it('reports a provider fault as an internal error, never as a wrong answer', async () => {
    provider.failNext = true;
    const queued = await submit().expect(201);
    await queue.enqueue(DRAIN, undefined);

    const run = await readRun(queued.body.runId).expect(200);
    expect(run.body.verdict).toBe('INTERNAL_ERROR');
    expect(run.body.failureDetail).toContain('our fault');
  });

  it('reports an unrecognised provider outcome as an internal error rather than guessing', async () => {
    provider.malformed = true;
    const queued = await submit().expect(201);
    await queue.enqueue(DRAIN, undefined);

    const run = await readRun(queued.body.runId).expect(200);
    expect(run.body.verdict).toBe('INTERNAL_ERROR');
  });

  it('does not charge an internal error against usage or the rate budget', async () => {
    await setLimits({ submissionsPerMinute: 2 });

    provider.failNext = true;
    const failed = await submit().expect(201);
    await queue.enqueue(DRAIN, undefined);
    expect((await readRun(failed.body.runId)).body.verdict).toBe('INTERNAL_ERROR');

    const usage = await database.db
      .select()
      .from(codingExecutionUsage)
      .where(eq(codingExecutionUsage.userId, student.userId));
    expect(usage).toHaveLength(0);

    await submit().expect(201);
    await queue.enqueue(DRAIN, undefined);
    await submit().expect(201);
    await queue.enqueue(DRAIN, undefined);

    await submit().expect(403);
  });

  it('enforces the per-minute limit per student from owner configuration', async () => {
    await setLimits({ submissionsPerMinute: 2 });

    await submit().expect(201);
    await submit().expect(201);
    const refused = await submit().expect(403);
    expect(refused.body.code).toBe('EXECUTION_RATE_LIMIT');

    const other = await createUser(database, 'LEARNER');
    await submit(other).expect(201);

    clock.advance(61_000);
    await submit().expect(201);
  });

  it('enforces the daily limit separately from the per-minute limit', async () => {
    await setLimits({ submissionsPerMinute: 100, submissionsPerDay: 2 });

    await submit().expect(201);
    await submit().expect(201);
    await submit().expect(403);

    clock.advance(61_000);
    await submit().expect(403);

    clock.advance(86_400_001);
    await submit().expect(201);
  });

  it('still shows existing results to a rate-limited student', async () => {
    const queued = await submit().expect(201);
    await queue.enqueue(DRAIN, undefined);
    await setLimits({ submissionsPerMinute: 1 });
    await submit().expect(403);

    await readRun(queued.body.runId).expect(200);
    await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}/submissions`)
      .set(...authHeader(app, student))
      .expect(200);
  });

  it('runs a sample run against the visible cases only and reports the student output', async () => {
    provider.outcomeFor = () => 'WRONG_OUTPUT';
    const queued = await sampleRun().expect(201);
    await queue.enqueue(DRAIN, undefined);

    const run = await readRun(queued.body.runId).expect(200);
    expect(run.body.kind).toBe('SAMPLE_RUN');
    expect(run.body.cases).toHaveLength(1);
    expect(run.body.cases[0]).toMatchObject({
      ordinal: 1,
      visibility: 'VISIBLE',
      passed: false,
      input: '1 2',
      expectedOutput: '3',
      actualOutput: 'out:1 2',
    });
  });

  it('records usage attributable to the student who caused it', async () => {
    await submit().expect(201);
    await queue.enqueue(DRAIN, undefined);

    const mine = await request(app.getHttpServer())
      .get('/coding/usage/me')
      .set(...authHeader(app, student))
      .expect(200);
    expect(mine.body).toMatchObject({ userId: student.userId, runs: 1 });

    const asAdmin = await request(app.getHttpServer())
      .get(`/coding/usage/of/${student.userId}`)
      .set(...authHeader(app, admin))
      .expect(200);
    expect(asAdmin.body.runs).toBe(1);

    await request(app.getHttpServer())
      .get(`/coding/usage/of/${student.userId}`)
      .set(...authHeader(app, student))
      .expect(403);
  });

  it('keeps submission history with verdicts and code, private to its author', async () => {
    const first = await submit(student, 'attempt-one').expect(201);
    await queue.enqueue(DRAIN, undefined);
    clock.advance(1000);
    provider.outcomeFor = () => 'WRONG_OUTPUT';
    await submit(student, 'attempt-two').expect(201);
    await queue.enqueue(DRAIN, undefined);

    const history = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}/submissions`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(history.body).toHaveLength(2);
    expect(history.body[0].sourceCode).toBe('attempt-two');
    expect(history.body[1].sourceCode).toBe('attempt-one');
    expect(history.body[1].runId).toBe(first.body.runId);

    const other = await createUser(database, 'LEARNER');
    const theirs = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}/submissions`)
      .set(...authHeader(app, other))
      .expect(200);
    expect(theirs.body).toEqual([]);

    const staffView = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}/submissions/of/${student.userId}`)
      .set(...authHeader(app, admin))
      .expect(200);
    expect(staffView.body).toHaveLength(2);
  });

  it('restores editor state and falls back to the starter code', async () => {
    const fresh = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}/draft?language=python`)
      .set(...authHeader(app, student))
      .expect(200);
    expect(fresh.body.sourceCode).toBe('def solve():\n    pass');

    await request(app.getHttpServer())
      .put(`/coding/problems/${problemId}/draft`)
      .set(...authHeader(app, student))
      .send({ language: 'python', sourceCode: 'half done' })
      .expect(200);

    const restored = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}/draft?language=python`)
      .set(...authHeader(app, student))
      .expect(200);
    expect(restored.body.sourceCode).toBe('half done');

    const runs = await database.db
      .select()
      .from(codingRuns)
      .where(eq(codingRuns.userId, student.userId));
    expect(runs).toHaveLength(0);
  });

  it('withholds the editorial until the student solves it or gives up', async () => {
    await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}/editorial`)
      .set(...authHeader(app, student))
      .expect(403);

    await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/give-up`)
      .set(...authHeader(app, student))
      .expect(201);

    const editorial = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}/editorial`)
      .set(...authHeader(app, student))
      .expect(200);
    expect(editorial.body).toMatchObject({
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
    });

    const solver = await createUser(database, 'LEARNER');
    await submit(solver).expect(201);
    await queue.enqueue(DRAIN, undefined);
    await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}/editorial`)
      .set(...authHeader(app, solver))
      .expect(200);
  });

  it('notifies the student when a submission verdict arrives', async () => {
    const before = await request(app.getHttpServer())
      .get('/notifications?limit=100')
      .set(...authHeader(app, student))
      .expect(200);

    await submit().expect(201);
    await queue.enqueue(DRAIN, undefined);

    const after = await request(app.getHttpServer())
      .get('/notifications?limit=100')
      .set(...authHeader(app, student))
      .expect(200);

    expect(after.body.data.length).toBe(before.body.data.length + 1);
  });
});
