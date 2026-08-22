import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, TestActor } from './support/test-app';
import { createSignInUser } from './support/factories';
import { TEST_MAX_DEVICES } from './support/test-env';
import { AppConfigService } from '../src/config';

const MAX_DEVICES = TEST_MAX_DEVICES;
const PASSWORD = 'correct-horse-battery-staple';

type Device = { userAgent: string; ip: string };

describe('device limit at sign-in', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let student: TestActor;
  let run = 0;

  function device(n: number): Device {
    return { userAgent: `groEdu-test-device-${n}`, ip: `10.${run}.0.${n}` };
  }

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database);

    const configured = app
      .get(AppConfigService, { strict: false })
      .maxDevicesPerUser;
    expect(configured).toBe(MAX_DEVICES);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    run += 1;
    await truncateAll(database);
    student = await createSignInUser(database, 'LEARNER', PASSWORD);
  });

  function signIn(from: Device) {
    return request(app.getHttpServer())
      .post('/auth/login')
      .set('User-Agent', from.userAgent)
      .set('X-Forwarded-For', from.ip)
      .send({ email: student.email, password: PASSWORD });
  }

  async function fillEveryDeviceSlot(): Promise<string> {
    let token = '';
    for (let n = 0; n < MAX_DEVICES; n++) {
      const response = await signIn(device(n)).expect(200);
      token ||= response.body.access_token;
    }
    return token;
  }

  it('admits sign-ins up to the configured limit', async () => {
    for (let n = 0; n < MAX_DEVICES; n++) {
      const response = await signIn(device(n));
      expect(response.status).toBe(200);
      expect(response.body.access_token).toEqual(expect.any(String));
    }
  });

  it('refuses a sign-in from one device past the limit', async () => {
    await fillEveryDeviceSlot();

    const refused = await signIn(device(MAX_DEVICES));

    expect(refused.status).toBe(403);
    expect(refused.body.access_token).toBeUndefined();
  });

  it('names the device limit as the reason so the student can act on it', async () => {
    await fillEveryDeviceSlot();

    const refused = await signIn(device(MAX_DEVICES));

    expect(refused.body.code).toBe('DEVICE_LIMIT_REACHED');
    expect(refused.body.limit).toBe(MAX_DEVICES);
    expect(refused.body.message).toMatch(/sign out/i);
  });

  it('does not spend a slot on a device that has signed in before', async () => {
    await fillEveryDeviceSlot();

    await signIn(device(0)).expect(200);
  });

  it('frees a slot when the student signs a device out', async () => {
    const token = await fillEveryDeviceSlot();
    await signIn(device(MAX_DEVICES)).expect(403);

    const devices = await request(app.getHttpServer())
      .get('/users/me/devices')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const other = devices.body.find(
      (entry: { current: boolean }) => !entry.current,
    );

    await request(app.getHttpServer())
      .delete(`/users/me/devices/${other.deviceId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await signIn(device(MAX_DEVICES)).expect(200);
  });
});
