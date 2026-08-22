import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { MODEL_PROVIDER } from '../src/ai/model-provider';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import { makeModelProvider, RecordingModelProvider } from './support/ai-factories';

describe('ai foundation', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let provider: RecordingModelProvider;
  const clock = new TestClock();

  let admin: TestActor;
  let instructor: TestActor;
  let student: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
    provider = makeModelProvider();
    app = await createTestApp(database, clock, [
      { token: MODEL_PROVIDER, value: provider },
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
    provider.batches = [];
    provider.failNext = false;
    admin = await createUser(database, 'PLATFORM_ADMIN');
    instructor = await createUser(database, 'INSTRUCTOR');
    student = await createUser(database, 'LEARNER');
  });

  it('refuses a student sight of model cost', async () => {
    await request(app.getHttpServer())
      .get('/ai/cost')
      .set(...authHeader(app, student))
      .expect(403);
  });

  it('refuses an instructor sight of model cost', async () => {
    await request(app.getHttpServer())
      .get('/ai/cost')
      .set(...authHeader(app, instructor))
      .expect(403);
  });

  it('gives the owner an empty breakdown rather than an error when nothing has run', async () => {
    const response = await request(app.getHttpServer())
      .get('/ai/cost')
      .set(...authHeader(app, admin))
      .expect(200);

    expect(response.body.rows).toEqual([]);
    expect(response.body.totals.calls).toBe(0);
    expect(response.body.totals.cacheReadTokens).toBe(0);
  });

  it('reports cache-read tokens as their own figure', async () => {
    const response = await request(app.getHttpServer())
      .get('/ai/cost')
      .set(...authHeader(app, admin))
      .expect(200);

    expect(response.body.totals).toHaveProperty('cacheReadTokens');
    expect(response.body.totals).toHaveProperty('cacheWriteTokens');
    expect(response.body.totals).toHaveProperty('inputTokens');
    expect(response.body.totals).toHaveProperty('outputTokens');
  });

  it('rejects a malformed date range rather than defaulting silently', async () => {
    await request(app.getHttpServer())
      .get('/ai/cost')
      .query({ from: 'not-a-date' })
      .set(...authHeader(app, admin))
      .expect(400);
  });
});
