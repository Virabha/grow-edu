import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { and, eq } from "drizzle-orm";

import { assessmentAttemptAnswers, assessmentAttempts } from "../src/database/schema";
import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from "./support/test-database";
import { createTestApp, authHeader, TestActor } from "./support/test-app";
import { TestClock } from "./support/test-clock";
import {
  createUser,
  createBatch,
  assignInstructor,
  enrol,
} from "./support/factories";
import {
  createTest,
  createQuestion,
  createTaxonomy,
  placeQuestion,
  seedDifficultyScale,
  Taxonomy,
} from "./support/assessment-factories";

describe("regrade (tickets 29-30)", () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let instructor: TestActor;
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
    instructor = await createUser(database, "INSTRUCTOR");
    student = await createUser(database, "LEARNER");
    await seedDifficultyScale(database);
    taxonomy = await createTaxonomy(database, admin.userId);
  });

  async function setupGradedAnswer(
    instructorActor: TestActor = instructor,
    studentActor: TestActor = student,
  ) {
    const batchId = await createBatch(database, admin.userId);
    await assignInstructor(database, batchId, instructorActor.userId);
    await enrol(database, batchId, studentActor.userId);

    const testId = await createTest(database, admin.userId, {
      batchId,
      publishedAt: clock.now(),
      durationMinutes: 120,
    });
    const questionId = await createQuestion(database, taxonomy, admin.userId, {
      type: "WRITTEN",
    });
    const placementId = await placeQuestion(database, testId, questionId, {
      marks: "10",
    });

    const { body: attempt } = await request(app.getHttpServer())
      .post(`/assessment/tests/${testId}/attempts`)
      .set(...authHeader(app, studentActor))
      .expect(201);

    await request(app.getHttpServer())
      .patch(
        `/assessment/attempts/${attempt.attemptId}/answers/${placementId}`,
      )
      .set(...authHeader(app, studentActor))
      .send({ response: "My written answer." })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/assessment/attempts/${attempt.attemptId}/submit`)
      .set(...authHeader(app, studentActor))
      .expect(201);

    const [answer] = await database.db
      .select()
      .from(assessmentAttemptAnswers)
      .where(
        and(
          eq(assessmentAttemptAnswers.attemptId, attempt.attemptId),
          eq(assessmentAttemptAnswers.placementId, placementId),
        ),
      )
      .limit(1);

    await request(app.getHttpServer())
      .post(`/assessment/grading/answers/${answer.answerId}/grade`)
      .set(...authHeader(app, instructorActor))
      .send({ totalMarks: 7, comment: "Good effort" })
      .expect(201);

    return {
      batchId,
      testId,
      placementId,
      attemptId: attempt.attemptId,
      answerId: answer.answerId,
    };
  }

  describe("ticket 29: regrade request", () => {
    it("a student opens a regrade request with a reason", async () => {
      const { answerId } = await setupGradedAnswer();

      const { body } = await request(app.getHttpServer())
        .post("/assessment/regrade")
        .set(...authHeader(app, student))
        .send({
          answerId,
          reason: "I believe my answer deserved more marks.",
        })
        .expect(201);

      expect(body.requestId).toBeTruthy();
      expect(body.reason).toBe("I believe my answer deserved more marks.");
      expect(body.status).toBe("OPEN");
      expect(body.originalMarks).toBe("7.00");
    });

    it("refuses a regrade request against an ungraded answer", async () => {
      const batchId = await createBatch(database, admin.userId);
      await assignInstructor(database, batchId, instructor.userId);
      await enrol(database, batchId, student.userId);

      const testId = await createTest(database, admin.userId, {
        batchId,
        publishedAt: clock.now(),
        durationMinutes: 120,
      });
      const questionId = await createQuestion(database, taxonomy, admin.userId, {
        type: "WRITTEN",
      });
      const placementId = await placeQuestion(database, testId, questionId, {
        marks: "10",
      });

      const { body: attempt } = await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/attempts`)
        .set(...authHeader(app, student))
        .expect(201);

      await request(app.getHttpServer())
        .patch(
          `/assessment/attempts/${attempt.attemptId}/answers/${placementId}`,
        )
        .set(...authHeader(app, student))
        .send({ response: "My answer." })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/assessment/attempts/${attempt.attemptId}/submit`)
        .set(...authHeader(app, student))
        .expect(201);

      const [answer] = await database.db
        .select()
        .from(assessmentAttemptAnswers)
        .where(
          and(
            eq(assessmentAttemptAnswers.attemptId, attempt.attemptId),
            eq(assessmentAttemptAnswers.placementId, placementId),
          ),
        )
        .limit(1);

      await request(app.getHttpServer())
        .post("/assessment/regrade")
        .set(...authHeader(app, student))
        .send({ answerId: answer.answerId, reason: "Please review." })
        .expect(400);
    });

    it("prevents opening two open requests against the same answer", async () => {
      const { answerId } = await setupGradedAnswer();

      await request(app.getHttpServer())
        .post("/assessment/regrade")
        .set(...authHeader(app, student))
        .send({ answerId, reason: "First request." })
        .expect(201);

      await request(app.getHttpServer())
        .post("/assessment/regrade")
        .set(...authHeader(app, student))
        .send({ answerId, reason: "Second request." })
        .expect(409);
    });

    it("requests appear in the instructor queue scoped to their batches", async () => {
      const { answerId } = await setupGradedAnswer();

      await request(app.getHttpServer())
        .post("/assessment/regrade")
        .set(...authHeader(app, student))
        .send({ answerId, reason: "Please review." })
        .expect(201);

      const { body: queue } = await request(app.getHttpServer())
        .get("/assessment/regrade/queue")
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(queue).toHaveLength(1);
      expect(queue[0].answerId).toBe(answerId);
    });

    it("does not show requests from other instructors' batches", async () => {
      const otherInstructor = await createUser(database, "INSTRUCTOR");
      const { answerId } = await setupGradedAnswer();

      await request(app.getHttpServer())
        .post("/assessment/regrade")
        .set(...authHeader(app, student))
        .send({ answerId, reason: "Please review." })
        .expect(201);

      const { body: queue } = await request(app.getHttpServer())
        .get("/assessment/regrade/queue")
        .set(...authHeader(app, otherInstructor))
        .expect(200);

      expect(queue).toHaveLength(0);
    });
  });

  describe("ticket 30: regrade review and outcome", () => {
    it("resolves a request and records the outcome", async () => {
      const { answerId } = await setupGradedAnswer();

      const { body: reqBody } = await request(app.getHttpServer())
        .post("/assessment/regrade")
        .set(...authHeader(app, student))
        .send({ answerId, reason: "Deserved more." })
        .expect(201);

      const { body: resolved } = await request(app.getHttpServer())
        .post(`/assessment/regrade/${reqBody.requestId}/resolve`)
        .set(...authHeader(app, instructor))
        .send({
          resolvedMarks: 9,
          justification: "On review, the answer is more complete than scored.",
        })
        .expect(201);

      expect(resolved.status).toBe("CHANGED");
      expect(resolved.resolvedMarks).toBe("9.00");
      expect(resolved.justification).toBe(
        "On review, the answer is more complete than scored.",
      );
      expect(resolved.resolvedBy).toBe(instructor.userId);
      expect(resolved.resolvedAt).not.toBeNull();
    });

    it("retains the original mark after a change", async () => {
      const { answerId } = await setupGradedAnswer();

      const { body: reqBody } = await request(app.getHttpServer())
        .post("/assessment/regrade")
        .set(...authHeader(app, student))
        .send({ answerId, reason: "Deserved more." })
        .expect(201);

      const { body: resolved } = await request(app.getHttpServer())
        .post(`/assessment/regrade/${reqBody.requestId}/resolve`)
        .set(...authHeader(app, instructor))
        .send({ resolvedMarks: 9, justification: "Better than scored." })
        .expect(201);

      expect(resolved.originalMarks).toBe("7.00");
      expect(resolved.resolvedMarks).toBe("9.00");
    });

    it("refuses to change a mark without a justification", async () => {
      const { answerId } = await setupGradedAnswer();

      const { body: reqBody } = await request(app.getHttpServer())
        .post("/assessment/regrade")
        .set(...authHeader(app, student))
        .send({ answerId, reason: "Deserved more." })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/regrade/${reqBody.requestId}/resolve`)
        .set(...authHeader(app, instructor))
        .send({ resolvedMarks: 9, justification: "" })
        .expect(400);
    });

    it("recomputes the attempt total when the mark changes", async () => {
      const batchId = await createBatch(database, admin.userId);
      await assignInstructor(database, batchId, instructor.userId);
      await enrol(database, batchId, student.userId);

      const testId = await createTest(database, admin.userId, {
        batchId,
        publishedAt: clock.now(),
        durationMinutes: 120,
      });

      const objQ = await createQuestion(database, taxonomy, admin.userId);
      const writQ = await createQuestion(database, taxonomy, admin.userId, {
        type: "WRITTEN",
      });

      const objP = await placeQuestion(database, testId, objQ, {
        order: 1,
        marks: "4",
      });
      const writP = await placeQuestion(database, testId, writQ, {
        order: 2,
        marks: "10",
      });

      const { body: attempt } = await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/attempts`)
        .set(...authHeader(app, student))
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/assessment/attempts/${attempt.attemptId}/answers/${objP}`)
        .set(...authHeader(app, student))
        .send({ response: "a" })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/assessment/attempts/${attempt.attemptId}/answers/${writP}`)
        .set(...authHeader(app, student))
        .send({ response: "My essay." })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/assessment/attempts/${attempt.attemptId}/submit`)
        .set(...authHeader(app, student))
        .expect(201);

      const [writAnswer] = await database.db
        .select()
        .from(assessmentAttemptAnswers)
        .where(
          and(
            eq(assessmentAttemptAnswers.attemptId, attempt.attemptId),
            eq(assessmentAttemptAnswers.placementId, writP),
          ),
        )
        .limit(1);

      await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${writAnswer.answerId}/grade`)
        .set(...authHeader(app, instructor))
        .send({ totalMarks: 7 })
        .expect(201);

      const { body: beforeRegrade } = await request(app.getHttpServer())
        .get(`/assessment/attempts/${attempt.attemptId}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(beforeRegrade.finalScore).toBe(11);

      const { body: reqBody } = await request(app.getHttpServer())
        .post("/assessment/regrade")
        .set(...authHeader(app, student))
        .send({ answerId: writAnswer.answerId, reason: "Should be more." })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/regrade/${reqBody.requestId}/resolve`)
        .set(...authHeader(app, instructor))
        .send({ resolvedMarks: 9, justification: "Correct on review." })
        .expect(201);

      const { body: afterRegrade } = await request(app.getHttpServer())
        .get(`/assessment/attempts/${attempt.attemptId}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(afterRegrade.finalScore).toBe(13);
    });

    it("records the regrade in the audit log", async () => {
      const { answerId } = await setupGradedAnswer();

      const { body: reqBody } = await request(app.getHttpServer())
        .post("/assessment/regrade")
        .set(...authHeader(app, student))
        .send({ answerId, reason: "Please review." })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/regrade/${reqBody.requestId}/resolve`)
        .set(...authHeader(app, instructor))
        .send({ resolvedMarks: 7, justification: "Mark upheld." })
        .expect(201);

      const { auditLog } = await import("../src/database/schema");
      const entries = await database.db
        .select()
        .from(auditLog)
        .where(
          and(
            eq(auditLog.action, "REGRADE_RESOLVED"),
            eq(auditLog.targetId, reqBody.requestId),
          ),
        );

      expect(entries).toHaveLength(1);
      expect(entries[0].targetType).toBe("regrade_request");
    });

    it("upholds when mark is unchanged without requiring justification change", async () => {
      const { answerId } = await setupGradedAnswer();

      const { body: reqBody } = await request(app.getHttpServer())
        .post("/assessment/regrade")
        .set(...authHeader(app, student))
        .send({ answerId, reason: "Disagree." })
        .expect(201);

      const { body: resolved } = await request(app.getHttpServer())
        .post(`/assessment/regrade/${reqBody.requestId}/resolve`)
        .set(...authHeader(app, instructor))
        .send({ resolvedMarks: 7, justification: "Mark is correct." })
        .expect(201);

      expect(resolved.status).toBe("UPHELD");
      expect(resolved.resolvedMarks).toBe("7.00");
    });
  });
});
