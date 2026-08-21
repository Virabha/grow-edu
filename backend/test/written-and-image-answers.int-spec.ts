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
  text,
  Taxonomy,
} from "./support/assessment-factories";

interface AttemptQuestion {
  placementId: string;
  type: string;
  response: unknown;
  isHumanGraded: boolean;
  awardedMarks: number | null;
  outcome: string | null;
  status: string;
}

interface Attempt {
  attemptId: string;
  status: string;
  maxScore: number;
  pendingMarks: number;
  provisionalScore: number | null;
  finalScore: number | null;
  questions: AttemptQuestion[];
}

describe("written and image answer types", () => {
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

  async function publishedTest(overrides: Record<string, unknown> = {}) {
    return createTest(database, admin.userId, {
      publishedAt: clock.now(),
      durationMinutes: 120,
      ...overrides,
    });
  }

  async function start(testId: string): Promise<Attempt> {
    const { body } = await request(app.getHttpServer())
      .post(`/assessment/tests/${testId}/attempts`)
      .set(...authHeader(app, student))
      .expect(201);
    return body as Attempt;
  }

  async function answer(
    attemptId: string,
    placementId: string,
    response: unknown,
    expected = 200,
  ) {
    return request(app.getHttpServer())
      .patch(`/assessment/attempts/${attemptId}/answers/${placementId}`)
      .set(...authHeader(app, student))
      .send({ response })
      .expect(expected);
  }

  async function submit(attemptId: string): Promise<Attempt> {
    const { body } = await request(app.getHttpServer())
      .post(`/assessment/attempts/${attemptId}/submit`)
      .set(...authHeader(app, student))
      .expect(201);
    return body as Attempt;
  }

  function questionAt(attempt: Attempt, placementId: string): AttemptQuestion {
    const found = attempt.questions.find((q) => q.placementId === placementId);
    if (!found) throw new Error(`no question at placement ${placementId}`);
    return found;
  }

  describe("authoring", () => {
    it("refuses an answer key on a written question", async () => {
      await request(app.getHttpServer())
        .post("/assessment/questions")
        .set(...authHeader(app, admin))
        .send({
          type: "WRITTEN",
          subjectId: taxonomy.subjectId,
          topicId: taxonomy.topicId,
          difficulty: 1,
          prompt: text("Explain conservation of momentum."),
          answerKey: { optionId: "a" },
        })
        .expect(400);
    });

    it("refuses options on an image-upload question", async () => {
      await request(app.getHttpServer())
        .post("/assessment/questions")
        .set(...authHeader(app, admin))
        .send({
          type: "IMAGE_UPLOAD",
          subjectId: taxonomy.subjectId,
          topicId: taxonomy.topicId,
          difficulty: 1,
          prompt: text("Photograph your working."),
          options: [{ id: "a", content: text("A") }],
        })
        .expect(400);
    });

    it("authors a written question that carries no answer key", async () => {
      const { body } = await request(app.getHttpServer())
        .post("/assessment/questions")
        .set(...authHeader(app, admin))
        .send({
          type: "WRITTEN",
          subjectId: taxonomy.subjectId,
          topicId: taxonomy.topicId,
          difficulty: 2,
          prompt: text("Derive the expression for escape velocity."),
          explanation: text("Start from energy conservation."),
        })
        .expect(201);

      const created = body as {
        questionId: string;
        answerKey: unknown;
        isHumanGraded: boolean;
      };
      expect(created.answerKey).toBeNull();
      expect(created.isHumanGraded).toBe(true);
    });
  });

  describe("answering", () => {
    it("stores a written answer and reads it back intact", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId, {
        type: "WRITTEN",
      });
      const placementId = await placeQuestion(database, testId, questionId, {
        marks: "6",
      });

      const essay =
        "Momentum is conserved because no external force acts on the system.";

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, essay);
      const submitted = await submit(attempt.attemptId);

      expect(questionAt(submitted, placementId).response).toBe(essay);
    });

    it("accepts several pages of photographed working", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId, {
        type: "IMAGE_UPLOAD",
      });
      const placementId = await placeQuestion(database, testId, questionId, {
        marks: "6",
      });

      const pages = ["page-one", "page-two", "page-three"];

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, pages);
      const submitted = await submit(attempt.attemptId);

      expect(questionAt(submitted, placementId).response).toEqual(pages);
    });

    it("refuses an image answer that is not a list of file ids", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId, {
        type: "IMAGE_UPLOAD",
      });
      const placementId = await placeQuestion(database, testId, questionId);

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, 42, 400);
    });
  });

  describe("submission", () => {
    it("submits without a final score and reports itself awaiting grading", async () => {
      const testId = await publishedTest();
      const written = await createQuestion(database, taxonomy, admin.userId, {
        type: "WRITTEN",
      });
      const placementId = await placeQuestion(database, testId, written, {
        marks: "6",
      });

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, "An answer.");
      const submitted = await submit(attempt.attemptId);

      expect(submitted.status).toBe("AWAITING_GRADING");
      expect(submitted.finalScore).toBeNull();
      expect(submitted.pendingMarks).toBe(6);
    });

    it("still scores the objective questions in the same test immediately", async () => {
      const testId = await publishedTest();
      const objective = await createQuestion(database, taxonomy, admin.userId);
      const written = await createQuestion(database, taxonomy, admin.userId, {
        type: "WRITTEN",
      });

      const objectivePlacement = await placeQuestion(
        database,
        testId,
        objective,
        { order: 1, marks: "4" },
      );
      const writtenPlacement = await placeQuestion(database, testId, written, {
        order: 2,
        marks: "6",
      });

      const attempt = await start(testId);
      await answer(attempt.attemptId, objectivePlacement, "a");
      await answer(attempt.attemptId, writtenPlacement, "An answer.");
      const submitted = await submit(attempt.attemptId);

      expect(questionAt(submitted, objectivePlacement).awardedMarks).toBe(4);
      expect(questionAt(submitted, objectivePlacement).outcome).toBe("CORRECT");
      expect(submitted.provisionalScore).toBe(4);
    });

    it("shows a student no mark for an answer that is not yet graded", async () => {
      const testId = await publishedTest();
      const written = await createQuestion(database, taxonomy, admin.userId, {
        type: "WRITTEN",
      });
      const image = await createQuestion(database, taxonomy, admin.userId, {
        type: "IMAGE_UPLOAD",
      });

      const writtenPlacement = await placeQuestion(database, testId, written, {
        order: 1,
        marks: "6",
      });
      const imagePlacement = await placeQuestion(database, testId, image, {
        order: 2,
        marks: "4",
      });

      const attempt = await start(testId);
      await answer(attempt.attemptId, writtenPlacement, "An answer.");
      await answer(attempt.attemptId, imagePlacement, ["page-one"]);
      const submitted = await submit(attempt.attemptId);

      for (const placementId of [writtenPlacement, imagePlacement]) {
        const question = questionAt(submitted, placementId);
        expect(question.awardedMarks).toBeNull();
        expect(question.outcome).toBe("PENDING");
        expect(question.status).toBe("PENDING_GRADING");
      }
      expect(submitted.finalScore).toBeNull();
    });
  });
});
