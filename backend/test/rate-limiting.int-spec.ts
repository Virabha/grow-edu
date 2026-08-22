import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, TestActor } from './support/test-app';
import { createSignInUser } from './support/factories';

const PASSWORD = 'correct-horse-battery-staple';

describe('rate limiting', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let run = 0;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    run += 1;
    await truncateAll(database);
  });

  describe('join-link throttle', () => {
    function redeemAnonymously(token: string, ip: string) {
      return request(app.getHttpServer())
        .post('/corporate/join/claim')
        .set('X-Forwarded-For', ip)
        .send({
          token,
          email: `student-${token.slice(0, 8)}@example.test`,
          password: PASSWORD,
        });
    }

    it('lets a whole cohort join from one campus address', async () => {
      const campusIp = `10.${run}.90.1`;

      const outcomes = [];
      for (let i = 0; i < 25; i += 1) {
        const distinctToken = `${'t'.repeat(30)}${run}-cohort-${i}`;
        outcomes.push((await redeemAnonymously(distinctToken, campusIp)).status);
      }

      expect(outcomes).not.toContain(429);
    });

    it('throttles one token being hammered', async () => {
      const campusIp = `10.${run}.91.1`;
      const oneToken = `${'h'.repeat(30)}${run}-hammered`;

      const outcomes = [];
      for (let i = 0; i < 35; i += 1) {
        outcomes.push((await redeemAnonymously(oneToken, campusIp)).status);
      }

      expect(outcomes).toContain(429);
      expect(outcomes.filter((s) => s !== 429).length).toBeLessThanOrEqual(30);
    });
  });

  describe('sign-in throttle', () => {
    let student: TestActor;

    beforeEach(async () => {
      student = await createSignInUser(database, 'LEARNER', PASSWORD);
    });

    function signIn(ip: string, password = PASSWORD) {
      return request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Forwarded-For', ip)
        .set('User-Agent', `test-agent-${run}`)
        .send({ email: student.email, password });
    }

    it('allows up to the configured limit of sign-ins from one source', async () => {
      const ip = `10.${run}.1.1`;
      for (let i = 0; i < 5; i++) {
        const res = await signIn(ip);
        expect(res.status).toBe(200);
      }
    });

    it('returns 429 on the attempt past the limit', async () => {
      const ip = `10.${run}.2.1`;
      for (let i = 0; i < 5; i++) {
        await signIn(ip);
      }
      const res = await signIn(ip);
      expect(res.status).toBe(429);
    });

    it('throttled response carries RATE_LIMIT_EXCEEDED code', async () => {
      const ip = `10.${run}.3.1`;
      for (let i = 0; i < 5; i++) {
        await signIn(ip);
      }
      const res = await signIn(ip);
      expect(res.status).toBe(429);
      expect(res.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(typeof res.body.message).toBe('string');
    });

    it('throttled response carries a Retry-After header', async () => {
      const ip = `10.${run}.4.1`;
      for (let i = 0; i < 5; i++) {
        await signIn(ip);
      }
      const res = await signIn(ip);
      expect(res.status).toBe(429);
      expect(res.headers['retry-after']).toBeDefined();
    });

    it('wrong password before throttle limit returns 401 not 429', async () => {
      const ip = `10.${run}.5.1`;
      const res = await signIn(ip, 'wrong-password');
      expect(res.status).toBe(401);
      expect(res.body.code).toBeUndefined();
    });

    it('throttle refusal is distinguishable from wrong password', async () => {
      const ip = `10.${run}.6.1`;
      for (let i = 0; i < 5; i++) {
        await signIn(ip, 'wrong-password');
      }
      const throttled = await signIn(ip, 'wrong-password');
      expect(throttled.status).toBe(429);
      expect(throttled.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('forgot-password throttle', () => {
    function resetRequest(ip: string, email: string) {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .set('X-Forwarded-For', ip)
        .send({ email });
    }

    it('throttles too many requests from one source and returns 429 with code', async () => {
      const ip = `10.${run}.10.1`;
      const email = `reset-src-${run}@example.test`;
      for (let i = 0; i < 5; i++) {
        const res = await resetRequest(ip, email);
        expect(res.status).toBe(200);
      }
      const throttled = await resetRequest(ip, email);
      expect(throttled.status).toBe(429);
      expect(throttled.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('throttles per account when the same email is used from different sources', async () => {
      const email = `reset-acct-${run}@example.test`;
      for (let i = 1; i <= 5; i++) {
        const res = await resetRequest(`10.${run}.11.${i}`, email);
        expect(res.status).toBe(200);
      }
      const throttled = await resetRequest(`10.${run}.11.6`, email);
      expect(throttled.status).toBe(429);
      expect(throttled.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('throttled response carries a Retry-After header', async () => {
      const ip = `10.${run}.12.1`;
      const email = `reset-hdr-${run}@example.test`;
      for (let i = 0; i < 5; i++) {
        await resetRequest(ip, email);
      }
      const throttled = await resetRequest(ip, email);
      expect(throttled.status).toBe(429);
      expect(throttled.headers['retry-after']).toBeDefined();
    });
  });
});
