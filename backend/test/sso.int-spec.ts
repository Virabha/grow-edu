import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import * as request from 'supertest';

import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createUser, createCompany, createCorporateAdmin, createBatch, enrol } from './support/factories';
import { users } from '../src/database/schema';
import {
  SSO_PROVIDER,
  SsoTokenClaims,
  SsoProvider,
} from '../src/enterprise/sso/sso-provider';

describe('single sign-on (tickets 24, 25, 26)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;

  let claimsToReturn: SsoTokenClaims | null = null;
  let run = 0;

  const fakeProvider: SsoProvider = {
    async verify(_companyId: string, _token: string): Promise<SsoTokenClaims | null> {
      return claimsToReturn;
    },
  };

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    app = await createTestApp(database, clock, [
      { token: SSO_PROVIDER, value: fakeProvider },
    ]);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    run += 1;
    clock.reset();
    await truncateAll(database);
    claimsToReturn = null;
  });

  function ssoEmail(): string {
    return `sso-user-${run}@institution.test`;
  }

  function ssoSubject(): string {
    return `inst-sub-${run}`;
  }

  async function setupSso(companyId: string, admin: TestActor) {
    return request(app.getHttpServer())
      .put(`/enterprise/sso/${companyId}`)
      .set(...authHeader(app, admin))
      .send({
        providerType: 'OIDC',
        issuerUrl: 'https://idp.institution.test',
        clientId: 'client-abc',
        clientSecret: 'secret-xyz',
      });
  }

  function signIn(companyId: string, token = 'any-token') {
    return request(app.getHttpServer())
      .post(`/enterprise/sso/${companyId}/sign-in`)
      .send({ token });
  }

  it('ticket 24: a platform admin can configure SSO per corporate', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const companyId = await createCompany(database);

    const res = await setupSso(companyId, admin);
    expect(res.status).toBe(200);
    expect(res.body.configured).toBe(true);
  });

  it('ticket 24: SSO config secrets are never returned in the read path', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const companyId = await createCompany(database);
    await setupSso(companyId, admin);

    const res = await request(app.getHttpServer())
      .get(`/enterprise/sso/${companyId}`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(res.body.clientSecret).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('secret-xyz');
    expect(res.body.clientId).toBe('client-abc');
  });

  it('ticket 24: two corporates can use different providers simultaneously', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const companyA = await createCompany(database);
    const companyB = await createCompany(database);

    await request(app.getHttpServer())
      .put(`/enterprise/sso/${companyA}`)
      .set(...authHeader(app, admin))
      .send({
        providerType: 'OIDC',
        issuerUrl: 'https://a.institution.test',
        clientId: 'client-a',
        clientSecret: 'secret-a',
      });

    await request(app.getHttpServer())
      .put(`/enterprise/sso/${companyB}`)
      .set(...authHeader(app, admin))
      .send({
        providerType: 'SAML',
        issuerUrl: 'https://b.institution.test',
        clientId: 'client-b',
        clientSecret: 'secret-b',
      });

    const resA = await request(app.getHttpServer())
      .get(`/enterprise/sso/${companyA}`)
      .set(...authHeader(app, admin))
      .expect(200);
    const resB = await request(app.getHttpServer())
      .get(`/enterprise/sso/${companyB}`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(resA.body.providerType).toBe('OIDC');
    expect(resB.body.providerType).toBe('SAML');
  });

  it('ticket 24: a misconfigured provider (no config stored) fails closed', async () => {
    const companyId = await createCompany(database);
    claimsToReturn = { subject: ssoSubject(), email: ssoEmail(), emailVerified: true };

    const res = await signIn(companyId);
    expect(res.status).toBe(401);
  });

  it('ticket 24: a corporate admin cannot configure SSO for another corporate', async () => {
    const platformAdmin = await createUser(database, 'PLATFORM_ADMIN');
    const companyA = await createCompany(database);
    const companyB = await createCompany(database);
    const corpAdmin = await createCorporateAdmin(database, companyA);

    await setupSso(companyB, platformAdmin);

    const res = await request(app.getHttpServer())
      .put(`/enterprise/sso/${companyB}`)
      .set(...authHeader(app, corpAdmin))
      .send({
        providerType: 'OIDC',
        issuerUrl: 'https://evil.test',
        clientId: 'evil-client',
        clientSecret: 'evil-secret',
      });

    expect(res.status).toBe(403);
  });

  it('ticket 24: a corporate admin can read their own SSO config', async () => {
    const platformAdmin = await createUser(database, 'PLATFORM_ADMIN');
    const companyId = await createCompany(database);
    const corpAdmin = await createCorporateAdmin(database, companyId);
    await setupSso(companyId, platformAdmin);

    const res = await request(app.getHttpServer())
      .get(`/enterprise/sso/${companyId}`)
      .set(...authHeader(app, corpAdmin))
      .expect(200);

    expect(res.body.clientId).toBe('client-abc');
    expect(res.body.clientSecret).toBeUndefined();
  });

  it('ticket 24: a corporate admin cannot read another corporate SSO config', async () => {
    const platformAdmin = await createUser(database, 'PLATFORM_ADMIN');
    const companyA = await createCompany(database);
    const companyB = await createCompany(database);
    const corpAdminA = await createCorporateAdmin(database, companyA);
    await setupSso(companyB, platformAdmin);

    const res = await request(app.getHttpServer())
      .get(`/enterprise/sso/${companyB}`)
      .set(...authHeader(app, corpAdminA));

    expect(res.status).toBe(404);
  });

  it('ticket 25: first SSO sign-in creates a new learner account', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const companyId = await createCompany(database);
    await setupSso(companyId, admin);

    claimsToReturn = {
      subject: ssoSubject(),
      email: ssoEmail(),
      emailVerified: true,
    };

    const res = await signIn(companyId);
    expect(res.status).toBe(200);
    expect(typeof res.body.access_token).toBe('string');
    expect(res.body.user.email).toBe(ssoEmail());
    expect(res.body.user.role).toBe('LEARNER');
  });

  it('ticket 25: a returning student with a verified email links rather than duplicating', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const companyId = await createCompany(database);
    await setupSso(companyId, admin);

    const userId = randomUUID();
    const email = `verified-${run}@example.test`;
    await database.db.insert(users).values({
      userId,
      email,
      password: 'not-a-real-hash',
      role: 'LEARNER',
      emailVerified: true,
    });

    claimsToReturn = {
      subject: ssoSubject(),
      email,
      emailVerified: true,
    };

    const res = await signIn(companyId);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(userId);
  });

  it('ticket 25: an unverified email in DB does not silently link (sign-in is rejected)', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const companyId = await createCompany(database);
    await setupSso(companyId, admin);

    const userId = randomUUID();
    const email = `unverified-${run}@example.test`;
    await database.db.insert(users).values({
      userId,
      email,
      password: 'not-a-real-hash',
      role: 'LEARNER',
      emailVerified: false,
    });

    claimsToReturn = {
      subject: ssoSubject(),
      email,
      emailVerified: true,
    };

    const res = await signIn(companyId);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('ticket 25: an unverified provider claim is rejected', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const companyId = await createCompany(database);
    await setupSso(companyId, admin);

    claimsToReturn = {
      subject: ssoSubject(),
      email: ssoEmail(),
      emailVerified: false,
    };

    const res = await signIn(companyId);
    expect(res.status).toBe(401);
  });

  it('ticket 25: signing in twice with the same subject returns the same userId', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const companyId = await createCompany(database);
    await setupSso(companyId, admin);

    claimsToReturn = {
      subject: ssoSubject(),
      email: ssoEmail(),
      emailVerified: true,
    };

    const first = await signIn(companyId);
    const second = await signIn(companyId);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.user.id).toBe(second.body.user.id);
  });

  it('ticket 26: a provider asserting an administrator role does not grant one (adversarial)', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const companyId = await createCompany(database);
    await setupSso(companyId, admin);

    claimsToReturn = {
      subject: `adversarial-sub-${run}`,
      email: `adversarial-${run}@institution.test`,
      emailVerified: true,
    };

    const signInRes = await signIn(companyId);
    expect(signInRes.status).toBe(200);

    const accessToken = signInRes.body.access_token as string;

    const adminOnlyRes = await request(app.getHttpServer())
      .post('/enterprise/credentials')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ companyId, label: 'test' });

    expect(adminOnlyRes.status).toBe(403);
  });

  it('ticket 26: new SSO user receives role from DB (LEARNER), not from any provider claim', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const companyId = await createCompany(database);
    await setupSso(companyId, admin);

    claimsToReturn = {
      subject: ssoSubject(),
      email: ssoEmail(),
      emailVerified: true,
    };

    const res = await signIn(companyId);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('LEARNER');
  });

  it('ticket 26: SSO for an existing admin preserves their DB role', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const companyId = await createCompany(database);
    await setupSso(companyId, admin);

    const userId = randomUUID();
    const email = `platform-admin-${run}@example.test`;
    await database.db.insert(users).values({
      userId,
      email,
      password: 'not-a-real-hash',
      role: 'PLATFORM_ADMIN',
      emailVerified: true,
    });

    claimsToReturn = {
      subject: `admin-sub-${run}`,
      email,
      emailVerified: true,
    };

    const res = await signIn(companyId);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(userId);
    expect(res.body.user.role).toBe('PLATFORM_ADMIN');
  });

  it('ticket 26: a provider claim cannot elevate a learner to admin', async () => {
    const admin = await createUser(database, 'PLATFORM_ADMIN');
    const companyId = await createCompany(database);
    await setupSso(companyId, admin);

    const userId = randomUUID();
    const email = `learner-${run}@example.test`;
    await database.db.insert(users).values({
      userId,
      email,
      password: 'not-a-real-hash',
      role: 'LEARNER',
      emailVerified: true,
    });

    claimsToReturn = {
      subject: `learner-sub-${run}`,
      email,
      emailVerified: true,
    };

    const signInRes = await signIn(companyId);
    expect(signInRes.status).toBe(200);
    expect(signInRes.body.user.role).toBe('LEARNER');

    const accessToken = signInRes.body.access_token as string;
    await database.db
      .update(users)
      .set({ role: 'LEARNER' })
      .where(eq(users.userId, userId));

    const privilegedRes = await request(app.getHttpServer())
      .post('/enterprise/credentials')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ companyId, label: 'attempt' });

    expect(privilegedRes.status).toBe(403);
  });

  describe('ticket 26: authentication is delegated, authorisation is not', () => {
    async function configuredCompany() {
      const admin = await createUser(database, 'PLATFORM_ADMIN');
      const companyId = await createCompany(database);
      await setupSso(companyId, admin);
      return { admin, companyId };
    }

    it('ignores a role asserted by the identity provider', async () => {
      const { companyId } = await configuredCompany();

      claimsToReturn = {
        subject: ssoSubject(),
        email: ssoEmail(),
        emailVerified: true,
        role: 'PLATFORM_ADMIN',
        roles: ['PLATFORM_ADMIN', 'INSTRUCTOR'],
        isAdmin: true,
      };

      const res = await signIn(companyId);
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('LEARNER');

      const [row] = await database.db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.email, ssoEmail()));
      expect(row.role).toBe('LEARNER');

      await request(app.getHttpServer())
        .post('/enterprise/credentials')
        .set('Authorization', `Bearer ${res.body.access_token as string}`)
        .send({ companyId, label: 'attempt' })
        .expect(403);
    });

    it('does not let a provider claim add a batch enrolment', async () => {
      const { admin, companyId } = await configuredCompany();
      const batchId = await createBatch(database, admin.userId);

      claimsToReturn = {
        subject: ssoSubject(),
        email: ssoEmail(),
        emailVerified: true,
        enrolments: [batchId],
        batches: [batchId],
      };

      const res = await signIn(companyId);
      expect(res.status).toBe(200);

      await request(app.getHttpServer())
        .get(`/batches/${batchId}/content`)
        .set('Authorization', `Bearer ${res.body.access_token as string}`)
        .expect(404);
    });

    it('keeps a revoked enrolment revoked across a fresh sign-on', async () => {
      const { admin, companyId } = await configuredCompany();
      const batchId = await createBatch(database, admin.userId);
      const email = ssoEmail();

      claimsToReturn = { subject: ssoSubject(), email, emailVerified: true };
      const first = await signIn(companyId);
      expect(first.status).toBe(200);
      const userId = first.body.user.id as string;

      await enrol(database, batchId, userId, { status: 'REVOKED' as never });

      claimsToReturn = {
        subject: ssoSubject(),
        email,
        emailVerified: true,
        enrolments: [batchId],
      };
      const second = await signIn(companyId);
      expect(second.status).toBe(200);
      expect(second.body.user.id).toBe(userId);

      await request(app.getHttpServer())
        .get(`/batches/${batchId}/content`)
        .set('Authorization', `Bearer ${second.body.access_token as string}`)
        .expect(404);
    });

    it('grants access that comes from a real enrolment, not from a claim', async () => {
      const { admin, companyId } = await configuredCompany();
      const batchId = await createBatch(database, admin.userId);
      const email = ssoEmail();

      claimsToReturn = { subject: ssoSubject(), email, emailVerified: true };
      const first = await signIn(companyId);
      const userId = first.body.user.id as string;

      await enrol(database, batchId, userId);

      const second = await signIn(companyId);
      await request(app.getHttpServer())
        .get(`/batches/${batchId}/content`)
        .set('Authorization', `Bearer ${second.body.access_token as string}`)
        .expect(200);
    });

    it('requires the administrative path for a role change, not a sign-on', async () => {
      const { companyId } = await configuredCompany();
      const email = ssoEmail();

      claimsToReturn = { subject: ssoSubject(), email, emailVerified: true };
      const first = await signIn(companyId);
      const userId = first.body.user.id as string;

      await database.db
        .update(users)
        .set({ role: 'INSTRUCTOR' })
        .where(eq(users.userId, userId));

      claimsToReturn = {
        subject: ssoSubject(),
        email,
        emailVerified: true,
        role: 'PLATFORM_ADMIN',
      };
      const second = await signIn(companyId);

      expect(second.body.user.role).toBe('INSTRUCTOR');
      await request(app.getHttpServer())
        .post('/enterprise/credentials')
        .set('Authorization', `Bearer ${second.body.access_token as string}`)
        .send({ companyId, label: 'attempt' })
        .expect(403);
    });

    it('rejects claims whose required fields are the wrong shape', async () => {
      const { companyId } = await configuredCompany();

      claimsToReturn = {
        subject: ssoSubject(),
        email: ssoEmail(),
        emailVerified: 'yes',
      };

      const res = await signIn(companyId);
      expect(res.status).toBe(401);
    });
  });
});
