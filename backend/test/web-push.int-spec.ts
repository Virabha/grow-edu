import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createECDH, randomBytes } from 'node:crypto';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { DATABASE_CONNECTION } from '../src/database/database.module';
import { CLOCK } from '../src/common/clock';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import {
  PUSH_SENDER,
  PushDelivery,
  PushSender,
} from '../src/notifications/push.service';
import {
  base64UrlDecode,
  base64UrlEncode,
  decryptPayload,
  encryptPayload,
  generateVapidKeys,
  vapidAuthorization,
} from '../src/notifications/web-push';
import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createBatch, createUser, enrol } from './support/factories';

class FakePushSender implements PushSender {
  readonly sent: PushDelivery[] = [];
  status = 201;
  throwOnce = false;

  async send(delivery: PushDelivery): Promise<{ status: number }> {
    this.sent.push(delivery);
    if (this.throwOnce) {
      this.throwOnce = false;
      throw new Error('push service unreachable');
    }
    return { status: this.status };
  }

  reset(): void {
    this.sent.length = 0;
    this.status = 201;
    this.throwOnce = false;
  }
}

function browserKeys() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = randomBytes(16);
  return {
    privateKey: ecdh.getPrivateKey(),
    publicKey: ecdh.getPublicKey(),
    p256dh: base64UrlEncode(ecdh.getPublicKey()),
    auth: base64UrlEncode(auth),
    authSecret: auth,
  };
}

describe('web push channel', () => {
  let database: TestDatabase;
  let app: NestExpressApplication;
  let clock: TestClock;
  let sender: FakePushSender;
  let admin: TestActor;
  let student: TestActor;
  let batchId: string;
  let callerIp: string;
  let testNumber = 0;

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    sender = new FakePushSender();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE_CONNECTION)
      .useValue(database.db)
      .overrideProvider(CLOCK)
      .useValue(clock)
      .overrideProvider(JOB_QUEUE)
      .useValue(new InlineJobQueue(clock))
      .overrideProvider(PUSH_SENDER)
      .useValue(sender)
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', 1);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    await truncateAll(database);
    clock.set('2027-03-01T09:00:00.000Z');
    testNumber += 1;
    callerIp = `203.0.115.${testNumber}`;
    sender.reset();
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);
  });

  function subscribe(actor: TestActor, keys: ReturnType<typeof browserKeys>, endpoint: string) {
    return request(app.getHttpServer())
      .post('/push/subscribe')
      .set(...authHeader(app, actor))
      .send({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
  }

  async function subscriptions(actor: TestActor) {
    const { body } = await request(app.getHttpServer())
      .get('/push/subscriptions')
      .set(...authHeader(app, actor))
      .expect(200);
    return body as { endpoint: string }[];
  }

  function broadcastToBatch(title: string) {
    return request(app.getHttpServer())
      .post('/admin/broadcasts')
      .set(...authHeader(app, admin))
      .set('X-Forwarded-For', callerIp)
      .send({ audienceType: 'BATCH', audienceId: batchId, title, body: 'Body text.' });
  }

  async function inbox(actor: TestActor) {
    const { body } = await request(app.getHttpServer())
      .get('/notifications')
      .set(...authHeader(app, actor))
      .expect(200);
    return (body.data ?? body) as { title: string }[];
  }

  describe('the encryption', () => {
    it('produces a payload the receiver can open', () => {
      const keys = browserKeys();

      const body = encryptPayload(
        JSON.stringify({ title: 'Hello', body: 'World' }),
        { p256dh: keys.p256dh, auth: keys.auth },
      );

      const opened = decryptPayload(
        body,
        keys.privateKey,
        keys.authSecret,
        keys.publicKey,
      );

      expect(JSON.parse(opened)).toEqual({ title: 'Hello', body: 'World' });
    });

    it('produces a different body each time for the same message', () => {
      const keys = browserKeys();
      const first = encryptPayload('same', {
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
      const second = encryptPayload('same', {
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      expect(first.equals(second)).toBe(false);
    });

    it('cannot be opened with the wrong key', () => {
      const keys = browserKeys();
      const impostor = browserKeys();
      const body = encryptPayload('secret', {
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      expect(() =>
        decryptPayload(
          body,
          impostor.privateKey,
          impostor.authSecret,
          impostor.publicKey,
        ),
      ).toThrow();
    });

    it('signs a VAPID header naming the push service', () => {
      const vapid = generateVapidKeys();

      const header = vapidAuthorization(
        'https://fcm.googleapis.com/fcm/send/abc',
        'mailto:owner@example.test',
        vapid.publicKey,
        vapid.privateKey,
        1900000000,
      );

      expect(header.startsWith('vapid t=')).toBe(true);
      expect(header).toContain(`k=${vapid.publicKey}`);

      const token = header.slice('vapid t='.length, header.indexOf(', k='));
      const [, payload, signature] = token.split('.');
      const claims = JSON.parse(base64UrlDecode(payload).toString('utf8'));

      expect(claims.aud).toBe('https://fcm.googleapis.com');
      expect(claims.sub).toBe('mailto:owner@example.test');
      expect(claims.exp).toBe(1900000000);
      expect(base64UrlDecode(signature)).toHaveLength(64);
    });
  });

  describe('subscribing', () => {
    it('registers a browser and lists it back', async () => {
      const keys = browserKeys();

      await subscribe(student, keys, 'https://push.example.test/one').expect(201);

      expect((await subscriptions(student)).map((s) => s.endpoint)).toEqual([
        'https://push.example.test/one',
      ]);
    });

    it('survives signing out and back in', async () => {
      const keys = browserKeys();
      await subscribe(student, keys, 'https://push.example.test/one').expect(201);

      const fresh = await request(app.getHttpServer())
        .get('/push/subscriptions')
        .set(...authHeader(app, student))
        .expect(200);

      expect(fresh.body).toHaveLength(1);
    });

    it('does not duplicate when the same browser registers twice', async () => {
      const keys = browserKeys();
      await subscribe(student, keys, 'https://push.example.test/one').expect(201);
      await subscribe(student, keys, 'https://push.example.test/one').expect(201);

      expect(await subscriptions(student)).toHaveLength(1);
    });

    it('stops pushing once the browser unsubscribes', async () => {
      const keys = browserKeys();
      await subscribe(student, keys, 'https://push.example.test/one').expect(201);

      await request(app.getHttpServer())
        .delete('/push/subscribe')
        .set(...authHeader(app, student))
        .send({ endpoint: 'https://push.example.test/one' })
        .expect(200);

      expect(await subscriptions(student)).toEqual([]);

      await broadcastToBatch('After unsubscribing').expect(201);
      expect(sender.sent).toHaveLength(0);
    });

    it('keeps one account from unsubscribing another', async () => {
      const keys = browserKeys();
      const other = await createUser(database, 'LEARNER');
      await subscribe(student, keys, 'https://push.example.test/one').expect(201);

      const { body } = await request(app.getHttpServer())
        .delete('/push/subscribe')
        .set(...authHeader(app, other))
        .send({ endpoint: 'https://push.example.test/one' })
        .expect(200);

      expect(body.removed).toBe(0);
      expect(await subscriptions(student)).toHaveLength(1);
    });

    it('turns anonymous callers away', async () => {
      await request(app.getHttpServer())
        .post('/push/subscribe')
        .send({
          endpoint: 'https://push.example.test/one',
          keys: { p256dh: 'x', auth: 'y' },
        })
        .expect(401);
    });
  });

  describe('delivery', () => {
    it('pushes to a subscribed browser when a notification is raised', async () => {
      const keys = browserKeys();
      await subscribe(student, keys, 'https://push.example.test/one').expect(201);

      await broadcastToBatch('Class moved').expect(201);

      expect(sender.sent).toHaveLength(1);
      expect(sender.sent[0].endpoint).toBe('https://push.example.test/one');

      const opened = decryptPayload(
        sender.sent[0].body,
        keys.privateKey,
        keys.authSecret,
        keys.publicKey,
      );
      expect(JSON.parse(opened).title).toBe('Class moved');
    });

    it('drops a subscription the browser has expired', async () => {
      const keys = browserKeys();
      await subscribe(student, keys, 'https://push.example.test/gone').expect(201);
      sender.status = 410;

      await broadcastToBatch('First try').expect(201);

      expect(await subscriptions(student)).toEqual([]);

      sender.reset();
      await broadcastToBatch('Second try').expect(201);
      expect(sender.sent).toHaveLength(0);
    });

    it('keeps a subscription that merely failed once', async () => {
      const keys = browserKeys();
      await subscribe(student, keys, 'https://push.example.test/flaky').expect(
        201,
      );
      sender.status = 500;

      await broadcastToBatch('Server hiccup').expect(201);

      expect(await subscriptions(student)).toHaveLength(1);
    });

    it('still records in-app when push throws', async () => {
      const keys = browserKeys();
      await subscribe(student, keys, 'https://push.example.test/one').expect(201);
      sender.throwOnce = true;

      await broadcastToBatch('Delivered anyway').expect(201);

      expect((await inbox(student)).map((n) => n.title)).toContain(
        'Delivered anyway',
      );
    });

    it('still records in-app when the push service refuses', async () => {
      const keys = browserKeys();
      await subscribe(student, keys, 'https://push.example.test/one').expect(201);
      sender.status = 403;

      await broadcastToBatch('Refused by push').expect(201);

      expect((await inbox(student)).map((n) => n.title)).toContain(
        'Refused by push',
      );
    });

    it('pushes to every browser the account registered', async () => {
      await subscribe(student, browserKeys(), 'https://push.example.test/desktop').expect(201);
      await subscribe(student, browserKeys(), 'https://push.example.test/laptop').expect(201);

      await broadcastToBatch('Two devices').expect(201);

      expect(sender.sent.map((d) => d.endpoint).sort()).toEqual([
        'https://push.example.test/desktop',
        'https://push.example.test/laptop',
      ]);
    });

    it('sends nothing to an account with no subscription', async () => {
      await broadcastToBatch('Nobody subscribed').expect(201);

      expect(sender.sent).toHaveLength(0);
      expect((await inbox(student)).map((n) => n.title)).toContain(
        'Nobody subscribed',
      );
    });
  });
});
