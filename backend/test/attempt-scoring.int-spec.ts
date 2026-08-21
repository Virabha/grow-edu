import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { eq } from "drizzle-orm";

import {
  assessmentQuestionVersions,
  assessmentQuestions,
} from "../src/database/schema";
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
  createQuestionGroup,
  createTaxonomy,
  createTest,
  placeQuestion,
  seedDifficultyScale,
  text,
  Taxonomy,
} from "./support/assessment-factories";

interface AttemptQuestion {
  placementId: string;
  questionId: string;
  questionVersion: number;
  type: string;
  order: number;
  marks: number;
  groupId: string | null;
  groupStimulus: { type: string; text?: string }[] | null;
  prompt: { type: string; text?: string }[];
  awardedMarks: number | null;
  outcome: string | null;
  status: string;
  isHumanGraded: boolean;
}

interface Attempt {
  attemptId: string;
  status: string;
  maxScore: number;
  autoScoredMaxMarks: number;
  pendingMarks: number;
  provisionalScore: number | null;
  finalScore: number | null;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  questions: AttemptQuestion[];
}

describe("attempt scoring", () => {
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
    return body as Attempt;
  }

  async function answer(
    attemptId: string,
    placementId: string,
    response: unknown,
    expected = 200,
    actor: TestActor = student,
  ) {
    return request(app.getHttpServer())
      .patch(`/assessment/attempts/${attemptId}/answers/${placementId}`)
      .set(...authHeader(app, actor))
      .send({ response })
      .expect(expected);
  }

  async function submit(attemptId: string, actor: TestActor = student) {
    const { body } = await request(app.getHttpServer())
      .post(`/assessment/attempts/${attemptId}/submit`)
      .set(...authHeader(app, actor))
      .expect(201);
    return body as Attempt;
  }

  async function read(attemptId: string, actor: TestActor = student) {
    const { body } = await request(app.getHttpServer())
      .get(`/assessment/attempts/${attemptId}`)
      .set(...authHeader(app, actor))
      .expect(200);
    return body as Attempt;
  }

  function questionAt(attempt: Attempt, placementId: string): AttemptQuestion {
    const found = attempt.questions.find((q) => q.placementId === placementId);
    if (!found) throw new Error(`no question at placement ${placementId}`);
    return found;
  }

  describe("ticket 09: multiple-correct with partial credit", () => {
    async function multiTest(rule: "ALL_OR_NOTHING" | "PROPORTIONAL") {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId, {
        type: "MULTIPLE_CORRECT",
        partialCreditRule: rule,
      });
      const placementId = await placeQuestion(database, testId, questionId, {
        marks: "4",
      });
      return { testId, placementId };
    }

    it("awards full marks under all-or-nothing only for the exact correct set", async () => {
      const { testId, placementId } = await multiTest("ALL_OR_NOTHING");

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, ["a", "b"]);
      const exact = await submit(attempt.attemptId);

      expect(questionAt(exact, placementId).awardedMarks).toBe(4);
      expect(questionAt(exact, placementId).outcome).toBe("CORRECT");
    });

    it("scores a strict subset as wrong under all-or-nothing", async () => {
      const { testId, placementId } = await multiTest("ALL_OR_NOTHING");

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, ["a"]);
      const partial = await submit(attempt.attemptId);

      expect(questionAt(partial, placementId).outcome).toBe("WRONG");
      expect(questionAt(partial, placementId).awardedMarks).toBe(0);
    });

    it("awards a fraction under the proportional rule for a clean subset", async () => {
      const { testId, placementId } = await multiTest("PROPORTIONAL");

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, ["a"]);
      const scored = await submit(attempt.attemptId);

      expect(questionAt(scored, placementId).awardedMarks).toBe(2);
      expect(questionAt(scored, placementId).outcome).toBe("PARTIAL");
    });

    it("scores any wrong selection under the proportional rule as wrong", async () => {
      const { testId, placementId } = await multiTest("PROPORTIONAL");

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, ["a", "c"]);
      const scored = await submit(attempt.attemptId);

      expect(questionAt(scored, placementId).outcome).toBe("WRONG");
    });

    it("applies a different rule per question inside one test", async () => {
      const testId = await publishedTest();

      const strict = await createQuestion(database, taxonomy, admin.userId, {
        type: "MULTIPLE_CORRECT",
        partialCreditRule: "ALL_OR_NOTHING",
      });
      const lenient = await createQuestion(database, taxonomy, admin.userId, {
        type: "MULTIPLE_CORRECT",
        partialCreditRule: "PROPORTIONAL",
      });

      const strictPlacement = await placeQuestion(database, testId, strict, {
        order: 1,
        marks: "4",
      });
      const lenientPlacement = await placeQuestion(database, testId, lenient, {
        order: 2,
        marks: "4",
      });

      const attempt = await start(testId);
      await answer(attempt.attemptId, strictPlacement, ["a"]);
      await answer(attempt.attemptId, lenientPlacement, ["a"]);
      const scored = await submit(attempt.attemptId);

      expect(questionAt(scored, strictPlacement).awardedMarks).toBe(0);
      expect(questionAt(scored, lenientPlacement).awardedMarks).toBe(2);
    });

    it("never awards more than the question's marks", async () => {
      const { testId, placementId } = await multiTest("PROPORTIONAL");

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, ["a", "b"]);
      const scored = await submit(attempt.attemptId);

      expect(questionAt(scored, placementId).awardedMarks).toBe(4);
      expect(scored.provisionalScore).toBeLessThanOrEqual(scored.maxScore);
    });
  });

  describe("ticket 10: numeric answers with tolerance", () => {
    async function numericTest(
      tolerance: string,
      kind: "ABSOLUTE" | "RELATIVE",
    ) {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId, {
        type: "NUMERIC",
        tolerance,
        toleranceKind: kind,
      });
      const placementId = await placeQuestion(database, testId, questionId, {
        marks: "4",
      });
      return { testId, placementId };
    }

    it("treats an answer exactly at the tolerance boundary as correct", async () => {
      const { testId, placementId } = await numericTest("0.5", "ABSOLUTE");

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, 42.5);
      const scored = await submit(attempt.attemptId);

      expect(questionAt(scored, placementId).outcome).toBe("CORRECT");
    });

    it("treats an answer just beyond the tolerance as wrong", async () => {
      const { testId, placementId } = await numericTest("0.5", "ABSOLUTE");

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, 42.6);
      const scored = await submit(attempt.attemptId);

      expect(questionAt(scored, placementId).outcome).toBe("WRONG");
    });

    it("scales a relative tolerance with the expected magnitude", async () => {
      const relative = await numericTest("0.1", "RELATIVE");
      const relativeAttempt = await start(relative.testId);
      await answer(relativeAttempt.attemptId, relative.placementId, 46);
      const relativeScored = await submit(relativeAttempt.attemptId);
      expect(questionAt(relativeScored, relative.placementId).outcome).toBe(
        "CORRECT",
      );

      await truncateAll(database);
      admin = await createUser(database, "PLATFORM_ADMIN");
      student = await createUser(database, "LEARNER");
      await seedDifficultyScale(database);
      taxonomy = await createTaxonomy(database, admin.userId);

      const absolute = await numericTest("0.1", "ABSOLUTE");
      const absoluteAttempt = await start(absolute.testId);
      await answer(absoluteAttempt.attemptId, absolute.placementId, 46);
      const absoluteScored = await submit(absoluteAttempt.attemptId);
      expect(questionAt(absoluteScored, absolute.placementId).outcome).toBe(
        "WRONG",
      );
    });

    it("refuses a non-numeric submission rather than erroring on it", async () => {
      const { testId, placementId } = await numericTest("0", "ABSOLUTE");

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, "not a number", 400);

      const scored = await submit(attempt.attemptId);
      expect(questionAt(scored, placementId).outcome).toBe("SKIPPED");
    });

    it("requires an exact match at zero tolerance", async () => {
      const { testId, placementId } = await numericTest("0", "ABSOLUTE");

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, 42);
      const exact = await submit(attempt.attemptId);
      expect(questionAt(exact, placementId).outcome).toBe("CORRECT");
    });
  });

  describe("ticket 20: attempting every question type", () => {
    it("rejects an answer shaped for a different question type", async () => {
      const testId = await publishedTest();
      const single = await createQuestion(database, taxonomy, admin.userId);
      const numeric = await createQuestion(database, taxonomy, admin.userId, {
        type: "NUMERIC",
      });
      const written = await createQuestion(database, taxonomy, admin.userId, {
        type: "WRITTEN",
      });

      const singlePlacement = await placeQuestion(database, testId, single, {
        order: 1,
      });
      const numericPlacement = await placeQuestion(database, testId, numeric, {
        order: 2,
      });
      const writtenPlacement = await placeQuestion(database, testId, written, {
        order: 3,
      });

      const attempt = await start(testId);

      await answer(attempt.attemptId, singlePlacement, ["a", "b"], 400);
      await answer(attempt.attemptId, numericPlacement, "banana", 400);
      await answer(attempt.attemptId, writtenPlacement, 42, 400);

      await answer(attempt.attemptId, singlePlacement, "a");
      await answer(attempt.attemptId, numericPlacement, 42);
      await answer(attempt.attemptId, writtenPlacement, "My working.");
    });

    it("presents a passage group's stimulus with its members in order", async () => {
      const testId = await publishedTest();
      const groupId = await createQuestionGroup(
        database,
        admin.userId,
        text("A body falls freely under gravity."),
      );

      const first = await createQuestion(database, taxonomy, admin.userId, {
        groupId,
        groupOrder: 1,
      });
      const second = await createQuestion(database, taxonomy, admin.userId, {
        groupId,
        groupOrder: 2,
      });

      const firstPlacement = await placeQuestion(database, testId, first, {
        order: 1,
        groupId,
      });
      const secondPlacement = await placeQuestion(database, testId, second, {
        order: 2,
        groupId,
      });

      const attempt = await start(testId);

      expect(attempt.questions.map((q) => q.placementId)).toEqual([
        firstPlacement,
        secondPlacement,
      ]);
      for (const question of attempt.questions) {
        expect(question.groupId).toBe(groupId);
        expect(question.groupStimulus).toEqual(
          text("A body falls freely under gravity."),
        );
      }
    });

    it("allows an answer to be saved and revised before submission", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const placementId = await placeQuestion(database, testId, questionId);

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, "b");
      await answer(attempt.attemptId, placementId, "a");

      const scored = await submit(attempt.attemptId);
      expect(questionAt(scored, placementId).outcome).toBe("CORRECT");
    });

    it("refuses a second submission rather than creating another attempt", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      await placeQuestion(database, testId, questionId);

      const attempt = await start(testId);
      await submit(attempt.attemptId);

      await request(app.getHttpServer())
        .post(`/assessment/attempts/${attempt.attemptId}/submit`)
        .set(...authHeader(app, student))
        .expect(409);
    });

    it("refuses an answer submitted after the attempt expires", async () => {
      const testId = await publishedTest({ durationMinutes: 10 });
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const placementId = await placeQuestion(database, testId, questionId);

      const attempt = await start(testId);
      clock.advance(11 * 60_000);

      await answer(attempt.attemptId, placementId, "a", 409);
    });
  });

  describe("ticket 21: scoring across all five behaviours", () => {
    it("scores every objective type correctly in one mixed test", async () => {
      const testId = await publishedTest();

      const single = await createQuestion(database, taxonomy, admin.userId);
      const multi = await createQuestion(database, taxonomy, admin.userId, {
        type: "MULTIPLE_CORRECT",
        partialCreditRule: "PROPORTIONAL",
      });
      const numeric = await createQuestion(database, taxonomy, admin.userId, {
        type: "NUMERIC",
        tolerance: "1",
      });

      const singlePlacement = await placeQuestion(database, testId, single, {
        order: 1,
        marks: "4",
      });
      const multiPlacement = await placeQuestion(database, testId, multi, {
        order: 2,
        marks: "4",
      });
      const numericPlacement = await placeQuestion(database, testId, numeric, {
        order: 3,
        marks: "4",
      });

      const attempt = await start(testId);
      await answer(attempt.attemptId, singlePlacement, "a");
      await answer(attempt.attemptId, multiPlacement, ["a"]);
      await answer(attempt.attemptId, numericPlacement, 42.5);

      const scored = await submit(attempt.attemptId);

      expect(questionAt(scored, singlePlacement).awardedMarks).toBe(4);
      expect(questionAt(scored, multiPlacement).awardedMarks).toBe(2);
      expect(questionAt(scored, numericPlacement).awardedMarks).toBe(4);
      expect(scored.provisionalScore).toBe(10);
      expect(scored.status).toBe("GRADED");
    });

    it("leaves human-graded questions out of the provisional score and reports them pending", async () => {
      const testId = await publishedTest();

      const single = await createQuestion(database, taxonomy, admin.userId);
      const written = await createQuestion(database, taxonomy, admin.userId, {
        type: "WRITTEN",
      });

      const singlePlacement = await placeQuestion(database, testId, single, {
        order: 1,
        marks: "4",
      });
      const writtenPlacement = await placeQuestion(database, testId, written, {
        order: 2,
        marks: "6",
      });

      const attempt = await start(testId);
      await answer(attempt.attemptId, singlePlacement, "a");
      await answer(attempt.attemptId, writtenPlacement, "An essay.");

      const scored = await submit(attempt.attemptId);

      expect(scored.provisionalScore).toBe(4);
      expect(scored.pendingMarks).toBe(6);
      expect(scored.status).toBe("AWAITING_GRADING");
      expect(scored.finalScore).toBeNull();
      expect(questionAt(scored, writtenPlacement).outcome).toBe("PENDING");
      expect(questionAt(scored, writtenPlacement).awardedMarks).toBeNull();
    });

    it("has an auto-scored maximum plus pending marks equal to the test maximum", async () => {
      const testId = await publishedTest();

      const single = await createQuestion(database, taxonomy, admin.userId);
      const image = await createQuestion(database, taxonomy, admin.userId, {
        type: "IMAGE_UPLOAD",
      });

      await placeQuestion(database, testId, single, { order: 1, marks: "4" });
      await placeQuestion(database, testId, image, { order: 2, marks: "6" });

      const attempt = await start(testId);
      const scored = await submit(attempt.attemptId);

      expect(scored.maxScore).toBe(10);
      expect(scored.autoScoredMaxMarks + scored.pendingMarks).toBe(
        scored.maxScore,
      );
    });

    it("does not rescore when the result is read again", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const placementId = await placeQuestion(database, testId, questionId, {
        marks: "4",
      });

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, "a");
      const scored = await submit(attempt.attemptId);

      await database.db
        .update(assessmentQuestionVersions)
        .set({ answerKey: { kind: "SINGLE", optionId: "c" } })
        .where(eq(assessmentQuestionVersions.questionId, questionId));

      const reread = await read(attempt.attemptId);
      expect(reread.provisionalScore).toBe(scored.provisionalScore);
      expect(questionAt(reread, placementId).awardedMarks).toBe(4);
    });

    it("reports a zero provisional score for a test with no objective questions", async () => {
      const testId = await publishedTest();
      const written = await createQuestion(database, taxonomy, admin.userId, {
        type: "WRITTEN",
      });
      await placeQuestion(database, testId, written, { marks: "6" });

      const attempt = await start(testId);
      const scored = await submit(attempt.attemptId);

      expect(scored.provisionalScore).toBe(0);
      expect(scored.pendingMarks).toBe(6);
      expect(scored.status).toBe("AWAITING_GRADING");
    });
  });

  describe("ticket 22: negative marking floor and skipped treatment", () => {
    async function penalisedTest(overrides: Record<string, unknown> = {}) {
      const testId = await publishedTest({
        negativeMarkPercent: "25",
        ...overrides,
      });
      const first = await createQuestion(database, taxonomy, admin.userId);
      const second = await createQuestion(database, taxonomy, admin.userId);
      const firstPlacement = await placeQuestion(database, testId, first, {
        order: 1,
        marks: "4",
      });
      const secondPlacement = await placeQuestion(database, testId, second, {
        order: 2,
        marks: "4",
      });
      return { testId, firstPlacement, secondPlacement };
    }

    it("does not penalise a skipped question", async () => {
      const { testId, firstPlacement } = await penalisedTest();

      const attempt = await start(testId);
      await answer(attempt.attemptId, firstPlacement, "a");
      const scored = await submit(attempt.attemptId);

      expect(scored.provisionalScore).toBe(4);
      expect(scored.skippedCount).toBe(1);
    });

    it("penalises a wrong answer by the placement's negative rule", async () => {
      const { testId, firstPlacement, secondPlacement } = await penalisedTest();

      const attempt = await start(testId);
      await answer(attempt.attemptId, firstPlacement, "a");
      await answer(attempt.attemptId, secondPlacement, "b");
      const scored = await submit(attempt.attemptId);

      expect(scored.provisionalScore).toBe(3);
      expect(scored.wrongCount).toBe(1);
    });

    it("clamps a total that would fall below the floor", async () => {
      const { testId, firstPlacement, secondPlacement } = await penalisedTest({
        negativeMarkPercent: "100",
        scoreFloor: "-2",
      });

      const attempt = await start(testId);
      await answer(attempt.attemptId, firstPlacement, "b");
      await answer(attempt.attemptId, secondPlacement, "b");
      const scored = await submit(attempt.attemptId);

      expect(scored.provisionalScore).toBe(-2);
    });

    it("defaults the floor to zero", async () => {
      const { testId, firstPlacement, secondPlacement } = await penalisedTest({
        negativeMarkPercent: "100",
      });

      const attempt = await start(testId);
      await answer(attempt.attemptId, firstPlacement, "b");
      await answer(attempt.attemptId, secondPlacement, "b");
      const scored = await submit(attempt.attemptId);

      expect(scored.provisionalScore).toBe(0);
    });

    it("scores an all-skipped attempt as exactly zero", async () => {
      const { testId } = await penalisedTest();

      const attempt = await start(testId);
      const scored = await submit(attempt.attemptId);

      expect(scored.provisionalScore).toBe(0);
      expect(scored.skippedCount).toBe(2);
      expect(scored.wrongCount).toBe(0);
    });
  });

  describe("ticket 23: an attempt scores against the version it saw", () => {
    async function editAnswerKey(questionId: string, optionId: string) {
      const [question] = await database.db
        .select()
        .from(assessmentQuestions)
        .where(eq(assessmentQuestions.questionId, questionId))
        .limit(1);

      const next = question.currentVersion + 1;

      await database.db.insert(assessmentQuestionVersions).values({
        questionId,
        version: next,
        prompt: text("Revised prompt"),
        options: [
          { id: "a", content: text("Option A") },
          { id: "b", content: text("Option B") },
          { id: "c", content: text("Option C") },
        ],
        answerKey: { kind: "SINGLE", optionId },
        explanation: text("Revised because."),
        searchText: "Revised prompt",
        createdBy: admin.userId,
      });

      await database.db
        .update(assessmentQuestions)
        .set({ currentVersion: next })
        .where(eq(assessmentQuestions.questionId, questionId));
    }

    it("does not change a submitted attempt's score when the question is edited", async () => {
      const testId = await publishedTest({ maxAttempts: 2 });
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const placementId = await placeQuestion(database, testId, questionId, {
        marks: "4",
      });

      const attempt = await start(testId);
      await answer(attempt.attemptId, placementId, "a");
      const scored = await submit(attempt.attemptId);
      expect(scored.provisionalScore).toBe(4);

      await editAnswerKey(questionId, "c");

      const reread = await read(attempt.attemptId);
      expect(reread.provisionalScore).toBe(4);
      expect(questionAt(reread, placementId).outcome).toBe("CORRECT");
    });

    it("reads back the prompt the student actually saw", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId, {
        prompt: text("Original prompt"),
      });
      const placementId = await placeQuestion(database, testId, questionId);

      const attempt = await start(testId);
      await submit(attempt.attemptId);

      await editAnswerKey(questionId, "b");

      const reread = await read(attempt.attemptId);
      expect(questionAt(reread, placementId).prompt).toEqual(
        text("Original prompt"),
      );
      expect(questionAt(reread, placementId).questionVersion).toBe(1);
    });

    it("keeps an in-progress attempt on the version it started with", async () => {
      const testId = await publishedTest();
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const placementId = await placeQuestion(database, testId, questionId, {
        marks: "4",
      });

      const attempt = await start(testId);
      await editAnswerKey(questionId, "c");

      await answer(attempt.attemptId, placementId, "a");
      const scored = await submit(attempt.attemptId);

      expect(questionAt(scored, placementId).questionVersion).toBe(1);
      expect(scored.provisionalScore).toBe(4);
    });

    it("uses the new version for an attempt started after the edit", async () => {
      const testId = await publishedTest({ maxAttempts: 2 });
      const questionId = await createQuestion(database, taxonomy, admin.userId);
      const placementId = await placeQuestion(database, testId, questionId, {
        marks: "4",
      });

      const first = await start(testId);
      await submit(first.attemptId);

      await editAnswerKey(questionId, "c");

      const second = await start(testId);
      expect(questionAt(second, placementId).questionVersion).toBe(2);

      await answer(second.attemptId, placementId, "c");
      const scored = await submit(second.attemptId);
      expect(scored.provisionalScore).toBe(4);
    });

    it("records the version on each answer rather than on the attempt", async () => {
      const testId = await publishedTest();
      const stable = await createQuestion(database, taxonomy, admin.userId);
      const edited = await createQuestion(database, taxonomy, admin.userId);

      await editAnswerKey(edited, "b");

      const stablePlacement = await placeQuestion(database, testId, stable, {
        order: 1,
      });
      const editedPlacement = await placeQuestion(database, testId, edited, {
        order: 2,
      });

      const attempt = await start(testId);

      expect(questionAt(attempt, stablePlacement).questionVersion).toBe(1);
      expect(questionAt(attempt, editedPlacement).questionVersion).toBe(2);
    });
  });
});
