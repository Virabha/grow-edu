import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import {
  createUser,
  createBatch,
  createSubject,
  enrol,
} from './support/factories';
import { batchResources } from '../src/database/schema';

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}-${randomUUID().slice(0, 8)}`;
}

async function createResource(
  database: TestDatabase,
  batchId: string,
  uploadedBy: string,
  overrides: Partial<typeof batchResources.$inferInsert> = {},
): Promise<string> {
  const resourceId = randomUUID();
  await database.db.insert(batchResources).values({
    resourceId,
    batchId,
    title: unique('resource'),
    type: 'NOTES',
    fileKey: 'https://cdn.example.com/test.pdf',
    uploadedBy,
    ...overrides,
  });
  return resourceId;
}

describe('resources library', () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let enrolled: TestActor;
  let stranger: TestActor;
  let batchId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = await createTestApp(database, clock);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    admin = await createUser(database, 'PLATFORM_ADMIN');
    enrolled = await createUser(database, 'LEARNER');
    stranger = await createUser(database, 'LEARNER');
    batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, enrolled.userId);
  });

  it('groups resources by subject and type for an enrolled student', async () => {
    const subjectId = await createSubject(database, batchId);
    await createResource(database, batchId, admin.userId, {
      subjectId,
      type: 'NOTES',
      title: 'Physics Notes',
    });
    await createResource(database, batchId, admin.userId, {
      subjectId,
      type: 'DPP',
      title: 'Physics DPP 1',
    });
    await createResource(database, batchId, admin.userId, {
      type: 'REFERENCE',
      title: 'General Reference',
    });

    const { body } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/resources/library`)
      .set(...authHeader(app, enrolled))
      .expect(200);

    expect(Array.isArray(body)).toBe(true);

    const withSubject = body.find(
      (g: { subjectId: string }) => g.subjectId === subjectId,
    );
    expect(withSubject).toBeDefined();
    const typeNames = withSubject.groups.map((g: { type: string }) => g.type);
    expect(typeNames).toContain('NOTES');
    expect(typeNames).toContain('DPP');

    const noSubject = body.find(
      (g: { subjectId: string | null }) => g.subjectId === null,
    );
    expect(noSubject).toBeDefined();
    expect(noSubject.groups[0].type).toBe('REFERENCE');
    expect(
      noSubject.groups[0].resources.map((r: { title: string }) => r.title),
    ).toContain('General Reference');
  });

  it('rejects a student who is not enrolled', async () => {
    const missingBatch = randomUUID();

    const refused = await request(app.getHttpServer())
      .get(`/batches/${batchId}/resources/library`)
      .set(...authHeader(app, stranger));

    const absent = await request(app.getHttpServer())
      .get(`/batches/${missingBatch}/resources/library`)
      .set(...authHeader(app, stranger));

    expect(refused.status).toBe(404);
    expect(refused.status).toBe(absent.status);
    expect(refused.body.message).toBe(absent.body.message);
  });

  it('offers a download for a resource marked downloadable', async () => {
    const fileKey = 'https://cdn.example.com/downloadable.pdf';
    await createResource(database, batchId, admin.userId, {
      isDownloadable: true,
      fileKey,
    });

    const { body } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/resources/library`)
      .set(...authHeader(app, enrolled))
      .expect(200);

    const resource = body[0].groups[0].resources[0];
    expect(resource.downloadUrl).toBe(fileKey);
    expect(resource.viewUrl).toBe(fileKey);
    expect(resource.isDownloadable).toBe(true);
  });

  it('lets a view-only resource be read but not downloaded', async () => {
    const fileKey = 'https://cdn.example.com/view-only.pdf';
    await createResource(database, batchId, admin.userId, {
      isDownloadable: false,
      fileKey,
    });

    const { body } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/resources/library`)
      .set(...authHeader(app, enrolled))
      .expect(200);

    const resource = body[0].groups[0].resources[0];
    expect(resource.viewUrl).toBe(fileKey);
    expect(resource.downloadUrl).toBeNull();
    expect(resource.isDownloadable).toBe(false);
  });

  it('offers staff the download whatever the flag says', async () => {
    const fileKey = 'https://cdn.example.com/staff-view.pdf';
    await createResource(database, batchId, admin.userId, {
      isDownloadable: false,
      fileKey,
    });

    const { body } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/resources/library`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(body[0].groups[0].resources[0].downloadUrl).toBe(fileKey);
  });

  it('hides a scheduled resource until its publish time passes', async () => {
    clock.set('2027-01-01T00:00:00.000Z');

    await createResource(database, batchId, admin.userId, {
      title: 'Scheduled Notes',
      publishAt: new Date('2027-06-01T00:00:00.000Z'),
    });

    const { body: before } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/resources/library`)
      .set(...authHeader(app, enrolled))
      .expect(200);

    expect(before).toHaveLength(0);

    clock.set('2027-06-01T00:01:00.000Z');

    const { body: after } = await request(app.getHttpServer())
      .get(`/batches/${batchId}/resources/library`)
      .set(...authHeader(app, enrolled))
      .expect(200);

    expect(after).toHaveLength(1);
    expect(after[0].groups[0].resources[0].title).toBe('Scheduled Notes');
  });
});
