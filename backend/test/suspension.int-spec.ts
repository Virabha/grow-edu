import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createUser, createSignInUser } from './support/factories';

const PASSWORD = 'correct-horse-battery-staple';

describe('account suspension', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let admin: TestActor;
  let student: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createSignInUser(database, 'LEARNER', PASSWORD);
  });

  function suspend(actor: TestActor, targetId: string, reason: string) {
    return request(app.getHttpServer())
      .post(`/users/${targetId}/suspend`)
      .set(...authHeader(app, actor))
      .send({ reason });
  }

  function reinstate(actor: TestActor, targetId: string) {
    return request(app.getHttpServer())
      .post(`/users/${targetId}/reinstate`)
      .set(...authHeader(app, actor));
  }

  function whoAmI(actor: TestActor) {
    return request(app.getHttpServer())
      .get('/users/me')
      .set(...authHeader(app, actor));
  }

  function signIn() {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: student.email, password: PASSWORD });
  }

  it('lets a platform admin suspend a student', async () => {
    await suspend(admin, student.userId, 'Sharing an account').expect(200);
  });

  it('refuses to let anyone but a platform admin suspend', async () => {
    const instructor = await createUser(database, 'INSTRUCTOR');

    await suspend(instructor, student.userId, 'No reason').expect(403);
    await whoAmI(student).expect(200);
  });

  it('cuts off a session that was already signed in', async () => {
    await whoAmI(student).expect(200);

    await suspend(admin, student.userId, 'Sharing an account').expect(200);

    await whoAmI(student).expect(401);
  });

  it('refuses a fresh sign-in with a reason the student can act on', async () => {
    await suspend(admin, student.userId, 'Sharing an account').expect(200);

    const refused = await signIn();

    expect(refused.status).toBe(403);
    expect(refused.body.access_token).toBeUndefined();
    expect(refused.body.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('restores access when the admin reinstates the account', async () => {
    await suspend(admin, student.userId, 'Sharing an account').expect(200);
    await whoAmI(student).expect(401);

    await reinstate(admin, student.userId).expect(200);

    await whoAmI(student).expect(200);
    await signIn().expect(200);
  });

  it('leaves other accounts alone', async () => {
    const bystander = await createUser(database, 'LEARNER');

    await suspend(admin, student.userId, 'Sharing an account').expect(200);

    await whoAmI(bystander).expect(200);
  });
});
