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
  text,
  Taxonomy,
} from "./support/assessment-factories";
import {
  ResultView,
  TopperComparisonView,
} from "../src/assessment/results/result.service";

describe("attempt result", () => {
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

  async function start(testId: string, actor: TestActor = student) {
    const { body } = await request(app.getHttpServer())
      .post(`/assessment/tests/${testId}/attempts`)
      .set(...authHeader(app, actor))
      .expect(201);
    return body as { attemptId: string };
  }

  async function answer(
    attemptId: string,
    placementId: string,
    response: unknown,
    actor: TestActor = student,
  ) {
    return request(app.getHttpServer())
      .patch(`/assessment/attempts/${attemptId}/answers/${placementId}`)
      .set(...authHeader(app, actor))
      .send({ response })
      .expect(200);
  }

  async function submit(attemptId: string, actor: TestActor = student) {
    const { body } = await request(app.getHttpServer())
      .post(`/assessment/attempts/${attemptId}/submit`)
      .set(...authHeader(app, actor))
      .expect(201);
    return body as { status: string };
  }

  async function getResult(
    attemptId: string,
    actor: TestActor = student,
    expectedStatus = 200,
  ) {
    const { body } = await request(app.getHttpServer())
      .get(`/assessment/attempts/${attemptId}/result`)
      .set(...authHeader(app, actor))
      .expect(expectedStatus);
    return body as ResultView;
  }

  async function getComparison(
    attemptId: string,
    actor: TestActor = student,
    expectedStatus = 200,
  ) {
    const { body } = await request(app.getHttpServer())
      .get(`/assessment/attempts/${attemptId}/topper-comparison`)
      .set(...authHeader(app, actor))
      .expect(expectedStatus);
    return body as TopperComparisonView;
  }

  describe("ticket 31: correct answers and explanations", () => {
    it("exposes the correct answer and explanation after submission", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(
        database,
        taxonomy,
        admin.userId,
        { explanation: text("Because A is correct.") },
      );
      const placementId = await placeQuestion(database, testId, questionId);

      const { attemptId } = await start(testId);
      await answer(attemptId, placementId, "a");
      await submit(attemptId);

      const result = await getResult(attemptId);

      const q = result.questions.find((x) => x.placementId === placementId);
      expect(q).toBeDefined();
      expect(q?.correctAnswer).toEqual({ kind: "SINGLE", optionId: "a" });
      expect(q?.explanation).toEqual(text("Because A is correct."));
    });

    it("does not expose answer or explanation on an in-progress attempt via result endpoint", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      await placeQuestion(database, testId, questionId);

      const { attemptId } = await start(testId);

      await getResult(attemptId, student, 409);
    });

    it("does not expose answer or explanation from the attempt endpoint before submission", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const placementId = await placeQuestion(database, testId, questionId);

      const { attemptId } = await start(testId);

      const { body } = await request(app.getHttpServer())
        .get(`/assessment/attempts/${attemptId}`)
        .set(...authHeader(app, student))
        .expect(200);

      const q = body.questions?.find(
        (x: { placementId: string }) => x.placementId === placementId,
      );
      expect(q).toBeDefined();
      expect(q.correctAnswer).toBeUndefined();
      expect(q.explanation).toBeUndefined();
    });

    it("withholds answers and explanations when showSolutions is false", async () => {
      const testId = await publishedTest({ showSolutions: false });
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const placementId = await placeQuestion(database, testId, questionId);

      const { attemptId } = await start(testId);
      await answer(attemptId, placementId, "a");
      await submit(attemptId);

      const result = await getResult(attemptId);

      const q = result.questions.find((x) => x.placementId === placementId);
      expect(q?.correctAnswer).toBeNull();
      expect(q?.explanation).toBeNull();
    });

    it("withholds explanation for a pending human-graded question", async () => {
      const testId = await publishedTest();
      const writtenId = await createQuestion(database, taxonomy, admin.userId, {
        type: "WRITTEN",
      });
      const autoId = await createQuestion(database, taxonomy, admin.userId);

      const writtenPlacement = await placeQuestion(
        database,
        testId,
        writtenId,
        { order: 1 },
      );
      const autoPlacement = await placeQuestion(database, testId, autoId, {
        order: 2,
      });

      const { attemptId } = await start(testId);
      await answer(attemptId, writtenPlacement, "My written answer.");
      await answer(attemptId, autoPlacement, "a");
      await submit(attemptId);

      const result = await getResult(attemptId);

      const written = result.questions.find(
        (x) => x.placementId === writtenPlacement,
      );
      const auto = result.questions.find(
        (x) => x.placementId === autoPlacement,
      );

      expect(written?.outcome).toBe("PENDING");
      expect(written?.explanation).toBeNull();
      expect(auto?.explanation).not.toBeNull();
    });

    it("uses the question version the student saw for explanation", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId, {
        explanation: text("Original explanation."),
      });
      const placementId = await placeQuestion(database, testId, questionId);

      const { attemptId } = await start(testId);
      await answer(attemptId, placementId, "a");
      await submit(attemptId);

      await database.db
        .insert(
          (await import("../src/database/schema")).assessmentQuestionVersions,
        )
        .values({
          questionId,
          version: 2,
          prompt: text("New prompt"),
          options: [],
          answerKey: { kind: "SINGLE", optionId: "b" },
          explanation: text("Revised explanation."),
          searchText: "New prompt",
          createdBy: admin.userId,
        });

      const result = await getResult(attemptId);
      const q = result.questions.find((x) => x.placementId === placementId);

      expect(q?.questionVersion).toBe(1);
      expect(q?.explanation).toEqual(text("Original explanation."));
    });
  });

  describe("ticket 32: timing vs cohort", () => {
    it("shows the student's elapsed time per question", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const placementId = await placeQuestion(database, testId, questionId);

      const { attemptId } = await start(testId);
      await request(app.getHttpServer())
        .post(`/assessment/attempts/${attemptId}/focus`)
        .set(...authHeader(app, student))
        .send({ placementId })
        .expect(201);
      clock.advance(30_000);
      await answer(attemptId, placementId, "a");
      await submit(attemptId);

      const result = await getResult(attemptId);
      const q = result.questions.find((x) => x.placementId === placementId);
      expect(q?.elapsedSeconds).toBeGreaterThan(0);
    });

    it("computes the cohort mean excluding in-progress attempts", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const placementId = await placeQuestion(database, testId, questionId, {
        marks: "4",
      });

      const student2 = await createUser(database, "LEARNER");

      const { attemptId: a1 } = await start(testId, student);
      await request(app.getHttpServer())
        .post(`/assessment/attempts/${a1}/focus`)
        .set(...authHeader(app, student))
        .send({ placementId })
        .expect(201);
      clock.advance(60_000);
      await answer(a1, placementId, "a");
      await submit(a1, student);

      const inProgressAttempt = await start(testId, student2);
      await request(app.getHttpServer())
        .post(`/assessment/attempts/${inProgressAttempt.attemptId}/focus`)
        .set(...authHeader(app, student2))
        .send({ placementId })
        .expect(201);
      clock.advance(200_000);

      const result = await getResult(a1);
      const q = result.questions.find((x) => x.placementId === placementId);

      expect(q?.cohortMeanSeconds).toBeGreaterThan(0);
      expect(q?.cohortMeanSeconds).toBeLessThan(200);
    });

    it("computes mean as the single attempt when only one student submitted", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const placementId = await placeQuestion(database, testId, questionId);

      const { attemptId } = await start(testId);
      await request(app.getHttpServer())
        .post(`/assessment/attempts/${attemptId}/focus`)
        .set(...authHeader(app, student))
        .send({ placementId })
        .expect(201);
      clock.advance(45_000);
      await answer(attemptId, placementId, "a");
      await submit(attemptId);

      const result = await getResult(attemptId);
      const q = result.questions.find((x) => x.placementId === placementId);

      expect(q?.cohortMeanSeconds).toBeGreaterThan(0);
      expect(q?.cohortMeanSeconds).not.toBeNull();
    });

    it("excludes skipped questions from the cohort mean", async () => {
      const testId = await publishedTest({ maxAttempts: 2 });
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const placementId = await placeQuestion(database, testId, questionId);

      const student2 = await createUser(database, "LEARNER");

      const { attemptId: a1 } = await start(testId, student);
      await request(app.getHttpServer())
        .post(`/assessment/attempts/${a1}/focus`)
        .set(...authHeader(app, student))
        .send({ placementId })
        .expect(201);
      clock.advance(40_000);
      await answer(a1, placementId, "a");
      await submit(a1, student);

      const { attemptId: a2 } = await start(testId, student2);
      await submit(a2, student2);

      const result = await getResult(a1);
      const q = result.questions.find((x) => x.placementId === placementId);

      expect(q?.cohortMeanSeconds).toBeGreaterThan(0);
    });
  });

  describe("ticket 33: mark breakdown by section and topic", () => {
    it("breakdown sums to the attempt total", async () => {
      const testId = await publishedTest();
      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const q2 = await createQuestion(database, taxonomy, admin.userId);
      const p1 = await placeQuestion(database, testId, q1, {
        order: 1,
        marks: "4",
        sectionName: "Section A",
      });
      const p2 = await placeQuestion(database, testId, q2, {
        order: 2,
        marks: "6",
        sectionName: "Section B",
      });

      const { attemptId } = await start(testId);
      await answer(attemptId, p1, "a");
      await answer(attemptId, p2, "b");
      await submit(attemptId);

      const result = await getResult(attemptId);

      const totalEarned = result.sections.reduce(
        (sum, s) => sum + s.earned,
        0,
      );
      const totalAvailable = result.sections.reduce(
        (sum, s) => sum + s.available,
        0,
      );

      expect(totalAvailable).toBe(10);
      expect(totalEarned).toBeCloseTo(result.provisionalScore ?? 0, 2);
    });

    it("topics are derived from question tags", async () => {
      const taxonomy2 = await createTaxonomy(database, admin.userId);
      const testId = await publishedTest();
      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const q2 = await createQuestion(database, taxonomy2, admin.userId);
      const p1 = await placeQuestion(database, testId, q1, { order: 1 });
      const p2 = await placeQuestion(database, testId, q2, { order: 2 });

      const { attemptId } = await start(testId);
      await answer(attemptId, p1, "a");
      await answer(attemptId, p2, "a");
      await submit(attemptId);

      const result = await getResult(attemptId);

      const topicIds = result.topics.map((t) => t.topicId);
      expect(topicIds).toContain(taxonomy.topicId);
      expect(topicIds).toContain(taxonomy2.topicId);
    });

    it("a sub-topic tagged question rolls up into the parent topic", async () => {
      const taxonomyWithSub = await createTaxonomy(database, admin.userId);
      const testId = await publishedTest();

      const qSub = await createQuestion(database, taxonomy, admin.userId, {
        subTopicId: taxonomyWithSub.subTopicId,
      });
      const pSub = await placeQuestion(database, testId, qSub, {
        marks: "4",
      });

      const { attemptId } = await start(testId);
      await answer(attemptId, pSub, "a");
      await submit(attemptId);

      const result = await getResult(attemptId);

      const topicIds = result.topics.map((t) => t.topicId);
      expect(topicIds).not.toContain(taxonomyWithSub.subTopicId);
      expect(topicIds).toContain(taxonomyWithSub.topicId);
    });

    it("sections are absent when test uses no section names", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const placementId = await placeQuestion(database, testId, questionId);

      const { attemptId } = await start(testId);
      await answer(attemptId, placementId, "a");
      await submit(attemptId);

      const result = await getResult(attemptId);

      for (const section of result.sections) {
        expect(section.sectionName).toBeNull();
      }
    });

    it("pending human-graded marks are reported as pending, not earned", async () => {
      const testId = await publishedTest();
      const writtenId = await createQuestion(database, taxonomy, admin.userId, {
        type: "WRITTEN",
      });
      const autoId = await createQuestion(database, taxonomy, admin.userId);

      const wPlacement = await placeQuestion(database, testId, writtenId, {
        order: 1,
        marks: "6",
      });
      const aPlacement = await placeQuestion(database, testId, autoId, {
        order: 2,
        marks: "4",
      });

      const { attemptId } = await start(testId);
      await answer(attemptId, wPlacement, "My essay.");
      await answer(attemptId, aPlacement, "a");
      await submit(attemptId);

      const result = await getResult(attemptId);

      const allPending = result.topics.reduce((sum, t) => sum + t.pending, 0);
      const allEarned = result.topics.reduce((sum, t) => sum + t.earned, 0);

      expect(allPending).toBeGreaterThan(0);
      expect(allEarned).toBeLessThan(10);
      expect(allPending + allEarned).toBeLessThanOrEqual(10);
    });
  });

  describe("ticket 34: comparison against the top scorer", () => {
    it("reports per-topic and per-question deltas", async () => {
      const testId = await publishedTest();
      const student2 = await createUser(database, "LEARNER");

      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const q2 = await createQuestion(database, taxonomy, admin.userId);
      const p1 = await placeQuestion(database, testId, q1, {
        order: 1,
        marks: "4",
      });
      const p2 = await placeQuestion(database, testId, q2, {
        order: 2,
        marks: "4",
      });

      const { attemptId: a1 } = await start(testId, student);
      await answer(a1, p1, "a");
      await submit(a1, student);

      const { attemptId: a2 } = await start(testId, student2);
      await answer(a2, p1, "a", student2);
      await answer(a2, p2, "a", student2);
      await submit(a2, student2);

      const comparison = await getComparison(a1, student);

      expect(comparison.available).toBe(true);
      expect(comparison.questions.length).toBeGreaterThan(0);
      expect(comparison.topics.length).toBeGreaterThan(0);

      const q1Delta = comparison.questions.find(
        (q) => q.placementId === p1,
      );
      const q2Delta = comparison.questions.find(
        (q) => q.placementId === p2,
      );

      expect(q1Delta?.myAwardedMarks).toBe(4);
      expect(q1Delta?.topAwardedMarks).toBe(4);
      expect(q2Delta?.myAwardedMarks).toBe(0);
      expect(q2Delta?.topAwardedMarks).toBe(4);
      expect(q2Delta?.delta).toBe(-4);
    });

    it("top scorer gets an empty comparison without error", async () => {
      const testId = await publishedTest();
      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const p1 = await placeQuestion(database, testId, q1);

      const { attemptId } = await start(testId, student);
      await answer(attemptId, p1, "a");
      await submit(attemptId, student);

      const comparison = await getComparison(attemptId, student);

      expect(comparison.available).toBe(true);
      expect(comparison.topics).toEqual([]);
      expect(comparison.questions).toEqual([]);
    });

    it("withholds the top scorer's response when showSolutions is false", async () => {
      const testId = await publishedTest({ showSolutions: false });
      const student2 = await createUser(database, "LEARNER");
      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const p1 = await placeQuestion(database, testId, q1);

      const { attemptId: a1 } = await start(testId, student);
      await answer(a1, p1, "a");
      await submit(a1, student);

      const { attemptId: a2 } = await start(testId, student2);
      await answer(a2, p1, "a", student2);
      await submit(a2, student2);

      const comparison = await getComparison(a1, student);
      for (const q of comparison.questions) {
        expect(q.topResponse).toBeNull();
      }
    });

    it("returns 409 when the test defines a close time and it has not passed", async () => {
      const closesAt = new Date(clock.now().getTime() + 60 * 60_000);
      const testId = await publishedTest({ closesAt });
      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const p1 = await placeQuestion(database, testId, q1);

      const { attemptId } = await start(testId, student);
      await answer(attemptId, p1, "a");
      await submit(attemptId, student);

      await getComparison(attemptId, student, 409);
    });

    it("comparison becomes available after the test closes", async () => {
      const closesAt = new Date(clock.now().getTime() + 60 * 60_000);
      const testId = await publishedTest({ closesAt });
      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const p1 = await placeQuestion(database, testId, q1);

      const { attemptId } = await start(testId, student);
      await answer(attemptId, p1, "a");
      await submit(attemptId, student);

      clock.advance(61 * 60_000);
      const comparison = await getComparison(attemptId, student, 200);

      expect(comparison.available).toBe(true);
    });

    it("names no student in the comparison response", async () => {
      const testId = await publishedTest();
      const student2 = await createUser(database, "LEARNER");
      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const p1 = await placeQuestion(database, testId, q1);

      const { attemptId: a1 } = await start(testId, student);
      await answer(a1, p1, "a");
      await submit(a1, student);

      const { attemptId: a2 } = await start(testId, student2);
      await answer(a2, p1, "a", student2);
      await submit(a2, student2);

      const comparison = await getComparison(a1, student);
      const raw = JSON.stringify(comparison);

      expect(raw).not.toContain(student2.userId);
      expect(raw).not.toContain(student2.email);
    });
  });
});
