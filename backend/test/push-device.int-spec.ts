import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createECDH, randomBytes, randomUUID } from 'crypto';
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
import { base64UrlEncode } from '../src/notifications/web-push';
import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { authHeader, tokenFor, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createUser, createBatch, enrol } from './support/factories';
import { userDevices } from '../src/database/schema';

class FakePushSender implements PushSender {
  readonly sent: PushDelivery[] = [];
  status = 201;

  async send(delivery: PushDelivery): Promise<{ status: number }> {
    this.sent.push(delivery);
    return { status: this.status };
  }

  reset(): void {
    this.sent.length = 0;
    this.status = 201;
  }
}

function browserKeys() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = randomBytes(16);
  return {
    p256dh: base64UrlEncode(ecdh.getPublicKey()),
    auth: base64UrlEncode(auth),
  };
}

describe('push subscription per device', () => {
  let database: TestDatabase;
  let app: NestExpressApplication;
  let clock: TestClock;
  let sender: FakePushSender;
  let admin: TestActor;
  let student: TestActor;
  let batchId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    clock.set('2027-03-01T09:00:00.000Z');
    sender = new FakePushSender();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
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
    sender.reset();
    admin = await createUser(database, 'PLATFORM_ADMIN');
    student = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);
  });

  async function insertDevice(userId: string): Promise<string> {
    const deviceId = randomUUID();
    await database.db.insert(userDevices).values({
      deviceId,
      userId,
      userAgent: 'TestAgent/1.0',
      ipAddress: '10.0.0.1',
      lastSeenAt: clock.now(),
      createdAt: clock.now(),
    });
    return deviceId;
  }

  function subscribeWithDevice(
    actor: TestActor,
    deviceId: string,
    endpoint: string,
  ) {
    const keys = browserKeys();
    const token = tokenFor(app, actor, { deviceId });
    return request(app.getHttpServer())
      .post('/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ endpoint, keys });
  }

  function subscribeNoDevice(actor: TestActor, endpoint: string) {
    const keys = browserKeys();
    return request(app.getHttpServer())
      .post('/push/subscribe')
      .set(...authHeader(app, actor))
      .send({ endpoint, keys });
  }

  function broadcast(title: string) {
    return request(app.getHttpServer())
      .post('/admin/broadcasts')
      .set(...authHeader(app, admin))
      .send({
        audienceType: 'BATCH',
        audienceId: batchId,
        title,
        body: 'body',
      });
  }

  describe('registration against a device record', () => {
    it('refuses a subscription when deviceId does not exist in userDevices', async () => {
      const fakeDeviceId = randomUUID();
      const token = tokenFor(app, student, { deviceId: fakeDeviceId });
      const keys = browserKeys();

      await request(app.getHttpServer())
        .post('/push/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send({ endpoint: 'https://push.example.test/nonexistent', keys })
        .expect(400);
    });

    it('refuses a subscription for a revoked device', async () => {
      const deviceId = await insertDevice(student.userId);

      await request(app.getHttpServer())
        .delete(`/users/me/devices/${deviceId}`)
        .set(...authHeader(app, student))
        .expect(200);

      const keys = browserKeys();
      const token = tokenFor(app, student, { deviceId });

      await request(app.getHttpServer())
        .post('/push/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send({ endpoint: 'https://push.example.test/revoked', keys })
        .expect(400);
    });

    it('accepts a subscription when the device exists', async () => {
      const deviceId = await insertDevice(student.userId);
      await subscribeWithDevice(
        student,
        deviceId,
        'https://push.example.test/device-one',
      ).expect(201);
    });

    it('subscribing twice from one device does not duplicate', async () => {
      const deviceId = await insertDevice(student.userId);
      const endpoint = 'https://push.example.test/same-device';

      await subscribeWithDevice(student, deviceId, endpoint).expect(201);
      await subscribeWithDevice(student, deviceId, endpoint).expect(201);

      const { body } = await request(app.getHttpServer())
        .get('/push/subscriptions')
        .set(...authHeader(app, student))
        .expect(200);

      expect(body).toHaveLength(1);
    });

    it('student with two devices receives on both', async () => {
      const deviceA = await insertDevice(student.userId);
      const deviceB = await insertDevice(student.userId);

      await subscribeWithDevice(
        student,
        deviceA,
        'https://push.example.test/phone',
      ).expect(201);
      await subscribeWithDevice(
        student,
        deviceB,
        'https://push.example.test/tablet',
      ).expect(201);

      await broadcast('Two device test').expect(201);

      expect(sender.sent).toHaveLength(2);
      const endpoints = sender.sent.map((d) => d.endpoint).sort();
      expect(endpoints).toEqual([
        'https://push.example.test/phone',
        'https://push.example.test/tablet',
      ]);
    });
  });

  describe('removing a device removes its subscription', () => {
    it('revoking a device deletes its push subscription', async () => {
      const deviceId = await insertDevice(student.userId);
      await subscribeWithDevice(
        student,
        deviceId,
        'https://push.example.test/to-be-revoked',
      ).expect(201);

      await request(app.getHttpServer())
        .delete(`/users/me/devices/${deviceId}`)
        .set(...authHeader(app, student))
        .expect(200);

      const { body } = await request(app.getHttpServer())
        .get('/push/subscriptions')
        .set(...authHeader(app, student))
        .expect(200);

      expect(body).toHaveLength(0);

      await broadcast('After revoke').expect(201);
      expect(sender.sent).toHaveLength(0);
    });
  });

  describe('dead subscription pruning', () => {
    it('a subscription is pruned after repeated failures and not retried', async () => {
      await subscribeNoDevice(
        student,
        'https://push.example.test/failing',
      ).expect(201);

      sender.status = 500;

      for (let i = 0; i < 5; i++) {
        await broadcast(`Failure ${i + 1}`).expect(201);
        expect(sender.sent).toHaveLength(i + 1);
      }

      sender.reset();
      sender.status = 201;

      await broadcast('After prune').expect(201);
      expect(sender.sent).toHaveLength(0);
    });

    it('a pruned subscription is hidden from the subscription list', async () => {
      await subscribeNoDevice(
        student,
        'https://push.example.test/pruned',
      ).expect(201);

      sender.status = 500;
      for (let i = 0; i < 5; i++) {
        await broadcast(`Fail ${i + 1}`).expect(201);
      }

      const { body } = await request(app.getHttpServer())
        .get('/push/subscriptions')
        .set(...authHeader(app, student))
        .expect(200);

      expect(body).toHaveLength(0);
    });

    it('re-subscribing after pruning reactivates delivery', async () => {
      const endpoint = 'https://push.example.test/resubscribe';
      const keys = browserKeys();

      await request(app.getHttpServer())
        .post('/push/subscribe')
        .set(...authHeader(app, student))
        .send({ endpoint, keys })
        .expect(201);

      sender.status = 500;
      for (let i = 0; i < 5; i++) {
        await broadcast(`Fail ${i + 1}`).expect(201);
      }

      sender.reset();
      sender.status = 201;

      await request(app.getHttpServer())
        .post('/push/subscribe')
        .set(...authHeader(app, student))
        .send({ endpoint, keys })
        .expect(201);

      await broadcast('After resubscribe').expect(201);
      expect(sender.sent).toHaveLength(1);
      expect(sender.sent[0].endpoint).toBe(endpoint);
    });
  });
});
