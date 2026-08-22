import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { EXECUTION_PROVIDER } from '../src/coding/execution/execution-provider';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import { makeProvider, RecordingProvider, seedProblem } from './support/coding-factories';

const SECRET_INPUT = 'SECRET-INPUT-ZZZ';
const SECRET_OUTPUT = 'SECRET-OUTPUT-ZZZ';

describe('hidden test case confidentiality', () => {
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
    problemId = await seedProblem(app, admin, {
      visibleCases: [{ input: 'visible-in', expectedOutput: 'visible-out' }],
      hiddenCases: [{ input: SECRET_INPUT, expectedOutput: SECRET_OUTPUT }],
    });
  });

  function bodyOf(response: { text: string }): string {
    return response.text;
  }

  async function submit(actor: TestActor) {
    const queued = await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/submit`)
      .set(...authHeader(app, actor))
      .send({ language: 'python', sourceCode: 'print(1)' })
      .expect(201);
    await queue.enqueue('coding.runs.drain', undefined);
    return request(app.getHttpServer())
      .get(`/coding/runs/${queued.body.runId}`)
      .set(...authHeader(app, actor))
      .expect(200);
  }

  it('never discloses a hidden input or expected output when reading the problem', async () => {
    const asStudent = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(bodyOf(asStudent)).not.toContain(SECRET_INPUT);
    expect(bodyOf(asStudent)).not.toContain(SECRET_OUTPUT);
    expect(asStudent.body.cases).toHaveLength(1);
    expect(asStudent.body.cases[0].input).toBe('visible-in');
    expect(asStudent.body.hiddenCaseCount).toBe(1);
  });

  it('reports only the ordinal and the failure kind when a hidden case fails', async () => {
    provider.outcomeFor = (ordinal) => (ordinal === 2 ? 'WRONG_OUTPUT' : 'OK');

    const run = await submit(student);

    expect(run.body.verdict).toBe('WRONG_ANSWER');
    expect(run.body.failedCaseOrdinal).toBe(2);
    expect(run.body.failureDetail).not.toContain(SECRET_INPUT);
    expect(run.body.failureDetail).not.toContain(SECRET_OUTPUT);
    expect(bodyOf(run)).not.toContain(SECRET_INPUT);
    expect(bodyOf(run)).not.toContain(SECRET_OUTPUT);
    expect(run.body.cases.every((c: { actualOutput: unknown }) => c.actualOutput === null)).toBe(true);
  });

  it('scrubs hidden input out of compiler and runtime output', async () => {
    provider.outcomeFor = () => 'COMPILE_FAILURE';
    provider.messageFor = () =>
      `traceback near ${SECRET_INPUT} expecting ${SECRET_OUTPUT}`;

    const run = await submit(student);

    expect(run.body.verdict).toBe('COMPILATION_ERROR');
    expect(bodyOf(run)).not.toContain(SECRET_INPUT);
    expect(bodyOf(run)).not.toContain(SECRET_OUTPUT);
    expect(run.body.failureDetail).toContain('[redacted]');
  });

  it('keeps the response shape identical whether a hidden case passes or fails', async () => {
    provider.outcomeFor = () => 'OK';
    const passing = await submit(student);

    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    problemId = await seedProblem(app, admin, {
      visibleCases: [{ input: 'visible-in', expectedOutput: 'visible-out' }],
      hiddenCases: [{ input: SECRET_INPUT, expectedOutput: SECRET_OUTPUT }],
    });
    provider.outcomeFor = (ordinal) => (ordinal === 2 ? 'WRONG_OUTPUT' : 'OK');
    const failing = await submit(student);

    expect(Object.keys(passing.body).sort()).toEqual(
      Object.keys(failing.body).sort(),
    );
    expect(Object.keys(passing.body.cases[0]).sort()).toEqual(
      Object.keys(failing.body.cases[0]).sort(),
    );
  });

  it('never sends hidden cases to a sample run', async () => {
    await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/run`)
      .set(...authHeader(app, student))
      .send({ language: 'python', sourceCode: 'print(1)' })
      .expect(201);
    await queue.enqueue('coding.runs.drain', undefined);

    const sent = provider.calls[provider.calls.length - 1];
    expect(sent.cases).toHaveLength(1);
    expect(sent.cases[0].input).toBe('visible-in');
    expect(JSON.stringify(sent)).not.toContain(SECRET_INPUT);
  });

  it('never leaks hidden input through runtime error output', async () => {
    provider.outcomeFor = () => 'RUNTIME_FAULT';
    provider.messageFor = () =>
      `crashed reading ${SECRET_INPUT} expected ${SECRET_OUTPUT}`;

    const run = await submit(student);

    expect(run.body.verdict).toBe('RUNTIME_ERROR');
    expect(bodyOf(run)).not.toContain(SECRET_INPUT);
    expect(bodyOf(run)).not.toContain(SECRET_OUTPUT);
  });

  it('refuses a student the judge bundle of hidden assertions', async () => {
    const frontendId = await request(app.getHttpServer())
      .post('/coding/problems')
      .set(...authHeader(app, admin))
      .send({
        title: 'Card',
        slug: `card-${Math.floor(Math.random() * 1e9)}`,
        kind: 'FRONTEND',
        statement: [{ type: 'TEXT', text: 'Build it.' }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/coding/problems/${frontendId.body.problemId}/assertions/judge`)
      .set(...authHeader(app, student))
      .expect(403);
  });

  it('still shows an instructor the hidden cases in full', async () => {
    const asStaff = await request(app.getHttpServer())
      .get(`/coding/problems/${problemId}`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(bodyOf(asStaff)).toContain(SECRET_INPUT);
    expect(bodyOf(asStaff)).toContain(SECRET_OUTPUT);
    expect(asStaff.body.cases).toHaveLength(2);
  });

  it('refuses another student sight of a run that is not theirs', async () => {
    const other = await createUser(database, 'LEARNER');
    const queued = await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/submit`)
      .set(...authHeader(app, student))
      .send({ language: 'python', sourceCode: 'print(1)' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/coding/runs/${queued.body.runId}`)
      .set(...authHeader(app, other))
      .expect(404);
  });
});
