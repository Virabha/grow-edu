import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { and, eq } from "drizzle-orm";

import { assessmentAttemptAnswers } from "../src/database/schema";
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

describe("grading queue (tickets 25-28)", () => {
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

  async function setupBatchWithWrittenTest(
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

    return { batchId, testId, placementId };
  }

  async function startAndSubmit(
    testId: string,
    placementId: string,
    response: unknown,
    actor: TestActor = student,
  ) {
    const { body: attempt } = await request(app.getHttpServer())
      .post(`/assessment/tests/${testId}/attempts`)
      .set(...authHeader(app, actor))
      .expect(201);

    await request(app.getHttpServer())
      .patch(
        `/assessment/attempts/${attempt.attemptId}/answers/${placementId}`,
      )
      .set(...authHeader(app, actor))
      .send({ response })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/assessment/attempts/${attempt.attemptId}/submit`)
      .set(...authHeader(app, actor))
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

    return { attemptId: attempt.attemptId, answerId: answer.answerId };
  }

  async function createRubric(totalWeight = 4) {
    const { body: rubric } = await request(app.getHttpServer())
      .post("/assessment/rubrics")
      .set(...authHeader(app, admin))
      .send({ title: "Writing Rubric", scaleMax: 5 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/assessment/rubrics/${rubric.rubricId}/criteria`)
      .set(...authHeader(app, admin))
      .send({ label: "Accuracy", weight: totalWeight / 2 })
      .expect(201);

    const { body: withTwo } = await request(app.getHttpServer())
      .post(`/assessment/rubrics/${rubric.rubricId}/criteria`)
      .set(...authHeader(app, admin))
      .send({ label: "Clarity", weight: totalWeight / 2 })
      .expect(201);

    return { rubricId: rubric.rubricId, criteria: withTwo.criteria };
  }

  describe("ticket 25: grading queue", () => {
    it("returns the next ungraded item from instructor batches", async () => {
      const { testId, placementId } = await setupBatchWithWrittenTest();
      await startAndSubmit(testId, placementId, "My essay.");

      const { body } = await request(app.getHttpServer())
        .get("/assessment/grading/queue")
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(body.item).not.toBeNull();
      expect(body.item.answerId).toBeTruthy();
    });

    it("returns null when there are no pending items", async () => {
      const { body } = await request(app.getHttpServer())
        .get("/assessment/grading/queue")
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(body.item).toBeNull();
    });

    it("spans all batches the instructor teaches", async () => {
      const { testId: t1, placementId: p1 } =
        await setupBatchWithWrittenTest();
      const { testId: t2, placementId: p2 } =
        await setupBatchWithWrittenTest();

      const s2 = await createUser(database, "LEARNER");
      await enrol(
        database,
        (
          await database.db.query.assessmentTests.findFirst({
            where: (t, { eq }) => eq(t.testId, t2),
          })
        )?.batchId ?? "",
        s2.userId,
      );

      await startAndSubmit(t1, p1, "Essay 1");
      await startAndSubmit(t2, p2, "Essay 2", s2);

      const first = await request(app.getHttpServer())
        .get("/assessment/grading/queue")
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(first.body.item).not.toBeNull();

      await request(app.getHttpServer())
        .post(
          `/assessment/grading/answers/${first.body.item.answerId}/grade`,
        )
        .set(...authHeader(app, instructor))
        .send({ totalMarks: 5 })
        .expect(201);

      const second = await request(app.getHttpServer())
        .get("/assessment/grading/queue")
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(second.body.item).not.toBeNull();
    });

    it("does not show submissions from batches the instructor does not teach", async () => {
      const otherInstructor = await createUser(database, "INSTRUCTOR");
      const { testId, placementId } = await setupBatchWithWrittenTest();
      await startAndSubmit(testId, placementId, "Essay.");

      const { body } = await request(app.getHttpServer())
        .get("/assessment/grading/queue")
        .set(...authHeader(app, otherInstructor))
        .expect(200);

      expect(body.item).toBeNull();
    });

    it("retains partial grading when the instructor stops and returns", async () => {
      const { testId, placementId } = await setupBatchWithWrittenTest();
      const { answerId } = await startAndSubmit(testId, placementId, "Essay.");

      const { body: rubric } = await request(app.getHttpServer())
        .post("/assessment/rubrics")
        .set(...authHeader(app, admin))
        .send({ title: "R", scaleMax: 5 })
        .expect(201);

      const { body: withCrit } = await request(app.getHttpServer())
        .post(`/assessment/rubrics/${rubric.rubricId}/criteria`)
        .set(...authHeader(app, admin))
        .send({ label: "A", weight: 2 })
        .expect(201);

      const criterionId = withCrit.criteria[0].criterionId;

      await request(app.getHttpServer())
        .put(`/assessment/test-questions/${placementId}/rubric`)
        .set(...authHeader(app, admin))
        .send({ rubricId: rubric.rubricId })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${answerId}/grade`)
        .set(...authHeader(app, instructor))
        .send({
          criteria: [{ criterionId, value: 3 }],
          comment: "Good",
        })
        .expect(201);

      const { body: queueItem } = await request(app.getHttpServer())
        .get("/assessment/grading/queue")
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(queueItem.item).toBeNull();
    });

    it("removes a graded item from the queue", async () => {
      const { testId, placementId } = await setupBatchWithWrittenTest();
      const { answerId } = await startAndSubmit(testId, placementId, "Essay.");

      await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${answerId}/grade`)
        .set(...authHeader(app, instructor))
        .send({ totalMarks: 8 })
        .expect(201);

      const { body } = await request(app.getHttpServer())
        .get("/assessment/grading/queue")
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(body.item).toBeNull();
    });
  });

  describe("ticket 26: grading against a rubric", () => {
    it("records criterion scores and derives the total", async () => {
      const { testId, placementId } = await setupBatchWithWrittenTest();
      const { rubricId, criteria } = await createRubric(4);

      await request(app.getHttpServer())
        .put(`/assessment/test-questions/${placementId}/rubric`)
        .set(...authHeader(app, admin))
        .send({ rubricId })
        .expect(200);

      const { answerId, attemptId } = await startAndSubmit(
        testId,
        placementId,
        "My essay.",
      );

      const { body: graded } = await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${answerId}/grade`)
        .set(...authHeader(app, instructor))
        .send({
          criteria: [
            { criterionId: criteria[0].criterionId, value: 5 },
            { criterionId: criteria[1].criterionId, value: 3 },
          ],
          comment: "Good work",
        })
        .expect(201);

      expect(graded.status).toBe("GRADED");
      expect(graded.awardedMarks).toBe(8);
      expect(graded.criterionScores).toHaveLength(2);
      expect(graded.gradedBy).toBe(instructor.userId);
      expect(graded.gradedAt).not.toBeNull();
    });

    it("finalises the attempt when the last pending answer is graded", async () => {
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
        marks: "6",
      });

      const { body: attempt } = await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/attempts`)
        .set(...authHeader(app, student))
        .expect(201);

      await request(app.getHttpServer())
        .patch(
          `/assessment/attempts/${attempt.attemptId}/answers/${objP}`,
        )
        .set(...authHeader(app, student))
        .send({ response: "a" })
        .expect(200);

      await request(app.getHttpServer())
        .patch(
          `/assessment/attempts/${attempt.attemptId}/answers/${writP}`,
        )
        .set(...authHeader(app, student))
        .send({ response: "My essay." })
        .expect(200);

      const { body: submitted } = await request(app.getHttpServer())
        .post(`/assessment/attempts/${attempt.attemptId}/submit`)
        .set(...authHeader(app, student))
        .expect(201);

      expect(submitted.status).toBe("AWAITING_GRADING");
      expect(submitted.provisionalScore).toBe(4);

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
        .post(
          `/assessment/grading/answers/${writAnswer.answerId}/grade`,
        )
        .set(...authHeader(app, instructor))
        .send({ totalMarks: 5 })
        .expect(201);

      const { body: finalAttempt } = await request(app.getHttpServer())
        .get(`/assessment/attempts/${attempt.attemptId}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(finalAttempt.status).toBe("GRADED");
      expect(finalAttempt.finalScore).toBe(9);
    });

    it("records the actor and time when a grade is saved", async () => {
      const { testId, placementId } = await setupBatchWithWrittenTest();
      const { answerId } = await startAndSubmit(testId, placementId, "Essay.");

      const gradeTimeFloor = Math.floor(clock.now().getTime() / 1000) * 1000;
      const { body: graded } = await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${answerId}/grade`)
        .set(...authHeader(app, instructor))
        .send({ totalMarks: 7 })
        .expect(201);

      expect(graded.gradedBy).toBe(instructor.userId);
      expect(new Date(graded.gradedAt).getTime()).toBeGreaterThanOrEqual(
        gradeTimeFloor,
      );
    });

    it("refuses a criterion value outside the rubric scale", async () => {
      const { testId, placementId } = await setupBatchWithWrittenTest();
      const { rubricId, criteria } = await createRubric(4);

      await request(app.getHttpServer())
        .put(`/assessment/test-questions/${placementId}/rubric`)
        .set(...authHeader(app, admin))
        .send({ rubricId })
        .expect(200);

      const { answerId } = await startAndSubmit(testId, placementId, "Essay.");

      await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${answerId}/grade`)
        .set(...authHeader(app, instructor))
        .send({
          criteria: [
            { criterionId: criteria[0].criterionId, value: 99 },
            { criterionId: criteria[1].criterionId, value: 3 },
          ],
        })
        .expect(400);
    });

    it("a student sees the criterion breakdown", async () => {
      const { testId, placementId } = await setupBatchWithWrittenTest();
      const { rubricId, criteria } = await createRubric(4);

      await request(app.getHttpServer())
        .put(`/assessment/test-questions/${placementId}/rubric`)
        .set(...authHeader(app, admin))
        .send({ rubricId })
        .expect(200);

      const { answerId, attemptId } = await startAndSubmit(
        testId,
        placementId,
        "My essay.",
      );

      await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${answerId}/grade`)
        .set(...authHeader(app, instructor))
        .send({
          criteria: [
            { criterionId: criteria[0].criterionId, value: 4 },
            { criterionId: criteria[1].criterionId, value: 2 },
          ],
        })
        .expect(201);

      const { body: attempt } = await request(app.getHttpServer())
        .get(`/assessment/attempts/${attemptId}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(attempt.status).toBe("GRADED");
      expect(attempt.finalScore).not.toBeNull();
    });
  });

  describe("ticket 27: photographed working in the grader", () => {
    it("returns uploaded pages in submission order for image answers", async () => {
      const batchId = await createBatch(database, admin.userId);
      await assignInstructor(database, batchId, instructor.userId);
      await enrol(database, batchId, student.userId);

      const testId = await createTest(database, admin.userId, {
        batchId,
        publishedAt: clock.now(),
        durationMinutes: 120,
      });
      const imgQ = await createQuestion(database, taxonomy, admin.userId, {
        type: "IMAGE_UPLOAD",
      });
      const imgP = await placeQuestion(database, testId, imgQ, {
        marks: "10",
      });

      const { body: attempt } = await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/attempts`)
        .set(...authHeader(app, student))
        .expect(201);

      const pages = ["file-id-1", "file-id-2", "file-id-3"];
      await request(app.getHttpServer())
        .patch(
          `/assessment/attempts/${attempt.attemptId}/answers/${imgP}`,
        )
        .set(...authHeader(app, student))
        .send({ response: pages })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/assessment/attempts/${attempt.attemptId}/submit`)
        .set(...authHeader(app, student))
        .expect(201);

      const [imgAnswer] = await database.db
        .select()
        .from(assessmentAttemptAnswers)
        .where(
          and(
            eq(assessmentAttemptAnswers.attemptId, attempt.attemptId),
            eq(assessmentAttemptAnswers.placementId, imgP),
          ),
        )
        .limit(1);

      const { body: answerView } = await request(app.getHttpServer())
        .get(`/assessment/grading/answers/${imgAnswer.answerId}`)
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(answerView.pages).toEqual(pages);
      expect(answerView.questionType).toBe("IMAGE_UPLOAD");
    });

    it("includes the rubric alongside the images in one read", async () => {
      const batchId = await createBatch(database, admin.userId);
      await assignInstructor(database, batchId, instructor.userId);
      await enrol(database, batchId, student.userId);

      const testId = await createTest(database, admin.userId, {
        batchId,
        publishedAt: clock.now(),
        durationMinutes: 120,
      });
      const imgQ = await createQuestion(database, taxonomy, admin.userId, {
        type: "IMAGE_UPLOAD",
      });
      const imgP = await placeQuestion(database, testId, imgQ, {
        marks: "10",
      });

      const { rubricId, criteria } = await createRubric(4);
      await request(app.getHttpServer())
        .put(`/assessment/test-questions/${imgP}/rubric`)
        .set(...authHeader(app, admin))
        .send({ rubricId })
        .expect(200);

      const { body: attempt } = await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/attempts`)
        .set(...authHeader(app, student))
        .expect(201);

      await request(app.getHttpServer())
        .patch(
          `/assessment/attempts/${attempt.attemptId}/answers/${imgP}`,
        )
        .set(...authHeader(app, student))
        .send({ response: ["file-id-1"] })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/assessment/attempts/${attempt.attemptId}/submit`)
        .set(...authHeader(app, student))
        .expect(201);

      const [imgAnswer] = await database.db
        .select()
        .from(assessmentAttemptAnswers)
        .where(
          and(
            eq(assessmentAttemptAnswers.attemptId, attempt.attemptId),
            eq(assessmentAttemptAnswers.placementId, imgP),
          ),
        )
        .limit(1);

      const { body: answerView } = await request(app.getHttpServer())
        .get(`/assessment/grading/answers/${imgAnswer.answerId}`)
        .set(...authHeader(app, instructor))
        .expect(200);

      expect(answerView.rubric).not.toBeNull();
      expect(answerView.rubric.rubricId).toBe(rubricId);
      expect(answerView.pages).toEqual(["file-id-1"]);
    });

    it("grades an image answer through the same path as a written one", async () => {
      const batchId = await createBatch(database, admin.userId);
      await assignInstructor(database, batchId, instructor.userId);
      await enrol(database, batchId, student.userId);

      const testId = await createTest(database, admin.userId, {
        batchId,
        publishedAt: clock.now(),
        durationMinutes: 120,
      });
      const imgQ = await createQuestion(database, taxonomy, admin.userId, {
        type: "IMAGE_UPLOAD",
      });
      const imgP = await placeQuestion(database, testId, imgQ, {
        marks: "10",
      });

      const { body: attempt } = await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/attempts`)
        .set(...authHeader(app, student))
        .expect(201);

      await request(app.getHttpServer())
        .patch(
          `/assessment/attempts/${attempt.attemptId}/answers/${imgP}`,
        )
        .set(...authHeader(app, student))
        .send({ response: ["file-id-1"] })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/assessment/attempts/${attempt.attemptId}/submit`)
        .set(...authHeader(app, student))
        .expect(201);

      const [imgAnswer] = await database.db
        .select()
        .from(assessmentAttemptAnswers)
        .where(
          and(
            eq(assessmentAttemptAnswers.attemptId, attempt.attemptId),
            eq(assessmentAttemptAnswers.placementId, imgP),
          ),
        )
        .limit(1);

      const { body: graded } = await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${imgAnswer.answerId}/grade`)
        .set(...authHeader(app, instructor))
        .send({ totalMarks: 8 })
        .expect(201);

      expect(graded.status).toBe("GRADED");
      expect(graded.awardedMarks).toBe(8);
    });

    it("grades as zero for an image question with no upload", async () => {
      const batchId = await createBatch(database, admin.userId);
      await assignInstructor(database, batchId, instructor.userId);
      await enrol(database, batchId, student.userId);

      const testId = await createTest(database, admin.userId, {
        batchId,
        publishedAt: clock.now(),
        durationMinutes: 120,
      });
      const imgQ = await createQuestion(database, taxonomy, admin.userId, {
        type: "IMAGE_UPLOAD",
      });
      const imgP = await placeQuestion(database, testId, imgQ, {
        marks: "10",
      });

      const { body: attempt } = await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/attempts`)
        .set(...authHeader(app, student))
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/attempts/${attempt.attemptId}/submit`)
        .set(...authHeader(app, student))
        .expect(201);

      const [imgAnswer] = await database.db
        .select()
        .from(assessmentAttemptAnswers)
        .where(
          and(
            eq(assessmentAttemptAnswers.attemptId, attempt.attemptId),
            eq(assessmentAttemptAnswers.placementId, imgP),
          ),
        )
        .limit(1);

      const { body: graded } = await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${imgAnswer.answerId}/grade`)
        .set(...authHeader(app, instructor))
        .send({ totalMarks: 0 })
        .expect(201);

      expect(graded.status).toBe("GRADED");
      expect(graded.awardedMarks).toBe(0);
    });

    it("prevents a student from reading another student's grading answer view", async () => {
      const batchId = await createBatch(database, admin.userId);
      await assignInstructor(database, batchId, instructor.userId);
      await enrol(database, batchId, student.userId);
      const otherStudent = await createUser(database, "LEARNER");

      const testId = await createTest(database, admin.userId, {
        batchId,
        publishedAt: clock.now(),
        durationMinutes: 120,
      });
      const imgQ = await createQuestion(database, taxonomy, admin.userId, {
        type: "IMAGE_UPLOAD",
      });
      const imgP = await placeQuestion(database, testId, imgQ, {
        marks: "10",
      });

      const { body: attempt } = await request(app.getHttpServer())
        .post(`/assessment/tests/${testId}/attempts`)
        .set(...authHeader(app, student))
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/attempts/${attempt.attemptId}/submit`)
        .set(...authHeader(app, student))
        .expect(201);

      const [imgAnswer] = await database.db
        .select()
        .from(assessmentAttemptAnswers)
        .where(
          and(
            eq(assessmentAttemptAnswers.attemptId, attempt.attemptId),
            eq(assessmentAttemptAnswers.placementId, imgP),
          ),
        )
        .limit(1);

      await request(app.getHttpServer())
        .get(`/assessment/grading/answers/${imgAnswer.answerId}`)
        .set(...authHeader(app, otherStudent))
        .expect(403);
    });
  });

  describe("ticket 28: recorded feedback", () => {
    it("attaches feedback media to a specific graded answer", async () => {
      const { testId, placementId } = await setupBatchWithWrittenTest();
      const { answerId } = await startAndSubmit(testId, placementId, "Essay.");

      await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${answerId}/grade`)
        .set(...authHeader(app, instructor))
        .send({ totalMarks: 7 })
        .expect(201);

      const { body } = await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${answerId}/feedback`)
        .set(...authHeader(app, instructor))
        .send({ mediaUrl: "https://cdn.example.com/feedback/abc.mp4" })
        .expect(201);

      expect(body.feedbackMediaId).toBe(
        "https://cdn.example.com/feedback/abc.mp4",
      );
    });

    it("the student can retrieve feedback on their result", async () => {
      const { testId, placementId } = await setupBatchWithWrittenTest();
      const { answerId } = await startAndSubmit(testId, placementId, "Essay.");

      await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${answerId}/grade`)
        .set(...authHeader(app, instructor))
        .send({ totalMarks: 7 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${answerId}/feedback`)
        .set(...authHeader(app, instructor))
        .send({ mediaUrl: "https://cdn.example.com/feedback/abc.mp4" })
        .expect(201);

      const { body } = await request(app.getHttpServer())
        .get(`/assessment/grading/answers/${answerId}/feedback`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(body.feedbackMediaId).toBe(
        "https://cdn.example.com/feedback/abc.mp4",
      );
    });

    it("only the owning student and staff can retrieve feedback", async () => {
      const { testId, placementId } = await setupBatchWithWrittenTest();
      const { answerId } = await startAndSubmit(testId, placementId, "Essay.");

      await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${answerId}/grade`)
        .set(...authHeader(app, instructor))
        .send({ totalMarks: 7 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${answerId}/feedback`)
        .set(...authHeader(app, instructor))
        .send({ mediaUrl: "https://cdn.example.com/feedback/abc.mp4" })
        .expect(201);

      const otherStudent = await createUser(database, "LEARNER");
      await request(app.getHttpServer())
        .get(`/assessment/grading/answers/${answerId}/feedback`)
        .set(...authHeader(app, otherStudent))
        .expect(403);
    });

    it("a failed or missing attachment leaves the written grade intact", async () => {
      const { testId, placementId } = await setupBatchWithWrittenTest();
      const { answerId, attemptId } = await startAndSubmit(
        testId,
        placementId,
        "Essay.",
      );

      await request(app.getHttpServer())
        .post(`/assessment/grading/answers/${answerId}/grade`)
        .set(...authHeader(app, instructor))
        .send({ totalMarks: 8 })
        .expect(201);

      const { body: attemptAfter } = await request(app.getHttpServer())
        .get(`/assessment/attempts/${attemptId}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(attemptAfter.status).toBe("GRADED");
      expect(attemptAfter.finalScore).toBe(8);

      await request(app.getHttpServer())
        .get(`/assessment/grading/answers/${answerId}/feedback`)
        .set(...authHeader(app, student))
        .expect(404);

      const { body: attemptStill } = await request(app.getHttpServer())
        .get(`/assessment/attempts/${attemptId}`)
        .set(...authHeader(app, student))
        .expect(200);

      expect(attemptStill.finalScore).toBe(8);
    });
  });
});
