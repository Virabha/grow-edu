import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp } from './support/test-app';
import { TestClock } from './support/test-clock';
import {
  GOOGLE_TOKEN_VERIFIER,
  GoogleTokenClaims,
  GoogleTokenVerifier,
} from '../src/auth/ports/google-token-verifier';

describe('google sign-in (ticket 32)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let fakeResult: GoogleTokenClaims | null = null;
  let run = 0;

  const fakeVerifier: GoogleTokenVerifier = {
    async verify(_idToken: string): Promise<GoogleTokenClaims | null> {
      return fakeResult;
    },
  };

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    app = await createTestApp(database, clock, [
      { token: GOOGLE_TOKEN_VERIFIER, value: fakeVerifier },
    ]);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    run += 1;
    await truncateAll(database);
    fakeResult = null;
  });

  function googleEmail(): string {
    return `guser-${run}@gmail.com`;
  }

  function googleSubject(): string {
    return `gsub-${run}-001`;
  }

  function signIn(idToken = 'any-token') {
    return request(app.getHttpServer())
      .post('/auth/google/sign-in')
      .set('X-Forwarded-For', `3.3.${run}.1`)
      .send({ idToken });
  }

  it('a verified Google identity signs the user in and returns an access token', async () => {
    fakeResult = {
      subject: googleSubject(),
      email: googleEmail(),
      emailVerified: true,
    };
    const res = await signIn();
    expect(res.status).toBe(200);
    expect(typeof res.body.access_token).toBe('string');
    expect(res.body.user).toBeDefined();
  });

  it('a null (forged/unknown) token is refused', async () => {
    fakeResult = null;
    const res = await signIn('forged-token');
    expect(res.status).toBe(401);
  });

  it('an unverified email token is refused', async () => {
    fakeResult = {
      subject: googleSubject(),
      email: googleEmail(),
      emailVerified: false,
    };
    const res = await signIn('unverified-token');
    expect(res.status).toBe(401);
  });

  it('first-time Google sign-in creates an account carrying the verified email', async () => {
    const email = googleEmail();
    fakeResult = {
      subject: googleSubject(),
      email,
      emailVerified: true,
    };
    const res = await signIn();
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
  });

  it('repeated Google sign-in with the same subject returns the same userId', async () => {
    fakeResult = {
      subject: googleSubject(),
      email: googleEmail(),
      emailVerified: true,
    };
    const first = await signIn();
    const second = await signIn();
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((first.body.user as { id: string }).id).toBe(
      (second.body.user as { id: string }).id,
    );
  });

  it('sign-in failures do not reveal whether an account exists', async () => {
    fakeResult = null;
    const beforeAccount = await signIn('bad-token-1');

    fakeResult = {
      subject: googleSubject(),
      email: googleEmail(),
      emailVerified: true,
    };
    await signIn('create-account');

    fakeResult = null;
    const afterAccount = await signIn('bad-token-2');

    expect(beforeAccount.status).toBe(afterAccount.status);
    expect(beforeAccount.body.code).toBe(afterAccount.body.code);
  });

  it('the verifier is the injected port — any token value is accepted when the fake returns claims', async () => {
    fakeResult = {
      subject: `isolated-sub-${run}`,
      email: `isolated-${run}@example.com`,
      emailVerified: true,
    };
    const res = await signIn('this-would-fail-against-a-real-endpoint');
    expect(res.status).toBe(200);
  });

  it('two different Google subjects create two separate accounts', async () => {
    fakeResult = {
      subject: `sub-a-${run}`,
      email: `user-a-${run}@gmail.com`,
      emailVerified: true,
    };
    const resA = await request(app.getHttpServer())
      .post('/auth/google/sign-in')
      .set('X-Forwarded-For', `3.3.${run}.2`)
      .send({ idToken: 'token-a' });

    fakeResult = {
      subject: `sub-b-${run}`,
      email: `user-b-${run}@gmail.com`,
      emailVerified: true,
    };
    const resB = await request(app.getHttpServer())
      .post('/auth/google/sign-in')
      .set('X-Forwarded-For', `3.3.${run}.3`)
      .send({ idToken: 'token-b' });

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect((resA.body.user as { id: string }).id).not.toBe(
      (resB.body.user as { id: string }).id,
    );
  });
});
