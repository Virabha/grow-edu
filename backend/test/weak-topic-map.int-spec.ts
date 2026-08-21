import { INestApplication } from "@nestjs/common";
import * as request from "supertest";

import { createTestDatabase, truncateAll, TestDatabase } from "./support/test-database";
import { createTestApp, authHeader, TestActor } from "./support/test-app";
import { TestClock } from "./support/test-clock";
import { createUser } from "./support/factories";
import {
  createQuestion,
  createTaxonomy,
  createTest,
  placeQuestion,
  seedDifficultyScale,
  Taxonomy,
} from "./support/assessment-factories";
import { InlineJobQueue } from "../src/jobs/inline-job-queue";
import { JOB_QUEUE } from "../src/jobs/job-queue";
import { WEAK_TOPIC_JOB } from "../src/assessment/results/weak-topic.service";

describe("weak-topic map (ticket 36)", () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let student: TestActor;
  let taxonomy: Taxonomy;

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
    admin = await createUser(database, "PLATFORM_ADMIN");
    student = await createUser(database, "LEARNER");
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, admin.userId);
  });

  async function publishedTest(
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    return createTest(database, admin.userId, {
      publishedAt: clock.now(),
      durationMinutes: 120,
      ...overrides,
    });
  }

  async function startAndSubmit(
    testId: string,
    actor: TestActor,
    answers: { placementId: string; response: unknown }[],
  ): Promise<void> {
    const { body: startBody } = await request(app.getHttpServer())
      .post(`/assessment/tests/${testId}/attempts`)
      .set(...authHeader(app, actor))
      .expect(201);

    const attemptId = (startBody as { attemptId: string }).attemptId;

    for (const ans of answers) {
      await request(app.getHttpServer())
        .patch(`/assessment/attempts/${attemptId}/answers/${ans.placementId}`)
        .set(...authHeader(app, actor))
        .send({ response: ans.response })
        .expect(200);
    }

    await request(app.getHttpServer())
      .post(`/assessment/attempts/${attemptId}/submit`)
      .set(...authHeader(app, actor))
      .expect(201);
  }

  async function runJob(): Promise<void> {
    const queue = app.get<InlineJobQueue>(JOB_QUEUE);
    await queue.enqueue(WEAK_TOPIC_JOB, undefined);
  }

  async function getWeakTopics(actor: TestActor) {
    const { body } = await request(app.getHttpServer())
      .get("/assessment/my/weak-topics")
      .set(...authHeader(app, actor))
      .expect(200);
    return body as {
      topicId: string;
      topicName: string;
      attempted: number;
      correct: number;
      accuracy: number;
    }[];
  }

  it("returns an empty array before the job runs", async () => {
    const topics = await getWeakTopics(student);
    expect(topics).toEqual([]);
  });

  it("reflects outcomes across several tests", async () => {
    const testId1 = await publishedTest({ maxAttempts: 1 });
    const testId2 = await publishedTest({ maxAttempts: 1 });

    const q1 = await createQuestion(database, taxonomy, admin.userId);
    const q2 = await createQuestion(database, taxonomy, admin.userId);

    const p1 = await placeQuestion(database, testId1, q1);
    const p2 = await placeQuestion(database, testId2, q2);

    await startAndSubmit(testId1, student, [{ placementId: p1, response: "a" }]);
    await startAndSubmit(testId2, student, [{ placementId: p2, response: "b" }]);

    await runJob();

    const topics = await getWeakTopics(student);
    const topicEntry = topics.find((t) => t.topicId === taxonomy.topicId);

    expect(topicEntry).toBeDefined();
    expect(topicEntry?.attempted).toBe(2);
  });

  it("a topic never attempted is absent", async () => {
    const taxonomy2 = await createTaxonomy(database, admin.userId);
    const testId = await publishedTest();
    const q1 = await createQuestion(database, taxonomy, admin.userId);
    const p1 = await placeQuestion(database, testId, q1);

    await startAndSubmit(testId, student, [{ placementId: p1, response: "a" }]);

    await runJob();

    const topics = await getWeakTopics(student);
    const absent = topics.find((t) => t.topicId === taxonomy2.topicId);

    expect(absent).toBeUndefined();
  });

  it("running the job twice produces the same map", async () => {
    const testId = await publishedTest();
    const q1 = await createQuestion(database, taxonomy, admin.userId);
    const p1 = await placeQuestion(database, testId, q1);

    await startAndSubmit(testId, student, [{ placementId: p1, response: "a" }]);

    await runJob();
    const firstRun = await getWeakTopics(student);

    await runJob();
    const secondRun = await getWeakTopics(student);

    expect(secondRun).toEqual(firstRun);
  });

  it("sub-topic outcomes roll up into parent topic", async () => {
    const taxonomyWithSub = await createTaxonomy(database, admin.userId);

    const testId = await publishedTest();
    const qSub = await createQuestion(database, taxonomy, admin.userId, {
      subTopicId: taxonomyWithSub.subTopicId,
    });
    const pSub = await placeQuestion(database, testId, qSub);

    await startAndSubmit(testId, student, [
      { placementId: pSub, response: "a" },
    ]);

    await runJob();

    const topics = await getWeakTopics(student);
    const subTopicEntry = topics.find(
      (t) => t.topicId === taxonomyWithSub.subTopicId,
    );
    const topicEntry = topics.find(
      (t) => t.topicId === taxonomyWithSub.topicId,
    );

    expect(subTopicEntry).toBeUndefined();
    expect(topicEntry).toBeDefined();
  });

  it("map is readable between job runs (data persists)", async () => {
    const testId = await publishedTest();
    const q1 = await createQuestion(database, taxonomy, admin.userId);
    const p1 = await placeQuestion(database, testId, q1);

    await startAndSubmit(testId, student, [{ placementId: p1, response: "a" }]);

    await runJob();
    const afterFirst = await getWeakTopics(student);
    expect(afterFirst.length).toBeGreaterThan(0);

    clock.advance(60_000);
    const betweenRuns = await getWeakTopics(student);
    expect(betweenRuns).toEqual(afterFirst);
  });

  it("returns only the requesting user's topics", async () => {
    const student2 = await createUser(database, "LEARNER");
    const taxonomy2 = await createTaxonomy(database, admin.userId);

    const testId1 = await publishedTest();
    const testId2 = await publishedTest();

    const q1 = await createQuestion(database, taxonomy, admin.userId);
    const q2 = await createQuestion(database, taxonomy2, admin.userId);

    const p1 = await placeQuestion(database, testId1, q1);
    const p2 = await placeQuestion(database, testId2, q2);

    await startAndSubmit(testId1, student, [{ placementId: p1, response: "a" }]);
    await startAndSubmit(testId2, student2, [
      { placementId: p2, response: "a" },
    ]);

    await runJob();

    const myTopics = await getWeakTopics(student);
    const topicIds = myTopics.map((t) => t.topicId);

    expect(topicIds).toContain(taxonomy.topicId);
    expect(topicIds).not.toContain(taxonomy2.topicId);
  });
});
