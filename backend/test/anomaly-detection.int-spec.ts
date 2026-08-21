import { INestApplication } from "@nestjs/common";
import * as request from "supertest";

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from "./support/test-database";
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

interface AnomalyFlag {
  flagId: string;
  attemptId: string;
  testId: string;
  userId: string;
  kind: string;
  reason: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

describe("anomaly detection", () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
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
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, admin.userId);
  });

  async function publishedTest(): Promise<string> {
    return createTest(database, admin.userId, {
      publishedAt: clock.now(),
      durationMinutes: 240,
    });
  }

  async function startAttempt(testId: string, actor: TestActor): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .post(`/assessment/tests/${testId}/attempts`)
      .set(...authHeader(app, actor))
      .expect(201);
    return (body as { attemptId: string }).attemptId;
  }

  async function focusQuestion(
    attemptId: string,
    placementId: string,
    actor: TestActor,
  ): Promise<void> {
    await request(app.getHttpServer())
      .post(`/assessment/attempts/${attemptId}/focus`)
      .set(...authHeader(app, actor))
      .send({ placementId })
      .expect(201);
  }

  async function answerQuestion(
    attemptId: string,
    placementId: string,
    response: unknown,
    actor: TestActor,
  ): Promise<void> {
    await request(app.getHttpServer())
      .patch(`/assessment/attempts/${attemptId}/answers/${placementId}`)
      .set(...authHeader(app, actor))
      .send({ response })
      .expect(200);
  }

  async function submitAttempt(attemptId: string, actor: TestActor): Promise<void> {
    await request(app.getHttpServer())
      .post(`/assessment/attempts/${attemptId}/submit`)
      .set(...authHeader(app, actor))
      .expect(201);
  }

  async function scan(testId: string): Promise<{ flagged: number }> {
    const { body } = await request(app.getHttpServer())
      .post(`/assessment/integrity/tests/${testId}/scan`)
      .set(...authHeader(app, admin))
      .expect(201);
    return body as { flagged: number };
  }

  async function getFlags(params: {
    testId?: string;
    userId?: string;
  }): Promise<AnomalyFlag[]> {
    const query = new URLSearchParams();
    if (params.testId) query.set("testId", params.testId);
    if (params.userId) query.set("userId", params.userId);
    const { body } = await request(app.getHttpServer())
      .get(`/assessment/integrity/flags?${query.toString()}`)
      .set(...authHeader(app, admin))
      .expect(200);
    return body as AnomalyFlag[];
  }

  async function submitNormalAttempt(
    testId: string,
    actor: TestActor,
    placements: string[],
    responses: unknown[],
    totalSeconds: number,
  ): Promise<string> {
    const attemptId = await startAttempt(testId, actor);
    const perQuestion = Math.floor(totalSeconds / placements.length);
    for (let i = 0; i < placements.length; i++) {
      clock.advance(perQuestion * 1000);
      await answerQuestion(attemptId, placements[i], responses[i], actor);
    }
    await submitAttempt(attemptId, actor);
    return attemptId;
  }

  describe("AC1: submission is never blocked or delayed by detection", () => {
    it("submit completes before any scan runs and returns 201", async () => {
      const testId = await publishedTest();
      const student = await createUser(database, "LEARNER");
      const q = await createQuestion(database, taxonomy, admin.userId);
      await placeQuestion(database, testId, q, { order: 1 });

      const attemptId = await startAttempt(testId, student);
      const submitStart = clock.now().getTime();
      await submitAttempt(attemptId, student);
      const submitEnd = clock.now().getTime();

      expect(submitEnd - submitStart).toBe(0);

      const flagsBefore = await getFlags({ testId });
      expect(flagsBefore).toHaveLength(0);
    });
  });

  describe("AC2: identical sequence and near-identical timings are flagged", () => {
    it("flags both students when they share identical answers and similar total time", async () => {
      const testId = await publishedTest();

      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const q2 = await createQuestion(database, taxonomy, admin.userId);
      const q3 = await createQuestion(database, taxonomy, admin.userId);
      const p1 = await placeQuestion(database, testId, q1, { order: 1 });
      const p2 = await placeQuestion(database, testId, q2, { order: 2 });
      const p3 = await placeQuestion(database, testId, q3, { order: 3 });

      const normal1 = await createUser(database, "LEARNER");
      const normal2 = await createUser(database, "LEARNER");
      const normal3 = await createUser(database, "LEARNER");
      const cheat1 = await createUser(database, "LEARNER");
      const cheat2 = await createUser(database, "LEARNER");

      await submitNormalAttempt(testId, normal1, [p1, p2, p3], ["a", "b", "a"], 600);
      await submitNormalAttempt(testId, normal2, [p1, p2, p3], ["b", "a", "b"], 650);
      await submitNormalAttempt(testId, normal3, [p1, p2, p3], ["a", "a", "b"], 700);

      const cheatAttempt1 = await startAttempt(testId, cheat1);
      clock.advance(100_000);
      await answerQuestion(cheatAttempt1, p1, "a", cheat1);
      clock.advance(120_000);
      await answerQuestion(cheatAttempt1, p2, "a", cheat1);
      clock.advance(110_000);
      await answerQuestion(cheatAttempt1, p3, "a", cheat1);
      await submitAttempt(cheatAttempt1, cheat1);

      const cheatAttempt2 = await startAttempt(testId, cheat2);
      clock.advance(105_000);
      await answerQuestion(cheatAttempt2, p1, "a", cheat2);
      clock.advance(115_000);
      await answerQuestion(cheatAttempt2, p2, "a", cheat2);
      clock.advance(108_000);
      await answerQuestion(cheatAttempt2, p3, "a", cheat2);
      await submitAttempt(cheatAttempt2, cheat2);

      const result = await scan(testId);
      expect(result.flagged).toBeGreaterThan(0);

      const flags = await getFlags({ testId });
      const sequenceFlags = flags.filter((f) => f.kind === "IDENTICAL_SEQUENCE");
      expect(sequenceFlags).toHaveLength(2);

      const flaggedUsers = new Set(sequenceFlags.map((f) => f.userId));
      expect(flaggedUsers.has(cheat1.userId)).toBe(true);
      expect(flaggedUsers.has(cheat2.userId)).toBe(true);

      expect(flaggedUsers.has(normal1.userId)).toBe(false);
      expect(flaggedUsers.has(normal2.userId)).toBe(false);
      expect(flaggedUsers.has(normal3.userId)).toBe(false);
    });

    it("does not flag students with identical answers but very different timings", async () => {
      const testId = await publishedTest();

      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const q2 = await createQuestion(database, taxonomy, admin.userId);
      const p1 = await placeQuestion(database, testId, q1, { order: 1 });
      const p2 = await placeQuestion(database, testId, q2, { order: 2 });

      const s1 = await createUser(database, "LEARNER");
      const s2 = await createUser(database, "LEARNER");
      const s3 = await createUser(database, "LEARNER");

      await submitNormalAttempt(testId, s1, [p1, p2], ["b", "c"], 500);
      await submitNormalAttempt(testId, s2, [p1, p2], ["b", "c"], 600);

      const fast = await startAttempt(testId, s3);
      clock.advance(10_000);
      await answerQuestion(fast, p1, "b", s3);
      clock.advance(10_000);
      await answerQuestion(fast, p2, "c", s3);
      await submitAttempt(fast, s3);

      const result = await scan(testId);

      const flags = await getFlags({ testId });
      const sequenceFlags = flags.filter((f) => f.kind === "IDENTICAL_SEQUENCE");

      const slowPairFlagged = sequenceFlags.some(
        (f) => f.userId === s3.userId,
      );
      expect(slowPairFlagged).toBe(false);
      expect(result).toBeDefined();
    });
  });

  describe("AC3: fast but plausible attempt is not flagged", () => {
    it("does not flag a fast student whose time is above the threshold", async () => {
      const testId = await publishedTest();

      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const q2 = await createQuestion(database, taxonomy, admin.userId);
      const p1 = await placeQuestion(database, testId, q1, { order: 1, marks: "4" });
      const p2 = await placeQuestion(database, testId, q2, { order: 2, marks: "4" });

      const normal1 = await createUser(database, "LEARNER");
      const normal2 = await createUser(database, "LEARNER");
      const normal3 = await createUser(database, "LEARNER");
      const normal4 = await createUser(database, "LEARNER");
      const plausibleFast = await createUser(database, "LEARNER");
      const suspicious = await createUser(database, "LEARNER");

      await submitNormalAttempt(testId, normal1, [p1, p2], ["a", "a"], 600);
      await submitNormalAttempt(testId, normal2, [p1, p2], ["a", "a"], 650);
      await submitNormalAttempt(testId, normal3, [p1, p2], ["a", "a"], 700);
      await submitNormalAttempt(testId, normal4, [p1, p2], ["a", "a"], 750);

      const plausibleAttempt = await startAttempt(testId, plausibleFast);
      clock.advance(220_000);
      await answerQuestion(plausibleAttempt, p1, "a", plausibleFast);
      clock.advance(220_000);
      await answerQuestion(plausibleAttempt, p2, "a", plausibleFast);
      await submitAttempt(plausibleAttempt, plausibleFast);

      const suspiciousAttempt = await startAttempt(testId, suspicious);
      clock.advance(30_000);
      await answerQuestion(suspiciousAttempt, p1, "a", suspicious);
      clock.advance(30_000);
      await answerQuestion(suspiciousAttempt, p2, "a", suspicious);
      await submitAttempt(suspiciousAttempt, suspicious);

      await scan(testId);

      const flags = await getFlags({ testId });
      const timingFlags = flags.filter((f) => f.kind === "TIMING_OUTLIER");

      expect(timingFlags.some((f) => f.userId === plausibleFast.userId)).toBe(false);
      expect(timingFlags.some((f) => f.userId === suspicious.userId)).toBe(true);
    });

    it("does not flag at all when the cohort is too small", async () => {
      const testId = await publishedTest();
      const q = await createQuestion(database, taxonomy, admin.userId);
      const p = await placeQuestion(database, testId, q, { order: 1 });

      const s1 = await createUser(database, "LEARNER");
      const s2 = await createUser(database, "LEARNER");

      await submitNormalAttempt(testId, s1, [p], ["a"], 300);
      await submitNormalAttempt(testId, s2, [p], ["a"], 10);

      const result = await scan(testId);
      expect(result.flagged).toBe(0);
    });
  });

  describe("AC4: flags are visible only to staff", () => {
    it("returns 403 when a student tries to read flags", async () => {
      const testId = await publishedTest();
      const student = await createUser(database, "LEARNER");

      await request(app.getHttpServer())
        .get(`/assessment/integrity/flags?testId=${testId}`)
        .set(...authHeader(app, student))
        .expect(403);
    });

    it("returns 403 when a student tries to trigger a scan", async () => {
      const testId = await publishedTest();
      const student = await createUser(database, "LEARNER");

      await request(app.getHttpServer())
        .post(`/assessment/integrity/tests/${testId}/scan`)
        .set(...authHeader(app, student))
        .expect(403);
    });

    it("student attempt response does not include any flag information", async () => {
      const testId = await publishedTest();
      const student = await createUser(database, "LEARNER");
      const q = await createQuestion(database, taxonomy, admin.userId);
      await placeQuestion(database, testId, q, { order: 1 });

      const attemptId = await startAttempt(testId, student);
      await submitAttempt(attemptId, student);

      const { body } = await request(app.getHttpServer())
        .get(`/assessment/attempts/${attemptId}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(body).not.toHaveProperty("flags");
      expect(body).not.toHaveProperty("anomaly");
      expect(body).not.toHaveProperty("flagged");
    });

    it("admin can read flags filtered by testId", async () => {
      const testId = await publishedTest();

      const q = await createQuestion(database, taxonomy, admin.userId);
      const p = await placeQuestion(database, testId, q, { order: 1 });

      const s1 = await createUser(database, "LEARNER");
      const s2 = await createUser(database, "LEARNER");
      const s3 = await createUser(database, "LEARNER");

      await submitNormalAttempt(testId, s1, [p], ["a"], 600);
      await submitNormalAttempt(testId, s2, [p], ["a"], 620);
      await submitNormalAttempt(testId, s3, [p], ["a"], 5);

      await scan(testId);

      const flags = await getFlags({ testId });
      expect(Array.isArray(flags)).toBe(true);
    });
  });

  describe("AC5: a flag records why it fired", () => {
    it("each flag has a non-empty reason and a detail object", async () => {
      const testId = await publishedTest();

      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const q2 = await createQuestion(database, taxonomy, admin.userId);
      const p1 = await placeQuestion(database, testId, q1, { order: 1, marks: "4" });
      const p2 = await placeQuestion(database, testId, q2, { order: 2, marks: "4" });

      const s1 = await createUser(database, "LEARNER");
      const s2 = await createUser(database, "LEARNER");
      const s3 = await createUser(database, "LEARNER");
      const s4 = await createUser(database, "LEARNER");

      await submitNormalAttempt(testId, s1, [p1, p2], ["a", "a"], 600);
      await submitNormalAttempt(testId, s2, [p1, p2], ["b", "b"], 640);
      await submitNormalAttempt(testId, s3, [p1, p2], ["a", "b"], 650);

      const suspiciousAttempt = await startAttempt(testId, s4);
      clock.advance(20_000);
      await answerQuestion(suspiciousAttempt, p1, "a", s4);
      clock.advance(20_000);
      await answerQuestion(suspiciousAttempt, p2, "a", s4);
      await submitAttempt(suspiciousAttempt, s4);

      await scan(testId);

      const flags = await getFlags({ testId });
      expect(flags.length).toBeGreaterThan(0);

      for (const flag of flags) {
        expect(typeof flag.reason).toBe("string");
        expect(flag.reason.length).toBeGreaterThan(0);
        expect(typeof flag.detail).toBe("object");
        expect(flag.detail).not.toBeNull();
        expect(Object.keys(flag.detail).length).toBeGreaterThan(0);
      }
    });

    it("a TIMING_OUTLIER flag includes cohort context in its detail", async () => {
      const testId = await publishedTest();

      const q = await createQuestion(database, taxonomy, admin.userId);
      const p = await placeQuestion(database, testId, q, { order: 1, marks: "4" });

      const s1 = await createUser(database, "LEARNER");
      const s2 = await createUser(database, "LEARNER");
      const s3 = await createUser(database, "LEARNER");
      const outlier = await createUser(database, "LEARNER");

      await submitNormalAttempt(testId, s1, [p], ["a"], 600);
      await submitNormalAttempt(testId, s2, [p], ["a"], 650);
      await submitNormalAttempt(testId, s3, [p], ["a"], 700);

      const outlierAttempt = await startAttempt(testId, outlier);
      clock.advance(30_000);
      await answerQuestion(outlierAttempt, p, "a", outlier);
      await submitAttempt(outlierAttempt, outlier);

      await scan(testId);

      const flags = await getFlags({ userId: outlier.userId });
      const timingFlag = flags.find((f) => f.kind === "TIMING_OUTLIER");
      expect(timingFlag).toBeDefined();
      if (timingFlag) {
        expect(timingFlag.detail).toHaveProperty("totalElapsedSeconds");
        expect(timingFlag.detail).toHaveProperty("cohortMedianSeconds");
        expect(timingFlag.detail).toHaveProperty("thresholdSeconds");
        expect(timingFlag.detail).toHaveProperty("cohortSize");
        expect(timingFlag.detail.cohortSize).toBe(4);
      }
    });

    it("an IDENTICAL_SEQUENCE flag identifies the matched partners in detail", async () => {
      const testId = await publishedTest();

      const q1 = await createQuestion(database, taxonomy, admin.userId);
      const q2 = await createQuestion(database, taxonomy, admin.userId);
      const p1 = await placeQuestion(database, testId, q1, { order: 1 });
      const p2 = await placeQuestion(database, testId, q2, { order: 2 });

      const normal1 = await createUser(database, "LEARNER");
      const normal2 = await createUser(database, "LEARNER");
      const normal3 = await createUser(database, "LEARNER");
      const cheat1 = await createUser(database, "LEARNER");
      const cheat2 = await createUser(database, "LEARNER");

      await submitNormalAttempt(testId, normal1, [p1, p2], ["b", "b"], 600);
      await submitNormalAttempt(testId, normal2, [p1, p2], ["a", "b"], 640);
      await submitNormalAttempt(testId, normal3, [p1, p2], ["b", "a"], 650);

      const ca1 = await startAttempt(testId, cheat1);
      clock.advance(100_000);
      await answerQuestion(ca1, p1, "a", cheat1);
      clock.advance(100_000);
      await answerQuestion(ca1, p2, "a", cheat1);
      await submitAttempt(ca1, cheat1);

      const ca2 = await startAttempt(testId, cheat2);
      clock.advance(98_000);
      await answerQuestion(ca2, p1, "a", cheat2);
      clock.advance(102_000);
      await answerQuestion(ca2, p2, "a", cheat2);
      await submitAttempt(ca2, cheat2);

      await scan(testId);

      const flags = await getFlags({ userId: cheat1.userId });
      const seqFlag = flags.find((f) => f.kind === "IDENTICAL_SEQUENCE");
      expect(seqFlag).toBeDefined();
      if (seqFlag) {
        expect(seqFlag.detail).toHaveProperty("matchedWithUsers");
        expect(Array.isArray(seqFlag.detail.matchedWithUsers)).toBe(true);
        expect(
          (seqFlag.detail.matchedWithUsers as string[]).includes(cheat2.userId),
        ).toBe(true);
      }
    });
  });

  describe("idempotency: rescanning does not duplicate flags", () => {
    it("running scan twice produces the same flags without duplicates", async () => {
      const testId = await publishedTest();

      const q = await createQuestion(database, taxonomy, admin.userId);
      const p = await placeQuestion(database, testId, q, { order: 1, marks: "4" });

      const s1 = await createUser(database, "LEARNER");
      const s2 = await createUser(database, "LEARNER");
      const s3 = await createUser(database, "LEARNER");
      const outlier = await createUser(database, "LEARNER");

      await submitNormalAttempt(testId, s1, [p], ["a"], 600);
      await submitNormalAttempt(testId, s2, [p], ["a"], 650);
      await submitNormalAttempt(testId, s3, [p], ["a"], 700);

      const outlierAttempt = await startAttempt(testId, outlier);
      clock.advance(25_000);
      await answerQuestion(outlierAttempt, p, "a", outlier);
      await submitAttempt(outlierAttempt, outlier);

      const first = await scan(testId);
      const second = await scan(testId);

      const allFlags = await getFlags({ testId });

      expect(second.flagged).toBe(0);
      const outlierFlags = allFlags.filter(
        (f) => f.userId === outlier.userId && f.kind === "TIMING_OUTLIER",
      );
      expect(outlierFlags).toHaveLength(1);
      expect(first.flagged).toBeGreaterThan(0);
    });
  });
});
