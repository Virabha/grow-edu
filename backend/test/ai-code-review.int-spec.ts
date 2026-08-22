import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { EXECUTION_PROVIDER } from '../src/coding/execution/execution-provider';
import { MODEL_PROVIDER } from '../src/ai/model-provider';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { AI_CODE_REVIEW_DRAIN } from '../src/coding/code-review.service';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import { makeProvider, RecordingProvider, seedProblem } from './support/coding-factories';
import { makeModelProvider, RecordingModelProvider } from './support/ai-factories';

const SECRET_INPUT = 'HIDDEN-SENTINEL-INPUT-XYZ';
const SECRET_OUTPUT = 'HIDDEN-SENTINEL-OUTPUT-XYZ';

describe('ai code review', () => {
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
    modelProvider.structuredFor = () => null;
    modelProvider.textFor = () => 'an answer';

    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    problemId = await seedProblem(app, admin, {
      visibleCases: [{ input: 'visible-in', expectedOutput: 'visible-out' }],
      hiddenCases: [{ input: SECRET_INPUT, expectedOutput: SECRET_OUTPUT }],
    });
  });

  async function submitAndJudge(actor: TestActor, sourceCode = 'def solve(): pass') {
    const queued = await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/submit`)
      .set(...authHeader(app, actor))
      .send({ language: 'python', sourceCode })
      .expect(201);

    await queue.enqueue('coding.runs.drain', undefined);
    return queued.body.runId as string;
  }

  it('returns pending when no review exists yet', async () => {
    const runId = await submitAndJudge(student);

    const res = await request(app.getHttpServer())
      .get(`/coding/runs/${runId}/ai-review`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.status).toBe('PENDING');
  });

  it('produces a review with approach, complexity, naming, structure after drain', async () => {
    modelProvider.structuredFor = () => ({
      approach: 'The student uses a brute-force loop.',
      complexity: 'O(n^2) time, O(1) space.',
      naming: 'Variable names are clear.',
      structure: 'The code is well organised.',
    });

    const runId = await submitAndJudge(student);
    await queue.enqueue(AI_CODE_REVIEW_DRAIN, undefined);

    const res = await request(app.getHttpServer())
      .get(`/coding/runs/${runId}/ai-review`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.status).toBe('READY');
    expect(res.body.approach).toBeTruthy();
    expect(res.body.complexity).toBeTruthy();
    expect(res.body.naming).toBeTruthy();
    expect(res.body.structure).toBeTruthy();
  });

  it('verdict is unchanged after a successful review', async () => {
    modelProvider.structuredFor = () => ({
      approach: 'Uses a hash map for O(n) lookup.',
      complexity: 'O(n) time and space.',
      naming: 'Descriptive names throughout.',
      structure: 'Single-responsibility functions.',
    });
    execProvider.outcomeFor = () => 'WRONG_OUTPUT';

    const runId = await submitAndJudge(student);
    await queue.enqueue(AI_CODE_REVIEW_DRAIN, undefined);

    const run = await request(app.getHttpServer())
      .get(`/coding/runs/${runId}`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(run.body.verdict).toBe('WRONG_ANSWER');

    const review = await request(app.getHttpServer())
      .get(`/coding/runs/${runId}/ai-review`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(review.body.status).toBe('READY');
  });

  it('marks the review as failed when the model call fails', async () => {
    modelProvider.failNext = true;

    const runId = await submitAndJudge(student);
    await queue.enqueue(AI_CODE_REVIEW_DRAIN, undefined);

    const res = await request(app.getHttpServer())
      .get(`/coding/runs/${runId}/ai-review`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.status).toBe('FAILED');
  });

  it('verdict and submission remain intact when review fails', async () => {
    modelProvider.failNext = true;
    execProvider.outcomeFor = () => 'OK';

    const runId = await submitAndJudge(student);
    await queue.enqueue(AI_CODE_REVIEW_DRAIN, undefined);

    const run = await request(app.getHttpServer())
      .get(`/coding/runs/${runId}`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(run.body.verdict).toBe('ACCEPTED');
    expect(run.body.status).toBe('COMPLETE');
  });

  it('only reviews JUDGE_SUBMISSION runs, not sample runs', async () => {
    await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/run`)
      .set(...authHeader(app, student))
      .send({ language: 'python', sourceCode: 'def solve(): pass' })
      .expect(201);

    await queue.enqueue('coding.runs.drain', undefined);

    const callsBefore = modelProvider.calls.length;
    await queue.enqueue(AI_CODE_REVIEW_DRAIN, undefined);
    expect(modelProvider.calls.length).toBe(callsBefore);
  });

  it('refuses another student sight of the review', async () => {
    const other = await createUser(database, 'LEARNER');
    const runId = await submitAndJudge(student);

    await request(app.getHttpServer())
      .get(`/coding/runs/${runId}/ai-review`)
      .set(...authHeader(app, other))
      .expect(403);
  });

  it('staff can see the review for any student', async () => {
    modelProvider.structuredFor = () => ({
      approach: 'Straightforward iteration.',
      complexity: 'Linear time.',
      naming: 'Good naming.',
      structure: 'Well-structured.',
    });

    const runId = await submitAndJudge(student);
    await queue.enqueue(AI_CODE_REVIEW_DRAIN, undefined);

    await request(app.getHttpServer())
      .get(`/coding/runs/${runId}/ai-review`)
      .set(...authHeader(app, admin))
      .expect(200);
  });

  it('does not send hidden test case inputs or outputs to the model', async () => {
    modelProvider.structuredFor = () => ({
      approach: 'Good approach.',
      complexity: 'Efficient.',
      naming: 'Clear.',
      structure: 'Organised.',
    });

    await submitAndJudge(student);
    await queue.enqueue(AI_CODE_REVIEW_DRAIN, undefined);

    expect(modelProvider.calls.length).toBeGreaterThan(0);
    const lastCall = modelProvider.calls[modelProvider.calls.length - 1];
    const payload = JSON.stringify(lastCall);
    expect(payload).not.toContain(SECRET_INPUT);
    expect(payload).not.toContain(SECRET_OUTPUT);
  });

  it('scrubs hidden sentinels from the review text before storing', async () => {
    modelProvider.structuredFor = () => ({
      approach: `The student processes inputs like ${SECRET_INPUT}.`,
      complexity: `The expected output ${SECRET_OUTPUT} reveals O(n).`,
      naming: 'Names are clear.',
      structure: 'Good structure.',
    });

    const runId = await submitAndJudge(student);
    await queue.enqueue(AI_CODE_REVIEW_DRAIN, undefined);

    const res = await request(app.getHttpServer())
      .get(`/coding/runs/${runId}/ai-review`)
      .set(...authHeader(app, student))
      .expect(200);

    const body = JSON.stringify(res.body);
    expect(body).not.toContain(SECRET_INPUT);
    expect(body).not.toContain(SECRET_OUTPUT);
    expect(res.body.approach).toContain('[redacted]');
  });

  it('review runs only after a judged verdict exists — skips a run that has not been judged', async () => {
    const queued = await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/submit`)
      .set(...authHeader(app, student))
      .send({ language: 'python', sourceCode: 'def solve(): pass' })
      .expect(201);

    const callsBefore = modelProvider.calls.length;
    await queue.enqueue(AI_CODE_REVIEW_DRAIN, undefined);
    expect(modelProvider.calls.length).toBe(callsBefore);

    const res = await request(app.getHttpServer())
      .get(`/coding/runs/${queued.body.runId as string}/ai-review`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.status).toBe('PENDING');
  });

  it('does not run review twice for the same run', async () => {
    modelProvider.structuredFor = () => ({
      approach: 'Good.',
      complexity: 'Efficient.',
      naming: 'Clear.',
      structure: 'Organised.',
    });

    await submitAndJudge(student);
    await queue.enqueue(AI_CODE_REVIEW_DRAIN, undefined);

    const callsAfterFirst = modelProvider.calls.length;
    await queue.enqueue(AI_CODE_REVIEW_DRAIN, undefined);
    expect(modelProvider.calls.length).toBe(callsAfterFirst);
  });
});
