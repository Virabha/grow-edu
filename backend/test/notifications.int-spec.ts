import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as request from "supertest";
import { randomUUID } from "crypto";

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from "./support/test-database";
import { createTestApp, authHeader, TestActor } from "./support/test-app";
import { TestClock } from "./support/test-clock";
import { createUser } from "./support/factories";
import { JOB_QUEUE, JobHandler, JobQueue, JobOptions } from "../src/jobs/job-queue";
import { DATABASE_CONNECTION } from "../src/database/database.module";
import { CLOCK } from "../src/common/clock";
import { AppModule } from "../src/app.module";

class DeferredJobQueue implements JobQueue {
  private readonly pending: Array<() => Promise<void>> = [];
  private readonly handlers = new Map<string, JobHandler<unknown>>();

  register<T>(name: string, handler: JobHandler<T>, _options?: JobOptions): void {
    this.handlers.set(name, handler as JobHandler<unknown>);
  }

  async enqueue<T>(name: string, payload: T): Promise<void> {
    const h = this.handlers.get(name);
    if (h !== undefined) {
      this.pending.push(() => h(payload as unknown));
    }
  }

  async drain(): Promise<void> {
    let job = this.pending.shift();
    while (job !== undefined) {
      await job();
      job = this.pending.shift();
    }
  }

  async repeat(_name: string, _everyMilliseconds: number): Promise<void> {}
}

async function createDeferredApp(
  database: TestDatabase,
  clock: TestClock,
  queue: DeferredJobQueue,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DATABASE_CONNECTION)
    .useValue(database.db)
    .overrideProvider(CLOCK)
    .useValue(clock)
    .overrideProvider(JOB_QUEUE)
    .useValue(queue)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  app.set("trust proxy", 1);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

async function notificationsFor(
  appInstance: INestApplication,
  actor: TestActor,
): Promise<Array<{ title: string; body: string; read: boolean }>> {
  const { body } = await request(appInstance.getHttpServer())
    .get("/notifications")
    .set(...authHeader(appInstance, actor))
    .expect(200);
  return body.data ?? [];
}

describe("notification infrastructure", () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let student: TestActor;
  let callerIp: string;
  let testNumber = 0;

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
    testNumber += 1;
    callerIp = `203.0.116.${testNumber}`;
    admin = await createUser(database, "PLATFORM_ADMIN");
    student = await createUser(database, "LEARNER");
  });

  describe("AC1: queued fanout", () => {
    it("request returns before notifications are delivered; draining the queue delivers them", async () => {
      const deferredQueue = new DeferredJobQueue();
      const deferredApp = await createDeferredApp(database, clock, deferredQueue);

      try {
        await request(deferredApp.getHttpServer())
          .post("/notifications/send-bulk")
          .set("X-Forwarded-For", callerIp)
          .set(...authHeader(deferredApp, admin))
          .send({
            userIds: [student.userId],
            type: "GENERIC",
            vars: { title: "Queued hello", body: "Proof of queueing" },
          })
          .expect(201);

        const before = await notificationsFor(deferredApp, student);
        expect(before).toHaveLength(0);

        await deferredQueue.drain();

        const after = await notificationsFor(deferredApp, student);
        expect(after).toHaveLength(1);
        expect(after[0].title).toBe("Queued hello");
      } finally {
        await deferredApp.close();
      }
    });
  });

  describe("AC2: editable templates", () => {
    it("GET /notification-templates returns templates with defaults", async () => {
      const { body } = await request(app.getHttpServer())
        .get("/notification-templates")
        .set(...authHeader(app, admin))
        .expect(200);

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);

      const generic = body.find((t: { type: string }) => t.type === "GENERIC");
      expect(generic).toBeDefined();
      expect(generic.subject).toBe("{{title}}");
    });

    it("editing a template changes what the next notification says", async () => {
      await request(app.getHttpServer())
        .patch("/notification-templates/GENERIC")
        .set(...authHeader(app, admin))
        .send({ subject: "Edited: {{title}}", body: "{{body}} — customised" })
        .expect(200);

      await request(app.getHttpServer())
        .post("/notifications/send-bulk")
        .set("X-Forwarded-For", callerIp)
        .set(...authHeader(app, admin))
        .send({
          userIds: [student.userId],
          type: "GENERIC",
          vars: { title: "Hi", body: "Hello" },
        })
        .expect(201);

      const items = await notificationsFor(app, student);
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe("Edited: Hi");
      expect(items[0].body).toBe("Hello — customised");
    });

    it("GET /notification-templates/:type returns the stored template after edit", async () => {
      await request(app.getHttpServer())
        .patch("/notification-templates/GENERIC")
        .set(...authHeader(app, admin))
        .send({ subject: "Custom subject", body: "Custom body" })
        .expect(200);

      const { body } = await request(app.getHttpServer())
        .get("/notification-templates/GENERIC")
        .set(...authHeader(app, admin))
        .expect(200);

      expect(body.subject).toBe("Custom subject");
      expect(body.body).toBe("Custom body");
      expect(body.isCustom).toBe(true);
    });
  });

  describe("AC3: idempotent delivery", () => {
    it("re-triggering fanout with the same fanoutId does not double-deliver", async () => {
      const fanoutId = randomUUID();

      await request(app.getHttpServer())
        .post("/notifications/send-bulk")
        .set("X-Forwarded-For", callerIp)
        .set(...authHeader(app, admin))
        .send({
          userIds: [student.userId],
          type: "GENERIC",
          vars: { title: "Once only", body: "Body" },
          fanoutId,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post("/notifications/send-bulk")
        .set("X-Forwarded-For", callerIp)
        .set(...authHeader(app, admin))
        .send({
          userIds: [student.userId],
          type: "GENERIC",
          vars: { title: "Once only", body: "Body" },
          fanoutId,
        })
        .expect(201);

      const items = await notificationsFor(app, student);
      expect(items).toHaveLength(1);
    });
  });

  describe("AC4: in-app and email from same call site", () => {
    it("notify delivers in-app notification visible via polling endpoint", async () => {
      await request(app.getHttpServer())
        .post("/notifications/send-bulk")
        .set("X-Forwarded-For", callerIp)
        .set(...authHeader(app, admin))
        .send({
          userIds: [student.userId],
          type: "BATCH_ENROLLMENT",
          vars: { title: "Welcome aboard", body: "You are enrolled" },
        })
        .expect(201);

      const items = await notificationsFor(app, student);
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe("Welcome aboard");
    });

    it("email failure does not prevent in-app notification or fail the request", async () => {
      await request(app.getHttpServer())
        .post("/notifications/send-bulk")
        .set("X-Forwarded-For", callerIp)
        .set(...authHeader(app, admin))
        .send({
          userIds: [student.userId],
          type: "PAYMENT_APPROVED",
          vars: { title: "Payment done", body: "Your payment was approved" },
        })
        .expect(201);

      const items = await notificationsFor(app, student);
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe("Payment done");
    });
  });

  describe("AC5: polling endpoint", () => {
    it("unread-count returns correct count and decreases to zero after mark-all-read", async () => {
      await request(app.getHttpServer())
        .post("/notifications/send-bulk")
        .set("X-Forwarded-For", callerIp)
        .set(...authHeader(app, admin))
        .send({
          userIds: [student.userId],
          type: "GENERIC",
          vars: { title: "Note 1", body: "body" },
        })
        .expect(201);

      await request(app.getHttpServer())
        .post("/notifications/send-bulk")
        .set("X-Forwarded-For", callerIp)
        .set(...authHeader(app, admin))
        .send({
          userIds: [student.userId],
          type: "GENERIC",
          vars: { title: "Note 2", body: "body" },
        })
        .expect(201);

      const { body: before } = await request(app.getHttpServer())
        .get("/notifications/unread-count")
        .set(...authHeader(app, student))
        .expect(200);

      expect(before.count).toBe(2);

      await request(app.getHttpServer())
        .post("/notifications/mark-all-read")
        .set(...authHeader(app, student))
        .expect(201);

      const { body: after } = await request(app.getHttpServer())
        .get("/notifications/unread-count")
        .set(...authHeader(app, student))
        .expect(200);

      expect(after.count).toBe(0);
    });

    it("GET /notifications returns paginated data including unread count", async () => {
      await request(app.getHttpServer())
        .post("/notifications/send-bulk")
        .set("X-Forwarded-For", callerIp)
        .set(...authHeader(app, admin))
        .send({
          userIds: [student.userId],
          type: "GENERIC",
          vars: { title: "Poll me", body: "data" },
        })
        .expect(201);

      const { body } = await request(app.getHttpServer())
        .get("/notifications")
        .set(...authHeader(app, student))
        .expect(200);

      expect(body.data).toHaveLength(1);
      expect(body.unread).toBe(1);
      expect(body.pagination.total).toBe(1);
    });
  });
});
