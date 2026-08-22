import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  ExecutionProvider,
  ExecutionRequest,
  ExecutionResult,
  ProviderOutcome,
} from '../../src/coding/execution/execution-provider';
import { authHeader, TestActor } from './test-app';

export interface RecordingProvider extends ExecutionProvider {
  calls: ExecutionRequest[];
  outcomeFor: (ordinal: number, request: ExecutionRequest) => ProviderOutcome;
  messageFor: (request: ExecutionRequest) => string;
  failNext: boolean;
  malformed: boolean;
}

export function makeProvider(): RecordingProvider {
  const provider: RecordingProvider = {
    calls: [],
    failNext: false,
    malformed: false,
    outcomeFor: () => 'OK',
    messageFor: () => '',
    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
      provider.calls.push(req);
      if (provider.failNext) {
        provider.failNext = false;
        throw new Error('provider exploded');
      }
      return {
        reference: `exec-${provider.calls.length}`,
        cases: req.cases.map((testCase) => ({
          ordinal: testCase.ordinal,
          outcome: provider.malformed
            ? ('SOMETHING_NEW' as ProviderOutcome)
            : provider.outcomeFor(testCase.ordinal, req),
          actualOutput: `out:${testCase.input}`,
          runtimeMs: 12,
          memoryKb: 2048,
          message: provider.messageFor(req),
        })),
      };
    },
  };
  return provider;
}

export interface SeedProblemOptions {
  slug?: string;
  visibleCases?: { input: string; expectedOutput: string }[];
  hiddenCases?: { input: string; expectedOutput: string }[];
  language?: string;
  publish?: boolean;
}

export async function seedProblem(
  app: INestApplication,
  staff: TestActor,
  options: SeedProblemOptions = {},
): Promise<string> {
  const slug = options.slug ?? `two-sum-${Math.floor(Math.random() * 1e9)}`;
  const language = options.language ?? 'python';

  const created = await request(app.getHttpServer())
    .post('/coding/problems')
    .set(...authHeader(app, staff))
    .send({
      title: 'Two Sum',
      slug,
      difficulty: 2,
      statement: [{ type: 'TEXT', text: 'Return the two indices.' }],
      constraints: [{ type: 'TEXT', text: 'n <= 1000' }],
    })
    .expect(201);

  const problemId = created.body.problemId as string;

  await request(app.getHttpServer())
    .put(`/coding/problems/${problemId}/languages`)
    .set(...authHeader(app, staff))
    .send({
      language,
      starterCode: 'def solve():\n    pass',
      referenceSolution: 'def solve():\n    return 1',
      timeLimitMs: 2000,
      memoryLimitMb: 256,
    })
    .expect(200);

  const visible = options.visibleCases ?? [
    { input: '1 2', expectedOutput: '3' },
  ];
  const hidden = options.hiddenCases ?? [
    { input: 'SECRET-INPUT-A', expectedOutput: 'SECRET-OUTPUT-A' },
  ];

  let ordinal = 1;
  for (const testCase of visible) {
    await request(app.getHttpServer())
      .put(`/coding/problems/${problemId}/cases`)
      .set(...authHeader(app, staff))
      .send({ ordinal, visibility: 'VISIBLE', ...testCase })
      .expect(200);
    ordinal += 1;
  }
  for (const testCase of hidden) {
    await request(app.getHttpServer())
      .put(`/coding/problems/${problemId}/cases`)
      .set(...authHeader(app, staff))
      .send({ ordinal, visibility: 'HIDDEN', ...testCase })
      .expect(200);
    ordinal += 1;
  }

  await request(app.getHttpServer())
    .put(`/coding/problems/${problemId}/editorial`)
    .set(...authHeader(app, staff))
    .send({
      body: [{ type: 'TEXT', text: 'Use a hash map.' }],
      modelSolution: 'def solve(): return 1',
      modelSolutionLanguage: language,
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
    })
    .expect(200);

  if (options.publish !== false) {
    await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/validate?language=${language}`)
      .set(...authHeader(app, staff))
      .expect(201);
    await request(app.getHttpServer())
      .post(`/coding/problems/${problemId}/publish`)
      .set(...authHeader(app, staff))
      .expect(201);
  }

  return problemId;
}
