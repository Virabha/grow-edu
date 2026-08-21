import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createUser, createBatch, enrol } from './support/factories';
import { SMS_SENDER, SmsSender } from '../src/auth/ports/sms-sender';
import {
  GOOGLE_TOKEN_VERIFIER,
  GoogleTokenClaims,
  GoogleTokenVerifier,
} from '../src/auth/ports/google-token-verifier';
import { batchEnrollments } from '../src/database/schema';

describe('identity linking (ticket 33)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let capturedSms: { phone: string; message: string }[] = [];
  let fakeGoogleResult: GoogleTokenClaims | null = null;
  let run = 0;

  const fakeSender: SmsSender = {
    async send(phone: string, message: string): Promise<void> {
      capturedSms.push({ phone, message });
    },
  };

  const fakeVerifier: GoogleTokenVerifier = {
    async verify(_idToken: string): Promise<GoogleTokenClaims | null> {
      return fakeGoogleResult;
    },
  };

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    clock.set('2026-12-01T10:00:00.000Z');
    app = await createTestApp(database, clock, [
      { token: SMS_SENDER, value: fakeSender },
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
    capturedSms = [];
    fakeGoogleResult = null;
    clock.set('2026-12-01T10:00:00.000Z');
  });

  function uniquePhone(): string {
    return `+9198765${run.toString().padStart(5, '0')}`;
  }

  function anotherPhone(): string {
    return `+9199999${run.toString().padStart(5, '0')}`;
  }

  function googleSubject(): string {
    return `gsub-link-${run}`;
  }

  function googleEmail(): string {
    return `glink-${run}@gmail.com`;
  }

  function lastCodeFor(ph: string): string {
    const msgs = capturedSms.filter((s) => s.phone === ph);
    const last = msgs[msgs.length - 1];
    if (!last) throw new Error(`No SMS captured for ${ph}`);
    const match = /code is (\d+)/.exec(last.message);
    if (!match) throw new Error(`No code found in: ${last.message}`);
    return match[1];
  }

  async function phoneSignIn(
    ph: string,
  ): Promise<{ userId: string; token: string }> {
    await request(app.getHttpServer())
      .post('/auth/phone/request-code')
      .set('X-Forwarded-For', `2.${run}.0.1`)
      .send({ phone: ph });
    const code = lastCodeFor(ph);
    const res = await request(app.getHttpServer())
      .post('/auth/phone/verify')
      .set('X-Forwarded-For', `2.${run}.0.1`)
      .send({ phone: ph, code });
    expect(res.status).toBe(200);
    return {
      userId: (res.body.user as { id: string }).id,
      token: res.body.access_token as string,
    };
  }

  async function googleSignIn(
    subject: string,
    email: string,
  ): Promise<{ userId: string; token: string }> {
    fakeGoogleResult = { subject, email, emailVerified: true };
    const res = await request(app.getHttpServer())
      .post('/auth/google/sign-in')
      .send({ idToken: 'token' });
    expect(res.status).toBe(200);
    return {
      userId: (res.body.user as { id: string }).id,
      token: res.body.access_token as string,
    };
  }

  it('linking Google to a phone account means Google sign-in resolves to that account', async () => {
    const ph = uniquePhone();
    const { userId: phoneUserId, token: phoneToken } = await phoneSignIn(ph);

    fakeGoogleResult = {
      subject: googleSubject(),
      email: googleEmail(),
      emailVerified: true,
    };
    const linkRes = await request(app.getHttpServer())
      .post('/auth/identities/link/google')
      .set('Authorization', `Bearer ${phoneToken}`)
      .send({ idToken: 'valid-token' });
    expect(linkRes.status).toBe(204);

    const { userId: googleUserId } = await googleSignIn(
      googleSubject(),
      googleEmail(),
    );
    expect(googleUserId).toBe(phoneUserId);
  });

  it('a Google identity already claimed by account A cannot be linked to account B', async () => {
    const sub = googleSubject();
    const email = googleEmail();

    await googleSignIn(sub, email);

    const phB = anotherPhone();
    const { token: tokenB } = await phoneSignIn(phB);

    fakeGoogleResult = { subject: sub, email: `other-${email}`, emailVerified: true };
    const linkRes = await request(app.getHttpServer())
      .post('/auth/identities/link/google')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ idToken: 'token' });

    expect(linkRes.status).toBe(409);
  });

  it('linking phone requires a valid OTP proving control of that number', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const [header] = authHeader(app, admin);

    const linkWithoutCode = await request(app.getHttpServer())
      .post('/auth/identities/link/phone')
      .set('Authorization', header)
      .send({ phone: uniquePhone(), code: '000000' });

    expect(linkWithoutCode.status).toBe(401);
  });

  it('linking Google requires a verified Google token proving control of that account', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const [header] = authHeader(app, admin);

    fakeGoogleResult = null;
    const linkWithBadToken = await request(app.getHttpServer())
      .post('/auth/identities/link/google')
      .set('Authorization', header)
      .send({ idToken: 'bad-token' });

    expect(linkWithBadToken.status).toBe(401);
  });

  it('a phone-only account cannot unlink its only phone', async () => {
    const ph = uniquePhone();
    const { token } = await phoneSignIn(ph);

    const res = await request(app.getHttpServer())
      .delete('/auth/identities/PHONE')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(422);
  });

  it('unlinking one method succeeds when the account has at least two methods', async () => {
    const ph = uniquePhone();
    const { token: phoneToken } = await phoneSignIn(ph);

    fakeGoogleResult = {
      subject: googleSubject(),
      email: googleEmail(),
      emailVerified: true,
    };
    await request(app.getHttpServer())
      .post('/auth/identities/link/google')
      .set('Authorization', `Bearer ${phoneToken}`)
      .send({ idToken: 'token' });

    const unlinkRes = await request(app.getHttpServer())
      .delete('/auth/identities/GOOGLE')
      .set('Authorization', `Bearer ${phoneToken}`);

    expect(unlinkRes.status).toBe(204);
  });

  it('a linked account keeps one progress history — enrollment created under phone userId persists after Google sign-in', async () => {
    const ph = uniquePhone();
    const { userId: phoneUserId, token: phoneToken } = await phoneSignIn(ph);

    const instructor = await createUser(database, 'INSTRUCTOR');
    const batchId = await createBatch(database, instructor.userId);
    await enrol(database, batchId, phoneUserId);

    const enrollmentsBefore = await database.db
      .select({ userId: batchEnrollments.userId })
      .from(batchEnrollments)
      .where(eq(batchEnrollments.userId, phoneUserId));
    expect(enrollmentsBefore).toHaveLength(1);

    fakeGoogleResult = {
      subject: googleSubject(),
      email: googleEmail(),
      emailVerified: true,
    };
    await request(app.getHttpServer())
      .post('/auth/identities/link/google')
      .set('Authorization', `Bearer ${phoneToken}`)
      .send({ idToken: 'token' });

    const { userId: googleUserId } = await googleSignIn(
      googleSubject(),
      googleEmail(),
    );

    expect(googleUserId).toBe(phoneUserId);

    const enrollmentsAfter = await database.db
      .select({ userId: batchEnrollments.userId })
      .from(batchEnrollments)
      .where(eq(batchEnrollments.userId, googleUserId));
    expect(enrollmentsAfter).toHaveLength(1);
  });

  it('GET /auth/identities returns the list of linked methods', async () => {
    const ph = uniquePhone();
    const { token } = await phoneSignIn(ph);

    const res = await request(app.getHttpServer())
      .get('/auth/identities')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const providers = (res.body as { provider: string }[]).map(
      (i) => i.provider,
    );
    expect(providers).toContain('PHONE');
  });

  it('auto-links a Google identity to an existing account that shares the same email', async () => {
    const email = googleEmail();

    const { userId: googleUserId1 } = await googleSignIn(
      `sub-first-${run}`,
      email,
    );

    const { userId: googleUserId2 } = await googleSignIn(
      `sub-first-${run}`,
      email,
    );

    expect(googleUserId1).toBe(googleUserId2);
  });

  describe('unlinking — four account shapes', () => {
    async function registerAndSignIn(
      email: string,
      password: string,
    ): Promise<{ userId: string; token: string }> {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password, firstName: 'Test' });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', `4.${run}.0.1`)
        .set('User-Agent', `ua-${run}`)
        .send({ email, password });
      expect(loginRes.status).toBe(200);
      return {
        userId: (loginRes.body.user as { id: string }).id,
        token: loginRes.body.access_token as string,
      };
    }

    function unlinkProvider(provider: string, token: string) {
      return request(app.getHttpServer())
        .delete(`/auth/identities/${provider}`)
        .set('Authorization', `Bearer ${token}`);
    }

    it('password-only: cannot unlink when it would leave no sign-in method', async () => {
      const email = `pw-only-${run}@example.test`;
      const { token } = await registerAndSignIn(email, 'P@ssword123!');

      const res = await unlinkProvider('PHONE', token);
      expect(res.status).toBe(422);
    });

    it('password+Google: unlink Google succeeds because PASSWORD row remains', async () => {
      const email = `pw-google-${run}@example.test`;
      const { token } = await registerAndSignIn(email, 'P@ssword123!');

      fakeGoogleResult = {
        subject: `pw-google-sub-${run}`,
        email: `pw-google-linked-${run}@gmail.com`,
        emailVerified: true,
      };
      const linkRes = await request(app.getHttpServer())
        .post('/auth/identities/link/google')
        .set('Authorization', `Bearer ${token}`)
        .send({ idToken: 'token' });
      expect(linkRes.status).toBe(204);

      const unlinkRes = await unlinkProvider('GOOGLE', token);
      expect(unlinkRes.status).toBe(204);
    });

    it('password+Google: after unlinking Google, a second unlink attempt is refused (only PASSWORD left)', async () => {
      const email = `pw-google-last-${run}@example.test`;
      const { token } = await registerAndSignIn(email, 'P@ssword123!');

      fakeGoogleResult = {
        subject: `pw-google-last-sub-${run}`,
        email: `pw-google-last-${run}@gmail.com`,
        emailVerified: true,
      };
      await request(app.getHttpServer())
        .post('/auth/identities/link/google')
        .set('Authorization', `Bearer ${token}`)
        .send({ idToken: 'token' });

      await unlinkProvider('GOOGLE', token);

      const secondUnlink = await unlinkProvider('PHONE', token);
      expect(secondUnlink.status).toBe(422);
    });

    it('phone+Google: can unlink either method while the other remains', async () => {
      const ph = uniquePhone();
      const { token: phoneToken } = await phoneSignIn(ph);

      fakeGoogleResult = {
        subject: `phone-google-sub-${run}`,
        email: `phone-google-${run}@gmail.com`,
        emailVerified: true,
      };
      await request(app.getHttpServer())
        .post('/auth/identities/link/google')
        .set('Authorization', `Bearer ${phoneToken}`)
        .send({ idToken: 'token' });

      const unlinkGoogle = await unlinkProvider('GOOGLE', phoneToken);
      expect(unlinkGoogle.status).toBe(204);
    });

    it('phone+Google: second unlink is refused when only one method remains', async () => {
      const ph = anotherPhone();
      const { token: phoneToken } = await phoneSignIn(ph);

      fakeGoogleResult = {
        subject: `pg2-sub-${run}`,
        email: `pg2-${run}@gmail.com`,
        emailVerified: true,
      };
      await request(app.getHttpServer())
        .post('/auth/identities/link/google')
        .set('Authorization', `Bearer ${phoneToken}`)
        .send({ idToken: 'token' });

      await unlinkProvider('PHONE', phoneToken);

      const secondUnlink = await unlinkProvider('GOOGLE', phoneToken);
      expect(secondUnlink.status).toBe(422);
    });

    it('phone-only: unlink is refused because it would remove the only sign-in method', async () => {
      const ph = `+919${run}888888`;
      const { token } = await phoneSignIn(ph);

      const res = await unlinkProvider('PHONE', token);
      expect(res.status).toBe(422);
    });
  });
});
