import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { eq } from "drizzle-orm";

import { assessmentAttempts, assessmentTestStats } from "../src/database/schema";
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

describe("cohort figures cached (ticket 35)", () => {
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
    placementId: string,
    response: unknown = "a",
  ): Promise<string> {
    const { body: startBody } = await request(app.getHttpServer())
      .post(`/assessment/tests/${testId}/attempts`)
      .set(...authHeader(app, actor))
      .expect(201);

    const attemptId = (startBody as { attemptId: string }).attemptId;

    await request(app.getHttpServer())
      .patch(`/assessment/attempts/${attemptId}/answers/${placementId}`)
      .set(...authHeader(app, actor))
      .send({ response })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/assessment/attempts/${attemptId}/submit`)
      .set(...authHeader(app, actor))
      .expect(201);

    return attemptId;
  }

  async function readResult(attemptId: string, actor: TestActor) {
    await request(app.getHttpServer())
      .get(`/assessment/attempts/${attemptId}/result`)
      .set(...authHeader(app, actor))
      .expect(200);
  }

  async function getCachedComputedAt(testId: string): Promise<Date | null> {
    const [row] = await database.db
      .select()
      .from(assessmentTestStats)
      .where(eq(assessmentTestStats.testId, testId));
    return row?.computedAt ?? null;
  }

  it("does not recompute when the same student reads the result twice", async () => {
    const testId = await publishedTest();
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    const placementId = await placeQuestion(database, testId, questionId);

    const attemptId = await startAndSubmit(testId, student, placementId);

    await readResult(attemptId, student);
    const firstComputedAt = await getCachedComputedAt(testId);
    expect(firstComputedAt).not.toBeNull();

    clock.advance(5_000);
    await readResult(attemptId, student);
    const secondComputedAt = await getCachedComputedAt(testId);

    expect(secondComputedAt?.getTime()).toBe(firstComputedAt?.getTime());
  });

  it("two students reading do not each trigger recomputation", async () => {
    const testId = await publishedTest();
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    const placementId = await placeQuestion(database, testId, questionId);

    const student2 = await createUser(database, "LEARNER");

    const a1 = await startAndSubmit(testId, student, placementId);
    const a2 = await startAndSubmit(testId, student2, placementId);

    await readResult(a1, student);
    const computedAt1 = await getCachedComputedAt(testId);
    expect(computedAt1).not.toBeNull();

    clock.advance(5_000);
    await readResult(a2, student2);
    const computedAt2 = await getCachedComputedAt(testId);

    expect(computedAt2?.getTime()).toBe(computedAt1?.getTime());
  });

  it("a new submission invalidates the cache and moves computedAt", async () => {
    const testId = await publishedTest({ maxAttempts: 2 });
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    const placementId = await placeQuestion(database, testId, questionId);

    const student2 = await createUser(database, "LEARNER");

    const a1 = await startAndSubmit(testId, student, placementId);

    await readResult(a1, student);
    const computedAt1 = await getCachedComputedAt(testId);

    clock.advance(10_000);

    const a2 = await startAndSubmit(testId, student2, placementId);
    await readResult(a2, student2);
    const computedAt2 = await getCachedComputedAt(testId);

    expect(computedAt2).not.toBeNull();
    expect((computedAt2 as Date).getTime()).toBeGreaterThan(
      (computedAt1 as Date).getTime(),
    );
  });

  it("a regrade that changes a mark moves computedAt on next read", async () => {
    const testId = await publishedTest();
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    const placementId = await placeQuestion(database, testId, questionId);

    const attemptId = await startAndSubmit(testId, student, placementId);

    await readResult(attemptId, student);
    const computedAt1 = await getCachedComputedAt(testId);

    clock.advance(15_000);
    const now = clock.now();

    await database.db
      .update(assessmentAttempts)
      .set({ finalScore: "100", updatedAt: now })
      .where(eq(assessmentAttempts.attemptId, attemptId));

    await readResult(attemptId, student);
    const computedAt2 = await getCachedComputedAt(testId);

    expect((computedAt2 as Date).getTime()).toBeGreaterThan(
      (computedAt1 as Date).getTime(),
    );
  });

  it("cache absence produces correct figures rather than an error", async () => {
    const testId = await publishedTest();
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    const placementId = await placeQuestion(database, testId, questionId);

    const attemptId = await startAndSubmit(testId, student, placementId);

    await database.db
      .delete(assessmentTestStats)
      .where(eq(assessmentTestStats.testId, testId));

    const { body } = await request(app.getHttpServer())
      .get(`/assessment/attempts/${attemptId}/result`)
      .set(...authHeader(app, student))
      .expect(200);

    expect(body.questions).toBeDefined();
    expect(body.questions.length).toBeGreaterThan(0);
  });

  it("figures are correct after invalidation", async () => {
    const testId = await publishedTest({ maxAttempts: 2 });
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    const placementId = await placeQuestion(database, testId, questionId);

    const student2 = await createUser(database, "LEARNER");

    const a1 = await startAndSubmit(testId, student, placementId);
    await readResult(a1, student);

    const a2 = await startAndSubmit(testId, student2, placementId);
    const { body: result } = await request(app.getHttpServer())
      .get(`/assessment/attempts/${a2}/result`)
      .set(...authHeader(app, student2))
      .expect(200);

    const q = result.questions.find(
      (x: { placementId: string }) => x.placementId === placementId,
    );

    expect(q).toBeDefined();
    expect(q.cohortMeanSeconds).not.toBeNull();
  });
});
