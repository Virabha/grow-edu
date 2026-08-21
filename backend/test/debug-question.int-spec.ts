import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import { seedDifficultyScale, createTaxonomy, text, Taxonomy } from './support/assessment-factories';

describe('debug', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let admin: TestActor;
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
    admin = await createUser(database, 'PLATFORM_ADMIN');
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, admin.userId);
  });

  it('shows the 400 body', async () => {
    const body = {
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
    };
    
    console.log('Sending body:', JSON.stringify(body, null, 2));
    
    const { status, body: respBody } = await request(app.getHttpServer())
      .post('/assessment/questions')
      .set(...authHeader(app, admin))
      .send(body);
    
    console.log('Status:', status);
    console.log('Response:', JSON.stringify(respBody, null, 2));
    
    expect(status).toBeDefined();
  });
});
