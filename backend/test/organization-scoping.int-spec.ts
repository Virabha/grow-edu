import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import * as request from 'supertest';

import {
  createTestDatabase,
  tableNamesIn,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createUser } from './support/factories';
import {
  DEFAULT_ORGANIZATION_ID,
  batches,
  organizations,
  payments,
} from '../src/database/schema';

const ACCOUNT_TABLES = ['users', 'user_devices', 'email_tokens'];
const PLATFORM_WIDE = new Set(['organizations', ...ACCOUNT_TABLES]);

describe('organization scoping', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let admin: TestActor;

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
  });

  async function scopedTables(): Promise<{
    names: Set<string>;
    nullable: string[];
  }> {
    const rows = await database.db.execute<{
      table_name: string;
      is_nullable: string;
    }>(
      sql`select table_name, is_nullable from information_schema.columns
          where table_schema = ${database.schemaName}
            and column_name = 'organization_id'`,
    );
    return {
      names: new Set(rows.map((r) => r.table_name)),
      nullable: rows
        .filter((r) => r.is_nullable !== 'NO')
        .map((r) => r.table_name),
    };
  }

  it('scopes every tenant-owned table to an organization', async () => {
    const tables = await tableNamesIn(database);
    const { names, nullable } = await scopedTables();

    expect(tables.filter((t) => !PLATFORM_WIDE.has(t) && !names.has(t))).toEqual(
      [],
    );
    expect(nullable).toEqual([]);
  });

  it('keeps accounts and their devices platform-wide', async () => {
    const { names } = await scopedTables();

    expect(ACCOUNT_TABLES.filter((t) => names.has(t))).toEqual([]);
  });

  it('files everything the owner creates under the default organization', async () => {
    const suffix = randomUUID().slice(0, 8);
    const { body: batch } = await request(app.getHttpServer())
      .post('/batches')
      .set(...authHeader(app, admin))
      .send({
        title: `Batch ${suffix}`,
        slug: `batch-${suffix}`,
        price: 0,
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2027-06-30T00:00:00.000Z',
        status: 'ONGOING',
      })
      .expect(201);

    expect(batch.organizationId).toBe(DEFAULT_ORGANIZATION_ID);
  });

  it('lets two organizations use the same batch slug', async () => {
    const other = randomUUID();
    await database.db
      .insert(organizations)
      .values([
        { organizationId: DEFAULT_ORGANIZATION_ID, name: 'groEdu', slug: 'groedu' },
        { organizationId: other, name: 'Another college', slug: 'another' },
      ]);

    const shared = `shared-${randomUUID().slice(0, 8)}`;
    const row = {
      title: 'Shared slug',
      slug: shared,
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2027-06-30T00:00:00.000Z'),
      createdBy: admin.userId,
    };

    await database.db.insert(batches).values([
      { ...row, organizationId: DEFAULT_ORGANIZATION_ID },
      { ...row, organizationId: other },
    ]);

    const stored = await database.db
      .select({ slug: batches.slug })
      .from(batches);
    expect(stored).toHaveLength(2);
  });

  it('still refuses a duplicate batch slug inside one organization', async () => {
    const suffix = randomUUID().slice(0, 8);
    const body = {
      title: `Batch ${suffix}`,
      slug: `batch-${suffix}`,
      price: 0,
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2027-06-30T00:00:00.000Z',
      status: 'ONGOING',
    };

    await request(app.getHttpServer())
      .post('/batches')
      .set(...authHeader(app, admin))
      .send(body)
      .expect(201);

    await request(app.getHttpServer())
      .post('/batches')
      .set(...authHeader(app, admin))
      .send(body)
      .expect(409);
  });

  it('still upserts settings that are now keyed per organization', async () => {
    const set = (upiId: string) =>
      request(app.getHttpServer())
        .patch('/payments/qr-settings')
        .set(...authHeader(app, admin))
        .send({ upiId })
        .expect(200);

    await set('first@upi');
    const { body } = await set('second@upi');

    expect(body.upiId).toBe('second@upi');
  });

  it('still upserts a certificate template that is now keyed per organization', async () => {
    const put = (signatoryName: string) =>
      request(app.getHttpServer())
        .put('/certificate-template')
        .set(...authHeader(app, admin))
        .send({
          backgroundUrl: '',
          signatureUrl: '',
          signatoryName,
          signatoryTitle: 'Director of Studies',
          bodyText: 'This certifies that {{learner_name}} finished.',
          showQrCode: true,
          showCertificateId: true,
          accentColour: '#2563eb',
        })
        .expect(200);

    await put('Dr First');
    const { body } = await put('Dr Second');

    expect(body.signatoryName).toBe('Dr Second');
  });

  it('still upserts instructor meeting credentials keyed per organization', async () => {
    const teacher = await createUser(database, 'INSTRUCTOR');
    const put = (clientId: string) =>
      request(app.getHttpServer())
        .put('/instructor/meeting-credentials/zoom')
        .set(...authHeader(app, teacher))
        .send({ clientId, clientSecret: 'shhh' })
        .expect(200);

    await put('zoom-one');
    await put('zoom-two');
  });

  it('lets two organizations issue the same invoice number', async () => {
    const other = randomUUID();
    const invoiceNo = `INV-${randomUUID().slice(0, 8)}`;
    const row = {
      userId: admin.userId,
      itemType: 'BATCH' as const,
      amount: '100.00',
      currency: 'INR',
      gateway: 'MANUAL_QR' as const,
      invoiceNo,
    };

    await database.db.insert(payments).values([
      { ...row, organizationId: DEFAULT_ORGANIZATION_ID },
      { ...row, organizationId: other },
    ]);

    const stored = await database.db
      .select({ invoiceNo: payments.invoiceNo })
      .from(payments);
    expect(stored).toHaveLength(2);
  });
});
