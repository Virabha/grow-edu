import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp } from './support/test-app';
import { TestClock } from './support/test-clock';
import { SMS_SENDER, SmsSender } from '../src/auth/ports/sms-sender';

describe('phone sign-in (ticket 31)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let capturedSms: { phone: string; message: string }[] = [];
  let run = 0;

  const fakeSender: SmsSender = {
    async send(phone: string, message: string): Promise<void> {
      capturedSms.push({ phone, message });
    },
  };

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    clock.set('2026-12-01T10:00:00.000Z');
    app = await createTestApp(database, clock, [
      { token: SMS_SENDER, value: fakeSender },
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
    clock.set('2026-12-01T10:00:00.000Z');
  });

  function uniquePhone(): string {
    return `+9198765${run.toString().padStart(5, '0')}`;
  }

  function requestCode(ph: string, ip = `1.2.${run}.4`) {
    return request(app.getHttpServer())
      .post('/auth/phone/request-code')
      .set('X-Forwarded-For', ip)
      .send({ phone: ph });
  }

  function verifyCode(ph: string, code: string, ip = `1.2.${run}.4`) {
    return request(app.getHttpServer())
      .post('/auth/phone/verify')
      .set('X-Forwarded-For', ip)
      .send({ phone: ph, code });
  }

  function lastCodeFor(ph: string): string {
    const msgs = capturedSms.filter((s) => s.phone === ph);
    const last = msgs[msgs.length - 1];
    if (!last) throw new Error(`No SMS captured for ${ph}`);
    const match = /code is (\d+)/.exec(last.message);
    if (!match) throw new Error(`No code found in: ${last.message}`);
    return match[1];
  }

  it('request-code returns 204 and does not expose the code in the response', async () => {
    const res = await requestCode(uniquePhone());
    expect(res.status).toBe(204);
    expect(res.body).not.toHaveProperty('code');
    expect(res.text).toBe('');
  });

  it('a correct code signs the user in and returns an access token', async () => {
    const ph = uniquePhone();
    await requestCode(ph);
    const code = lastCodeFor(ph);
    const res = await verifyCode(ph, code);
    expect(res.status).toBe(200);
    expect(typeof res.body.access_token).toBe('string');
    expect(res.body.user).toBeDefined();
  });

  it('a wrong code is refused with PHONE_SIGN_IN_INVALID', async () => {
    const ph = uniquePhone();
    await requestCode(ph);
    const res = await verifyCode(ph, '000000');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('PHONE_SIGN_IN_INVALID');
  });

  it('wrong code and unknown-phone produce the same error shape', async () => {
    const ph = uniquePhone();
    await requestCode(ph);
    const wrongCodeRes = await verifyCode(ph, '000000');
    const unknownPhoneRes = await verifyCode('+910000000000', '000000');
    expect(wrongCodeRes.status).toBe(unknownPhoneRes.status);
    expect(wrongCodeRes.body.code).toBe(unknownPhoneRes.body.code);
  });

  it('an expired code is refused', async () => {
    const ph = uniquePhone();
    await requestCode(ph);
    const code = lastCodeFor(ph);
    clock.advance(6 * 60 * 1000);
    const res = await verifyCode(ph, code);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('PHONE_SIGN_IN_INVALID');
  });

  it('a code cannot be reused after a successful sign-in', async () => {
    const ph = uniquePhone();
    await requestCode(ph);
    const code = lastCodeFor(ph);

    const first = await verifyCode(ph, code);
    expect(first.status).toBe(200);

    const second = await verifyCode(ph, code);
    expect(second.status).toBe(401);
  });

  it('two sign-ins with the same phone return the same userId', async () => {
    const ph = uniquePhone();

    await requestCode(ph);
    const code1 = lastCodeFor(ph);
    const res1 = await verifyCode(ph, code1);
    expect(res1.status).toBe(200);

    capturedSms = [];
    await requestCode(ph);
    const code2 = lastCodeFor(ph);
    const res2 = await verifyCode(ph, code2);
    expect(res2.status).toBe(200);

    expect((res1.body.user as { id: string }).id).toBe(
      (res2.body.user as { id: string }).id,
    );
  });

  describe('rate limiting', () => {
    it('allows up to the configured limit for one phone number', async () => {
      const ph = uniquePhone();
      const results: number[] = [];
      for (let i = 0; i < 3; i++) {
        const res = await requestCode(ph, `5.5.${run}.${i + 1}`);
        results.push(res.status);
      }
      expect(results.every((s) => s === 204)).toBe(true);
    });

    it('throttles per phone number — 4th request to same phone is rejected', async () => {
      const ph = uniquePhone();
      for (let i = 0; i < 3; i++) {
        await requestCode(ph, `6.6.${run}.${i + 1}`);
      }
      const throttled = await requestCode(ph, `6.6.${run}.99`);
      expect(throttled.status).toBe(429);
      expect(throttled.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('throttles per IP address — 4th request from same IP is rejected', async () => {
      const ip = `7.7.${run}.1`;
      const results: number[] = [];
      for (let i = 0; i < 4; i++) {
        const uniquePhoneForIp = `+9100000${run}${i}`;
        const res = await requestCode(uniquePhoneForIp, ip);
        results.push(res.status);
      }
      expect(results).toContain(429);
    });

    it('throttled response carries a Retry-After header', async () => {
      const ph = uniquePhone();
      for (let i = 0; i < 3; i++) {
        await requestCode(ph, `8.8.${run}.1`);
      }
      const throttled = await requestCode(ph, `8.8.${run}.1`);
      expect(throttled.status).toBe(429);
      expect(throttled.headers['retry-after']).toBeDefined();
    });
  });
});
