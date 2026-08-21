import { INestApplication } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { assessmentTests, batchEnrollments } from "../src/database/schema";
import * as request from "supertest";

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from "./support/test-database";
import { createTestApp, authHeader, TestActor } from "./support/test-app";
import { TestClock } from "./support/test-clock";
import { createBatch, createUser } from "./support/factories";
import {
  createQuestion,
  createTaxonomy,
  createTest,
  placeQuestion,
  seedDifficultyScale,
  Taxonomy,
} from "./support/assessment-factories";

interface Performance {
  questionId: string;
  attempts: number;
  correct: number;
  wrong: number;
  skipped: number;
  correctRate: number;
  meanSeconds: number | null;
  optionDistribution: Record<string, number>;
  testsAppearedIn: number;
}

interface FailedQuestion {
  questionId: string;
  attempts: number;
  correct: number;
  failureRate: number;
  batchesSeenIn: number;
  batchesFailedIn: number;
  performancePath: string;
}

interface FailedReport {
  minAttempts: number;
  failureThreshold: number;
  questions: FailedQuestion[];
}

describe("question performance and cohort failure", () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let instructor: TestActor;
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
    instructor = await createUser(database, "INSTRUCTOR");
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, admin.userId);
  });

  async function publishedTest(overrides: Record<string, unknown> = {}) {
    return createTest(database, admin.userId, {
      publishedAt: clock.now(),
      durationMinutes: 120,
      ...overrides,
    });
  }

  async function enrolIfScoped(
    testId: string,
    student: TestActor,
  ): Promise<void> {
    const [scoped] = await database.db
      .select({ batchId: assessmentTests.batchId })
      .from(assessmentTests)
      .where(eq(assessmentTests.testId, testId));
    if (!scoped?.batchId) return;
    await database.db
      .insert(batchEnrollments)
      .values({ batchId: scoped.batchId, userId: student.userId })
      .onConflictDoNothing();
  }

  async function sit(
    testId: string,
    placementId: string,
    student: TestActor,
    response: unknown,
    seconds = 0,
  ): Promise<void> {
    await enrolIfScoped(testId, student);

    const { body } = await request(app.getHttpServer())
      .post(`/assessment/tests/${testId}/attempts`)
      .set(...authHeader(app, student))
      .expect(201);

    const attemptId = (body as { attemptId: string }).attemptId;

    if (seconds > 0) clock.advance(seconds * 1000);

    if (response !== undefined) {
      await request(app.getHttpServer())
        .patch(`/assessment/attempts/${attemptId}/answers/${placementId}`)
        .set(...authHeader(app, student))
        .send({ response })
        .expect(200);
    } else if (seconds > 0) {
      await request(app.getHttpServer())
        .post(`/assessment/attempts/${attemptId}/focus`)
        .set(...authHeader(app, student))
        .send({ placementId })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post(`/assessment/attempts/${attemptId}/submit`)
      .set(...authHeader(app, student))
      .expect(201);
  }

  async function performance(
    questionId: string,
    actor: TestActor = admin,
  ): Promise<Performance> {
    const { body } = await request(app.getHttpServer())
      .get(`/assessment/insights/questions/${questionId}/performance`)
      .set(...authHeader(app, actor))
      .expect(200);
    return body as Performance;
  }

  async function failed(
    query: string,
    actor: TestActor = admin,
  ): Promise<FailedReport> {
    const { body } = await request(app.getHttpServer())
      .get(`/assessment/insights/failed-questions${query}`)
      .set(...authHeader(app, actor))
      .expect(200);
    return body as FailedReport;
  }

  describe("ticket 07: question performance for the author", () => {
    it("aggregates across every test the question appears in", async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);

      const firstTest = await publishedTest();
      const secondTest = await publishedTest();
      const firstPlacement = await placeQuestion(
        database,
        firstTest,
        questionId,
      );
      const secondPlacement = await placeQuestion(
        database,
        secondTest,
        questionId,
      );

      const one = await createUser(database, "LEARNER");
      const two = await createUser(database, "LEARNER");

      await sit(firstTest, firstPlacement, one, "a");
      await sit(secondTest, secondPlacement, two, "b");

      const figures = await performance(questionId);

      expect(figures.testsAppearedIn).toBe(2);
      expect(figures.attempts).toBe(2);
      expect(figures.correct).toBe(1);
      expect(figures.wrong).toBe(1);
    });

    it("shows which wrong option is attracting answers", async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const testId = await publishedTest();
      const placementId = await placeQuestion(database, testId, questionId);

      const one = await createUser(database, "LEARNER");
      const two = await createUser(database, "LEARNER");
      const three = await createUser(database, "LEARNER");

      await sit(testId, placementId, one, "c");
      await sit(testId, placementId, two, "c");
      await sit(testId, placementId, three, "a");

      const figures = await performance(questionId);

      expect(figures.optionDistribution.c).toBe(2);
      expect(figures.optionDistribution.a).toBe(1);
      expect(figures.optionDistribution.b).toBe(0);
    });

    it("derives mean time from the captured per-question timing", async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const testId = await publishedTest();
      const placementId = await placeQuestion(database, testId, questionId);

      const one = await createUser(database, "LEARNER");
      const two = await createUser(database, "LEARNER");

      await sit(testId, placementId, one, "a", 40);
      await sit(testId, placementId, two, "a", 20);

      const figures = await performance(questionId);
      expect(figures.meanSeconds).toBe(30);
    });

    it("reports zero for a question nobody has attempted", async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);

      const figures = await performance(questionId);

      expect(figures.attempts).toBe(0);
      expect(figures.correct).toBe(0);
      expect(figures.correctRate).toBe(0);
      expect(figures.meanSeconds).toBeNull();
      expect(figures.testsAppearedIn).toBe(0);
    });

    it("refuses a student", async () => {
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const student = await createUser(database, "LEARNER");

      await request(app.getHttpServer())
        .get(`/assessment/insights/questions/${questionId}/performance`)
        .set(...authHeader(app, student))
        .expect(403);
    });
  });

  describe("ticket 41: questions the whole cohort failed", () => {
    it("reports questions by cohort failure rate across a batch's tests", async () => {
      const batchId = await createBatch(database, admin.userId);
      const hard = await createQuestion(database, taxonomy, admin.userId);
      const easy = await createQuestion(database, taxonomy, admin.userId);

      const testId = await publishedTest({ batchId });
      const hardPlacement = await placeQuestion(database, testId, hard, {
        order: 1,
      });
      const easyPlacement = await placeQuestion(database, testId, easy, {
        order: 2,
      });

      for (let i = 0; i < 3; i += 1) {
        const student = await createUser(database, "LEARNER");
        await enrolIfScoped(testId, student);
        const { body } = await request(app.getHttpServer())
          .post(`/assessment/tests/${testId}/attempts`)
          .set(...authHeader(app, student))
          .expect(201);
        const attemptId = (body as { attemptId: string }).attemptId;

        await request(app.getHttpServer())
          .patch(`/assessment/attempts/${attemptId}/answers/${hardPlacement}`)
          .set(...authHeader(app, student))
          .send({ response: "c" })
          .expect(200);
        await request(app.getHttpServer())
          .patch(`/assessment/attempts/${attemptId}/answers/${easyPlacement}`)
          .set(...authHeader(app, student))
          .send({ response: "a" })
          .expect(200);
        await request(app.getHttpServer())
          .post(`/assessment/attempts/${attemptId}/submit`)
          .set(...authHeader(app, student))
          .expect(201);
      }

      const report = await failed(`?batchId=${batchId}&minAttempts=2`);
      const ids = report.questions.map((q) => q.questionId);

      expect(ids).toContain(hard);
      expect(ids).not.toContain(easy);
      expect(
        report.questions.find((q) => q.questionId === hard)?.failureRate,
      ).toBe(1);
    });

    it("distinguishes a question failed in many batches from one failed in a single batch", async () => {
      const firstBatch = await createBatch(database, admin.userId);
      const secondBatch = await createBatch(database, admin.userId);

      const everywhere = await createQuestion(database, taxonomy, admin.userId);
      const onlyHere = await createQuestion(database, taxonomy, admin.userId);

      const firstTest = await publishedTest({ batchId: firstBatch });
      const secondTest = await publishedTest({ batchId: secondBatch });

      const everywhereFirst = await placeQuestion(
        database,
        firstTest,
        everywhere,
        { order: 1 },
      );
      const onlyHereFirst = await placeQuestion(
        database,
        firstTest,
        onlyHere,
        { order: 2 },
      );
      const everywhereSecond = await placeQuestion(
        database,
        secondTest,
        everywhere,
        { order: 1 },
      );
      const onlyHereSecond = await placeQuestion(
        database,
        secondTest,
        onlyHere,
        { order: 2 },
      );

      for (let i = 0; i < 2; i += 1) {
        const student = await createUser(database, "LEARNER");
        await sitBoth(firstTest, everywhereFirst, onlyHereFirst, student, "c", "c");
      }
      for (let i = 0; i < 2; i += 1) {
        const student = await createUser(database, "LEARNER");
        await sitBoth(
          secondTest,
          everywhereSecond,
          onlyHereSecond,
          student,
          "c",
          "a",
        );
      }

      const report = await failed("?minAttempts=2");

      const everywhereRow = report.questions.find(
        (q) => q.questionId === everywhere,
      );
      const onlyHereRow = report.questions.find(
        (q) => q.questionId === onlyHere,
      );

      expect(everywhereRow?.batchesSeenIn).toBe(2);
      expect(everywhereRow?.batchesFailedIn).toBe(2);
      expect(onlyHereRow?.batchesSeenIn).toBe(2);
      expect(onlyHereRow?.batchesFailedIn).toBe(1);
    });

    it("excludes a question below the attempt threshold", async () => {
      const batchId = await createBatch(database, admin.userId);
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const testId = await publishedTest({ batchId });
      const placementId = await placeQuestion(database, testId, questionId);

      const student = await createUser(database, "LEARNER");
      await sit(testId, placementId, student, "c");

      const strict = await failed(`?batchId=${batchId}&minAttempts=5`);
      expect(strict.questions.map((q) => q.questionId)).not.toContain(
        questionId,
      );

      const lenient = await failed(`?batchId=${batchId}&minAttempts=1`);
      expect(lenient.questions.map((q) => q.questionId)).toContain(questionId);
    });

    it("links each entry to the question's own performance figures", async () => {
      const batchId = await createBatch(database, admin.userId);
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const testId = await publishedTest({ batchId });
      const placementId = await placeQuestion(database, testId, questionId);

      const student = await createUser(database, "LEARNER");
      await sit(testId, placementId, student, "c");

      const report = await failed(`?batchId=${batchId}&minAttempts=1`);
      const row = report.questions.find((q) => q.questionId === questionId);
      expect(row?.performancePath).toBe(
        `/assessment/insights/questions/${questionId}/performance`,
      );

      const { body } = await request(app.getHttpServer())
        .get(row?.performancePath ?? "")
        .set(...authHeader(app, admin))
        .expect(200);
      expect((body as Performance).questionId).toBe(questionId);
    });

    it("is readable by staff and refused to a student", async () => {
      await failed("?minAttempts=1", instructor);

      const student = await createUser(database, "LEARNER");
      await request(app.getHttpServer())
        .get("/assessment/insights/failed-questions")
        .set(...authHeader(app, student))
        .expect(403);
    });
  });

  async function sitBoth(
    testId: string,
    firstPlacement: string,
    secondPlacement: string,
    student: TestActor,
    firstResponse: string,
    secondResponse: string,
  ): Promise<void> {
    await enrolIfScoped(testId, student);
    const { body } = await request(app.getHttpServer())
      .post(`/assessment/tests/${testId}/attempts`)
      .set(...authHeader(app, student))
      .expect(201);
    const attemptId = (body as { attemptId: string }).attemptId;

    await request(app.getHttpServer())
      .patch(`/assessment/attempts/${attemptId}/answers/${firstPlacement}`)
      .set(...authHeader(app, student))
      .send({ response: firstResponse })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/assessment/attempts/${attemptId}/answers/${secondPlacement}`)
      .set(...authHeader(app, student))
      .send({ response: secondResponse })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/assessment/attempts/${attemptId}/submit`)
      .set(...authHeader(app, student))
      .expect(201);
  }
});
