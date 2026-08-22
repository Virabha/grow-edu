import { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as request from 'supertest';

import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import { createUser, createCompany, createCorporateAdmin } from './support/factories';
import { users } from '../src/database/schema';

describe('branded portal (ticket 28)', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;

  let platformAdmin: TestActor;
  let run = 0;

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    app = await createTestApp(database, clock);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    run += 1;
    clock.reset();
    await truncateAll(database);
    platformAdmin = await createUser(database, 'PLATFORM_ADMIN');
  });

  async function configureBranding(
    companyId: string,
    actor: TestActor,
    name = `Brand ${run}`,
  ) {
    return request(app.getHttpServer())
      .put(`/enterprise/branding/${companyId}`)
      .set(...authHeader(app, actor))
      .send({
        name,
        logoUrl: `https://cdn.example.test/logo-${run}.png`,
        primaryColor: '#1a73e8',
      });
  }

  it('a platform admin can configure branding per corporate', async () => {
    const companyId = await createCompany(database);
    const res = await configureBranding(companyId, platformAdmin);
    expect(res.status).toBe(200);
    expect(res.body.configured).toBe(true);
  });

  it('a corporate admin can configure branding for their own corporate', async () => {
    const companyId = await createCompany(database);
    const corpAdmin = await createCorporateAdmin(database, companyId);

    const res = await configureBranding(companyId, corpAdmin);
    expect(res.status).toBe(200);
  });

  it('a corporate admin cannot set branding for another corporate', async () => {
    const companyA = await createCompany(database);
    const companyB = await createCompany(database);
    const corpAdminA = await createCorporateAdmin(database, companyA);

    const res = await configureBranding(companyB, corpAdminA);
    expect(res.status).toBe(403);
  });

  it("a corporate's students receive that corporate's branding on GET /enterprise/branding/:companyId", async () => {
    const companyId = await createCompany(database);
    await configureBranding(companyId, platformAdmin, `Acme University ${run}`);

    const res = await request(app.getHttpServer())
      .get(`/enterprise/branding/${companyId}`)
      .expect(200);

    expect(res.body.name).toBe(`Acme University ${run}`);
    expect(res.body.primaryColor).toBe('#1a73e8');
  });

  it('a student outside any corporate receives the platform default on GET /enterprise/branding/mine', async () => {
    const student = await createUser(database, 'LEARNER');

    const res = await request(app.getHttpServer())
      .get('/enterprise/branding/mine')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.name).toBe('groEdu');
    expect(res.body.logoUrl).toBeNull();
    expect(res.body.primaryColor).toBeNull();
  });

  it("a student linked to a corporate receives that corporate's branding on GET /enterprise/branding/mine", async () => {
    const companyId = await createCompany(database);
    await configureBranding(companyId, platformAdmin, `State College ${run}`);

    const student = await createUser(database, 'LEARNER');
    await database.db
      .update(users)
      .set({ companyId })
      .where(eq(users.userId, student.userId));

    const res = await request(app.getHttpServer())
      .get('/enterprise/branding/mine')
      .set(...authHeader(app, student))
      .expect(200);

    expect(res.body.name).toBe(`State College ${run}`);
  });

  it('an unlinked company returns the platform default branding', async () => {
    const companyId = await createCompany(database);

    const res = await request(app.getHttpServer())
      .get(`/enterprise/branding/${companyId}`)
      .expect(200);

    expect(res.body.name).toBe('groEdu');
  });

  it('branding configuration does not alter any access decision', async () => {
    const companyId = await createCompany(database);
    await configureBranding(companyId, platformAdmin, `Locked Down University ${run}`);

    const student = await createUser(database, 'LEARNER');
    await database.db
      .update(users)
      .set({ companyId })
      .where(eq(users.userId, student.userId));

    const adminRes = await request(app.getHttpServer())
      .post('/enterprise/credentials')
      .set(...authHeader(app, student))
      .send({ companyId, label: 'test' });

    expect(adminRes.status).toBe(403);
  });

  it('the branding endpoint is public and requires no authentication', async () => {
    const companyId = await createCompany(database);
    await configureBranding(companyId, platformAdmin, `Open Brand ${run}`);

    const res = await request(app.getHttpServer())
      .get(`/enterprise/branding/${companyId}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe(`Open Brand ${run}`);
  });
});
