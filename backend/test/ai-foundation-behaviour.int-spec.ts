import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import * as request from 'supertest';

import { MODEL_PROVIDER } from '../src/ai/model-provider';
import { BATCH_RECONCILE_JOB } from '../src/ai/batch.service';
import { STUDY_PLAN_REGEN_JOB } from '../src/ai/study-plan.service';
import { DOUBT_DRAIN_JOB } from '../src/batches/engagement/doubt-answer.service';
import {
  aiModelCalls,
  batchDoubts,
  lessons,
  subjectLessons,
} from '../src/database/schema';
import { assessmentQuestions } from '../src/database/schema';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import {
  createUser,
  createBatch,
  createSubject,
  createLesson,
  enrol,
  assignInstructor,
} from './support/factories';
import { makeModelProvider, RecordingModelProvider } from './support/ai-factories';
import {
  createTaxonomy,
  seedDifficultyScale,
  Taxonomy,
} from './support/assessment-factories';

const SOURCE_ROOT = join(__dirname, '..', 'src');
const ANTHROPIC_API_BASE = 'https://api.anthropic.com';
const ANTHROPIC_SDK_IMPORT_PATTERN = /@anthropic-ai\//;

function walkSourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules') continue;
      found.push(...walkSourceFiles(full));
      continue;
    }
    if (!entry.endsWith('.ts')) continue;
    if (entry.endsWith('.spec.ts')) continue;
    found.push(full);
  }
  return found;
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('model provider port boundary (ticket 01)', () => {
  const files = walkSourceFiles(SOURCE_ROOT).map((filePath) => ({
    path: filePath.slice(SOURCE_ROOT.length + 1).replace(/\\/g, '/'),
    source: stripComments(readFileSync(filePath, 'utf8')),
  }));

  it('no source file imports from @anthropic-ai/*', () => {
    const offenders = files
      .filter((f) => ANTHROPIC_SDK_IMPORT_PATTERN.test(f.source))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('only model-provider.ts references the Anthropic API base URL', () => {
    const offenders = files
      .filter(
        (f) =>
          f.source.includes(ANTHROPIC_API_BASE) &&
          f.path !== 'ai/model-provider.ts',
      )
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('model-provider.ts does contain the Anthropic API base URL (sanity check)', () => {
    const provider = files.find((f) => f.path === 'ai/model-provider.ts');
    expect(provider).toBeDefined();
    expect(provider?.source).toContain(ANTHROPIC_API_BASE);
  });
});

describe('prompt caching — per-call recording (ticket 03)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let provider: RecordingModelProvider;
  let queue: InlineJobQueue;
  const clock = new TestClock();

  let admin: TestActor;
  let student: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
    provider = makeModelProvider();
    app = await createTestApp(database, clock, [
      { token: MODEL_PROVIDER, value: provider },
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
    provider.batches = [];
    provider.failNext = false;
    provider.structuredFor = () => ({
      summary: 'Focused study plan for today.',
      items: [
        {
          kind: 'REVIEW',
          title: 'Review session',
          durationMinutes: 30,
          rationale: 'Keep retention high.',
        },
      ],
    });
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
  });

  it('cache-read tokens returned by the provider are recorded in the aiModelCalls row', async () => {
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);

    provider.usageFor = () => ({
      inputTokens: 200,
      outputTokens: 40,
      cacheReadTokens: 150,
      cacheWriteTokens: 0,
    });

    await queue.enqueue(STUDY_PLAN_REGEN_JOB, undefined);

    const rows = await database.db.select().from(aiModelCalls);
    const planRow = rows.find((r) => r.feature === 'study-plan');
    expect(planRow).toBeDefined();
    expect(planRow?.cacheReadTokens).toBe(150);
    expect(planRow?.inputTokens).toBe(200);
    expect(planRow?.outputTokens).toBe(40);
    expect(planRow?.outcome).toBe('SUCCEEDED');
  });

  it('cached prefix is byte-identical for two students asking doubts in the same batch', async () => {
    const batchId = await createBatch(database, admin.userId);
    const subjectId = await createSubject(database, batchId);

    const student2 = await createUser(database, 'LEARNER');
    await enrol(database, batchId, student.userId);
    await enrol(database, batchId, student2.userId);

    await createLesson(database, subjectId, {
      title: 'Shared lesson',
      textContent: 'Shared course content for both students.',
      status: 'READY',
    });

    provider.structuredFor = () => ({
      answer: 'A complete sufficient answer about the topic that is very detailed.',
      citations: [],
    });

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts`)
      .set(...authHeader(app, student))
      .send({ title: 'First student question', body: 'Explain this topic please.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/batches/${batchId}/doubts`)
      .set(...authHeader(app, student2))
      .send({ title: 'Second student question', body: 'Also explain this topic.' })
      .expect(201);

    await queue.enqueue(DOUBT_DRAIN_JOB, undefined);

    expect(provider.calls.length).toBe(2);
    expect(provider.calls[0].cachedPrefix).toBe(provider.calls[1].cachedPrefix);
    expect(provider.calls[0].cachedPrefix).not.toContain(student.userId);
    expect(provider.calls[0].cachedPrefix).not.toContain(student2.userId);
  });
});

describe('batch API (ticket 04)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let provider: RecordingModelProvider;
  let queue: InlineJobQueue;
  const clock = new TestClock();

  let instructor: TestActor;
  let taxonomy: Taxonomy;

  const singleQuestionOutput = {
    statement: 'What does TCP stand for?',
    optionA: 'Transmission Control Protocol',
    optionB: 'Transfer Connectivity Protocol',
    optionC: 'Total Connection Procedure',
    optionD: 'Transfer Control Plan',
    correctIndex: 0,
    explanation: 'TCP is Transmission Control Protocol.',
  };

  beforeAll(async () => {
    database = await createTestDatabase();
    provider = makeModelProvider();
    app = await createTestApp(database, clock, [
      { token: MODEL_PROVIDER, value: provider },
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
    provider.batches = [];
    provider.failNext = false;
    provider.batchComplete = true;
    provider.batchOutcomeFor = () => 'SUCCEEDED';
    provider.structuredFor = () => singleQuestionOutput;
    instructor = await createUser(database, 'INSTRUCTOR');
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, instructor.userId);
  });

  it('a reconciled item is never processed twice — driving reconcile twice creates no duplicates', async () => {
    await request(app.getHttpServer())
      .post('/assessment/questions/bulk-generate')
      .set(...authHeader(app, instructor))
      .send({
        subjectId: taxonomy.subjectId,
        topicId: taxonomy.topicId,
        difficulty: 1,
        count: 2,
      })
      .expect(201);

    await queue.enqueue(BATCH_RECONCILE_JOB, undefined);

    const afterFirst = await database.db
      .select({ questionId: assessmentQuestions.questionId })
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.topicId, taxonomy.topicId));

    expect(afterFirst.length).toBe(2);

    await queue.enqueue(BATCH_RECONCILE_JOB, undefined);

    const afterSecond = await database.db
      .select({ questionId: assessmentQuestions.questionId })
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.topicId, taxonomy.topicId));

    expect(afterSecond.length).toBe(2);
  });

  it('batch usage is attributed in aiModelCalls with batched=YES after reconciliation', async () => {
    await request(app.getHttpServer())
      .post('/assessment/questions/bulk-generate')
      .set(...authHeader(app, instructor))
      .send({
        subjectId: taxonomy.subjectId,
        topicId: taxonomy.topicId,
        difficulty: 1,
        count: 1,
      })
      .expect(201);

    await queue.enqueue(BATCH_RECONCILE_JOB, undefined);

    const rows = await database.db
      .select()
      .from(aiModelCalls)
      .where(
        and(
          eq(aiModelCalls.feature, 'assessment.bulk-generation'),
          eq(aiModelCalls.batched, 'YES'),
        ),
      );

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].outcome).toBe('SUCCEEDED');
  });
});
