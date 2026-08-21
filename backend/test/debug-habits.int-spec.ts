import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { createTestDatabase, truncateAll, TestDatabase } from "./support/test-database";
import { createTestApp, authHeader, TestActor } from "./support/test-app";
import { TestClock } from "./support/test-clock";
import { createUser, createBatch, enrol, createSubject, createLesson } from "./support/factories";

describe("debug", () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();

  beforeAll(async () => {
    clock.set("2026-08-17T09:00:00.000Z");
    database = await createTestDatabase();
    app = await createTestApp(database, clock);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  it("debug event endpoint", async () => {
    await truncateAll(database);
    const admin = await createUser(database, "PLATFORM_ADMIN");
    const student = await createUser(database, "LEARNER");
    const batchId = await createBatch(database, admin.userId);
    await enrol(database, batchId, student.userId);
    const subjectId = await createSubject(database, batchId);
    const lessonId = await createLesson(database, subjectId);

    const res = await request(app.getHttpServer())
      .post("/habits/study/event")
      .set(...authHeader(app, student))
      .send({ batchId, subjectId, lessonId });

    console.log("Status:", res.status);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    expect(res.status).toBe(201);
  });
});
