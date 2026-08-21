import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from './support/test-database';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { TestClock } from './support/test-clock';
import {
  createBatch,
  createCompany,
  createCorporateAdmin,
  createUser,
  enrol,
} from './support/factories';
import {
  corporateContractBatches,
  corporateContracts,
  corporateSeats,
} from '../src/database/schema';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';

interface Schedule {
  scheduleId: string;
  cadence: string;
  isPaused: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  liveLink: string;
}

describe('scheduled report email', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let clock: TestClock;
  let queue: InlineJobQueue;
  let admin: TestActor;
  let collegeAdmin: TestActor;
  let contractId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    clock = new TestClock();
    app = await createTestApp(database, clock);
    queue = app.get<InlineJobQueue>(JOB_QUEUE);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    await truncateAll(database);
    clock.set('2027-02-01T09:00:00.000Z');
    admin = await createUser(database, 'PLATFORM_ADMIN');

    const companyId = await createCompany(database);
    collegeAdmin = await createCorporateAdmin(database, companyId);

    const batchId = await createBatch(database, admin.userId);
    const [contract] = await database.db
      .insert(corporateContracts)
      .values({
        companyId,
        title: 'Spring cohort',
        seatCount: 20,
        startsAt: new Date('2027-01-01T00:00:00.000Z'),
        endsAt: new Date('2027-12-31T00:00:00.000Z'),
        createdBy: collegeAdmin.userId,
      })
      .returning();
    contractId = contract.contractId;

    await database.db
      .insert(corporateContractBatches)
      .values({ contractId, batchId });

    const seated = await createUser(database, 'LEARNER');
    await database.db
      .insert(corporateSeats)
      .values({ contractId, userId: seated.userId });
    await enrol(database, batchId, seated.userId);
  });

  function schedule(body: Record<string, unknown>, actor = collegeAdmin) {
    return request(app.getHttpServer())
      .post(`/corporate/me/contracts/${contractId}/report-schedules`)
      .set(...authHeader(app, actor))
      .send(body);
  }

  async function schedules(actor = collegeAdmin): Promise<Schedule[]> {
    const { body } = await request(app.getHttpServer())
      .get(`/corporate/me/contracts/${contractId}/report-schedules`)
      .set(...authHeader(app, actor))
      .expect(200);
    return body;
  }

  async function inbox(actor: TestActor) {
    const { body } = await request(app.getHttpServer())
      .get('/notifications')
      .set(...authHeader(app, actor))
      .expect(200);
    return (body.data ?? body) as { title: string; body: string; link: string }[];
  }

  async function runDue() {
    await queue.enqueue('report.schedule.send', undefined);
  }

  it('lets a college admin choose a cadence', async () => {
    const { body } = await schedule({
      reportType: 'attendance',
      cadence: 'WEEKLY',
    }).expect(201);

    expect(body.cadence).toBe('WEEKLY');
    expect(body.isPaused).toBe(false);
    expect(body.nextRunAt).toBe('2027-02-08T09:00:00.000Z');
    expect(body.liveLink).toContain(contractId);
  });

  it('refuses a cadence it does not offer', async () => {
    await schedule({ reportType: 'attendance', cadence: 'HOURLY' }).expect(400);
  });

  it('sends nothing before the cadence comes round', async () => {
    await schedule({ reportType: 'attendance', cadence: 'WEEKLY' }).expect(201);

    clock.set('2027-02-07T09:00:00.000Z');
    await runDue();

    expect(await inbox(collegeAdmin)).toEqual([]);
  });

  it('sends the summary with a link once the clock passes', async () => {
    await schedule({ reportType: 'attendance', cadence: 'WEEKLY' }).expect(201);

    clock.set('2027-02-08T09:00:01.000Z');
    await runDue();

    const [note] = await inbox(collegeAdmin);
    expect(note.title).toContain('attendance summary');
    expect(note.body).toContain('1 students');
    expect(note.link).toContain(`/corporate/contracts/${contractId}/reports/attendance`);
  });

  it('moves on to the next run after sending', async () => {
    await schedule({ reportType: 'attendance', cadence: 'WEEKLY' }).expect(201);

    clock.set('2027-02-08T09:00:01.000Z');
    await runDue();

    const [after] = await schedules();
    expect(after.lastRunAt).toBe('2027-02-08T09:00:01.000Z');
    expect(after.nextRunAt).toBe('2027-02-15T09:00:01.000Z');
  });

  it('sends once per due window however often the job runs', async () => {
    await schedule({ reportType: 'attendance', cadence: 'WEEKLY' }).expect(201);

    clock.set('2027-02-08T09:00:01.000Z');
    await runDue();
    await runDue();
    await runDue();

    expect(await inbox(collegeAdmin)).toHaveLength(1);
  });

  it('stops sending while paused and starts again when resumed', async () => {
    const { body: created } = await schedule({
      reportType: 'attendance',
      cadence: 'WEEKLY',
    }).expect(201);

    await request(app.getHttpServer())
      .patch(
        `/corporate/me/contracts/${contractId}/report-schedules/${created.scheduleId}`,
      )
      .set(...authHeader(app, collegeAdmin))
      .send({ isPaused: true })
      .expect(200);

    clock.set('2027-02-08T09:00:01.000Z');
    await runDue();
    expect(await inbox(collegeAdmin)).toEqual([]);

    await request(app.getHttpServer())
      .patch(
        `/corporate/me/contracts/${contractId}/report-schedules/${created.scheduleId}`,
      )
      .set(...authHeader(app, collegeAdmin))
      .send({ isPaused: false })
      .expect(200);

    await runDue();
    expect(await inbox(collegeAdmin)).toHaveLength(1);
  });

  it('summarises only what is inside the caller\'s contract', async () => {
    const otherCompany = await createCompany(database);
    const otherAdmin = await createCorporateAdmin(database, otherCompany);
    const otherBatch = await createBatch(database, admin.userId);
    const [otherContract] = await database.db
      .insert(corporateContracts)
      .values({
        companyId: otherCompany,
        title: 'Rival cohort',
        seatCount: 50,
        startsAt: new Date('2027-01-01T00:00:00.000Z'),
        endsAt: new Date('2027-12-31T00:00:00.000Z'),
        createdBy: otherAdmin.userId,
      })
      .returning();
    await database.db
      .insert(corporateContractBatches)
      .values({ contractId: otherContract.contractId, batchId: otherBatch });
    for (let i = 0; i < 4; i += 1) {
      const learner = await createUser(database, 'LEARNER');
      await database.db
        .insert(corporateSeats)
        .values({ contractId: otherContract.contractId, userId: learner.userId });
      await enrol(database, otherBatch, learner.userId);
    }

    await schedule({ reportType: 'attendance', cadence: 'WEEKLY' }).expect(201);

    clock.set('2027-02-08T09:00:01.000Z');
    await runDue();

    const [note] = await inbox(collegeAdmin);
    expect(note.body).toContain('1 students');
    expect(note.body).not.toContain('5 students');
  });

  it('keeps one college from scheduling on another\'s contract', async () => {
    const otherCompany = await createCompany(database);
    const otherAdmin = await createCorporateAdmin(database, otherCompany);

    await schedule(
      { reportType: 'attendance', cadence: 'WEEKLY' },
      otherAdmin,
    ).expect(404);
  });

  it('stops a schedule for good', async () => {
    const { body: created } = await schedule({
      reportType: 'test-performance',
      cadence: 'MONTHLY',
    }).expect(201);

    await request(app.getHttpServer())
      .delete(
        `/corporate/me/contracts/${contractId}/report-schedules/${created.scheduleId}`,
      )
      .set(...authHeader(app, collegeAdmin))
      .expect(200);

    expect(await schedules()).toEqual([]);

    clock.set('2027-04-01T09:00:00.000Z');
    await runDue();
    expect(await inbox(collegeAdmin)).toEqual([]);
  });

  it('is a repeating scheduled job, not something a request triggers', async () => {
    clock.set('2032-01-01T00:00:00.000Z');

    expect(await queue.tick()).toContain('report.schedule.send');
  });
});
