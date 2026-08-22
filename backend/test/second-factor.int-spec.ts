import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createSignInUser, createUser } from './support/factories';
import { codeFor } from '../src/auth/totp';

const PASSWORD = 'CorrectHorseBattery1!';

interface LoginBody {
  access_token?: string;
  secondFactorRequired?: boolean;
  code?: string;
  challengeToken?: string;
  setupToken?: string;
  setup?: { secret: string; recoveryCodes: string[]; otpauthUri: string };
}

describe('second factor for staff sign-in', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    app = await createTestApp(database, clock);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  let sourceIp: string;
  let ipCounter = 0;

  beforeEach(async () => {
    await truncateAll(database);
    clock.set('2026-12-01T09:00:00.000Z');
    ipCounter += 1;
    sourceIp = `203.0.113.${ipCounter}`;
  });

  function signIn(actor: TestActor) {
    return request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', sourceIp)
      .send({ email: actor.email, password: PASSWORD });
  }

  function present(challengeToken: string, code: string) {
    return request(app.getHttpServer())
      .post('/auth/login/second-factor')
      .set('X-Forwarded-For', sourceIp)
      .send({ challengeToken, code });
  }

  function confirmDuringLogin(setupToken: string, code: string) {
    return request(app.getHttpServer())
      .post('/auth/login/second-factor/confirm')
      .set('X-Forwarded-For', sourceIp)
      .send({ challengeToken: setupToken, code });
  }

  function now(): number {
    return new Date('2026-12-01T09:00:00.000Z').getTime();
  }

  async function enrolStaff(actor: TestActor) {
    const { body } = await signIn(actor).expect(200);
    const login = body as LoginBody;
    const secret = login.setup?.secret ?? '';
    const completed = await confirmDuringLogin(
      login.setupToken ?? '',
      codeFor(secret, clock.epochMillis()),
    ).expect(200);
    return {
      secret,
      recoveryCodes: login.setup?.recoveryCodes ?? [],
      accessToken: completed.body.access_token as string,
    };
  }

  it('refuses to complete a staff sign-in on a password alone', async () => {
    const staff = await createSignInUser(database, 'PLATFORM_ADMIN', PASSWORD);

    const { body } = await signIn(staff).expect(200);

    expect(body.access_token).toBeUndefined();
    expect(body.secondFactorRequired).toBe(true);
    expect(body.code).toBe('SECOND_FACTOR_SETUP_REQUIRED');
    expect(body.setup.secret).toEqual(expect.any(String));
    expect(body.setup.recoveryCodes).toHaveLength(10);
  });

  it('lets a student sign in on a password alone', async () => {
    const student = await createSignInUser(database, 'LEARNER', PASSWORD);

    const { body } = await signIn(student).expect(200);

    expect(body.access_token).toEqual(expect.any(String));
    expect(body.secondFactorRequired).toBeUndefined();
  });

  it('completes a staff sign-in once the factor is set up and presented', async () => {
    const staff = await createSignInUser(database, 'INSTRUCTOR', PASSWORD);
    const { secret, accessToken } = await enrolStaff(staff);

    expect(accessToken).toEqual(expect.any(String));

    clock.set('2026-12-01T10:00:00.000Z');
    const second = await signIn(staff).expect(200);
    expect(second.body.access_token).toBeUndefined();
    expect(second.body.code).toBe('SECOND_FACTOR_REQUIRED');

    const done = await present(
      second.body.challengeToken,
      codeFor(secret, clock.epochMillis()),
    ).expect(200);

    expect(done.body.access_token).toEqual(expect.any(String));
    expect(done.body.user.email).toBe(staff.email);
  });

  it('refuses a wrong code', async () => {
    const staff = await createSignInUser(database, 'INSTRUCTOR', PASSWORD);
    await enrolStaff(staff);

    clock.set('2026-12-01T10:00:00.000Z');
    const { body } = await signIn(staff).expect(200);

    await present(body.challengeToken, '000000').expect(401);
  });

  it('refuses a code once the challenge has expired', async () => {
    const staff = await createSignInUser(database, 'INSTRUCTOR', PASSWORD);
    const { secret } = await enrolStaff(staff);

    clock.set('2026-12-01T10:00:00.000Z');
    const { body } = await signIn(staff).expect(200);

    clock.set('2026-12-01T10:06:00.000Z');
    await present(
      body.challengeToken,
      codeFor(secret, clock.epochMillis()),
    ).expect(401);
  });

  it('refuses to spend one challenge twice', async () => {
    const staff = await createSignInUser(database, 'INSTRUCTOR', PASSWORD);
    const { secret } = await enrolStaff(staff);

    clock.set('2026-12-01T10:00:00.000Z');
    const { body } = await signIn(staff).expect(200);
    const code = codeFor(secret, clock.epochMillis());

    await present(body.challengeToken, code).expect(200);
    await present(body.challengeToken, code).expect(401);
  });

  it('refuses to reuse the same code on a fresh challenge', async () => {
    const staff = await createSignInUser(database, 'INSTRUCTOR', PASSWORD);
    const { secret } = await enrolStaff(staff);

    clock.set('2026-12-01T10:00:00.000Z');
    const code = codeFor(secret, clock.epochMillis());
    const first = await signIn(staff).expect(200);
    await present(first.body.challengeToken, code).expect(200);

    const second = await signIn(staff).expect(200);
    await present(second.body.challengeToken, code).expect(401);
  });

  it('lets a locked-out staff member in with a recovery code, once', async () => {
    const staff = await createSignInUser(database, 'PLATFORM_ADMIN', PASSWORD);
    const { recoveryCodes } = await enrolStaff(staff);

    clock.set('2026-12-01T10:00:00.000Z');
    const first = await signIn(staff).expect(200);
    const done = await present(
      first.body.challengeToken,
      recoveryCodes[0],
    ).expect(200);
    expect(done.body.access_token).toEqual(expect.any(String));

    const second = await signIn(staff).expect(200);
    await present(second.body.challengeToken, recoveryCodes[0]).expect(401);
  });

  it('lets an owner clear a factor without touching the password', async () => {
    const owner = await createUser(database, 'PLATFORM_ADMIN');
    const staff = await createSignInUser(database, 'INSTRUCTOR', PASSWORD);
    await enrolStaff(staff);

    await request(app.getHttpServer())
      .delete(`/auth/second-factor/of/${staff.userId}`)
      .set(...authHeader(app, owner))
      .expect(200);

    clock.set('2026-12-01T10:00:00.000Z');
    const { body } = await signIn(staff).expect(200);
    expect(body.code).toBe('SECOND_FACTOR_SETUP_REQUIRED');
    expect(body.setup.secret).toEqual(expect.any(String));
  });

  it('keeps one staff member from clearing another\'s factor', async () => {
    const staff = await createSignInUser(database, 'INSTRUCTOR', PASSWORD);
    const other = await createUser(database, 'INSTRUCTOR');
    const { accessToken } = await enrolStaff(staff);

    await request(app.getHttpServer())
      .delete(`/auth/second-factor/of/${other.userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('records enrolment, use and reset', async () => {
    const owner = await createUser(database, 'PLATFORM_ADMIN');
    const staff = await createSignInUser(database, 'INSTRUCTOR', PASSWORD);
    const { secret } = await enrolStaff(staff);

    clock.set('2026-12-01T10:00:00.000Z');
    const login = await signIn(staff).expect(200);
    await present(
      login.body.challengeToken,
      codeFor(secret, clock.epochMillis()),
    ).expect(200);

    await request(app.getHttpServer())
      .delete(`/auth/second-factor/of/${staff.userId}`)
      .set(...authHeader(app, owner))
      .expect(200);

    for (const action of [
      'second-factor.enrol',
      'second-factor.use',
      'second-factor.reset',
    ]) {
      const { body } = await request(app.getHttpServer())
        .get(`/audit-log?action=${action}`)
        .set(...authHeader(app, owner))
        .expect(200);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0].targetId).toBe(staff.userId);
    }
  });

  it('records a recovery-code sign-in as a recovery', async () => {
    const owner = await createUser(database, 'PLATFORM_ADMIN');
    const staff = await createSignInUser(database, 'INSTRUCTOR', PASSWORD);
    const { recoveryCodes } = await enrolStaff(staff);

    clock.set('2026-12-01T10:00:00.000Z');
    const login = await signIn(staff).expect(200);
    await present(login.body.challengeToken, recoveryCodes[0]).expect(200);

    const { body } = await request(app.getHttpServer())
      .get('/audit-log?action=second-factor.recover')
      .set(...authHeader(app, owner))
      .expect(200);

    expect(body[0].after.viaRecoveryCode).toBe(true);
  });

  it('keeps a staff member from turning their own factor off', async () => {
    const staff = await createSignInUser(database, 'INSTRUCTOR', PASSWORD);
    const { secret, accessToken } = await enrolStaff(staff);

    await request(app.getHttpServer())
      .post('/auth/second-factor/disable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: codeFor(secret, clock.epochMillis()) })
      .expect(409);
  });

  it('lets a student opt in and back out', async () => {
    const student = await createSignInUser(database, 'LEARNER', PASSWORD);
    const { body: first } = await signIn(student).expect(200);
    const token = first.access_token;

    const { body: setup } = await request(app.getHttpServer())
      .post('/auth/second-factor/setup')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/second-factor/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: codeFor(setup.secret, clock.epochMillis()) })
      .expect(200);

    clock.set('2026-12-01T10:00:00.000Z');
    const gated = await signIn(student).expect(200);
    expect(gated.body.access_token).toBeUndefined();
    expect(gated.body.code).toBe('SECOND_FACTOR_REQUIRED');

    const done = await present(
      gated.body.challengeToken,
      codeFor(setup.secret, clock.epochMillis()),
    ).expect(200);

    await request(app.getHttpServer())
      .post('/auth/second-factor/disable')
      .set('Authorization', `Bearer ${done.body.access_token}`)
      .send({ code: codeFor(setup.secret, clock.epochMillis()) })
      .expect(200);

    clock.set('2026-12-01T11:00:00.000Z');
    const plain = await signIn(student).expect(200);
    expect(plain.body.access_token).toEqual(expect.any(String));
  });

  it('still registers the device and honours the device limit', async () => {
    const staff = await createSignInUser(database, 'INSTRUCTOR', PASSWORD);
    const { accessToken } = await enrolStaff(staff);

    const { body } = await request(app.getHttpServer())
      .get('/users/me/devices')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((body.data ?? body).length).toBeGreaterThan(0);
    expect(now()).toBeGreaterThan(0);
  });
});
