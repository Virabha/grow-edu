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
  createTaxonomy,
  createTest,
  placeQuestion,
  seedDifficultyScale,
  text,
  Taxonomy,
} from "./support/assessment-factories";

interface NotebookEntry {
  entryId: string;
  questionId: string;
  questionVersion: number;
  topicId: string;
  givenAnswer: unknown;
  correctAnswer: { kind: string; optionId?: string } | null;
  explanation: { type: string; text?: string }[];
  isResolved: boolean;
}

describe("error notebook", () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let student: TestActor;
  let other: TestActor;
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
    other = await createUser(database, "LEARNER");
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

  async function sit(
    testId: string,
    answers: { placementId: string; response?: unknown }[],
    actor: TestActor = student,
  ): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .post(`/assessment/tests/${testId}/attempts`)
      .set(...authHeader(app, actor))
      .expect(201);
    const attemptId = (body as { attemptId: string }).attemptId;

    for (const entry of answers) {
      if (entry.response === undefined) continue;
      await request(app.getHttpServer())
        .patch(`/assessment/attempts/${attemptId}/answers/${entry.placementId}`)
        .set(...authHeader(app, actor))
        .send({ response: entry.response })
        .expect(200);
    }

    await request(app.getHttpServer())
      .post(`/assessment/attempts/${attemptId}/submit`)
      .set(...authHeader(app, actor))
      .expect(201);

    return attemptId;
  }

  async function notebook(
    actor: TestActor = student,
    query = "",
  ): Promise<NotebookEntry[]> {
    const { body } = await request(app.getHttpServer())
      .get(`/assessment/error-notebook${query}`)
      .set(...authHeader(app, actor))
      .expect(200);
    return body as NotebookEntry[];
  }

  it("creates exactly one entry per incorrect answer", async () => {
    const testId = await publishedTest();
    const wrongOne = await createQuestion(database, taxonomy, admin.userId);
    const wrongTwo = await createQuestion(database, taxonomy, admin.userId);

    const first = await placeQuestion(database, testId, wrongOne, { order: 1 });
    const second = await placeQuestion(database, testId, wrongTwo, {
      order: 2,
    });

    await sit(testId, [
      { placementId: first, response: "b" },
      { placementId: second, response: "c" },
    ]);

    const entries = await notebook();
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.questionId).sort()).toEqual(
      [wrongOne, wrongTwo].sort(),
    );
  });

  it("creates no entry for a correct or a skipped answer", async () => {
    const testId = await publishedTest();
    const rightOne = await createQuestion(database, taxonomy, admin.userId);
    const untouched = await createQuestion(database, taxonomy, admin.userId);

    const first = await placeQuestion(database, testId, rightOne, { order: 1 });
    await placeQuestion(database, testId, untouched, { order: 2 });

    await sit(testId, [{ placementId: first, response: "a" }]);

    expect(await notebook()).toHaveLength(0);
  });

  it("carries the wrong answer, the right answer and the explanation together", async () => {
    const testId = await publishedTest();
    const questionId = await createQuestion(database, taxonomy, admin.userId, {
      explanation: text("Because momentum is conserved."),
    });
    const placementId = await placeQuestion(database, testId, questionId);

    await sit(testId, [{ placementId, response: "c" }]);

    const [entry] = await notebook();
    expect(entry.givenAnswer).toBe("c");
    expect(entry.correctAnswer).toEqual({ kind: "SINGLE", optionId: "a" });
    expect(entry.explanation).toEqual(text("Because momentum is conserved."));
    expect(entry.topicId).toBe(taxonomy.topicId);
  });

  it("keeps a resolved entry in the record but off the active list", async () => {
    const testId = await publishedTest();
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    const placementId = await placeQuestion(database, testId, questionId);

    await sit(testId, [{ placementId, response: "b" }]);

    const [entry] = await notebook();

    await request(app.getHttpServer())
      .post(`/assessment/error-notebook/${entry.entryId}/resolve`)
      .set(...authHeader(app, student))
      .expect(201);

    expect(await notebook()).toHaveLength(0);

    const withResolved = await notebook(student, "?includeResolved=true");
    expect(withResolved).toHaveLength(1);
    expect(withResolved[0].isResolved).toBe(true);
  });

  it("does not change what an entry shows when the question is edited afterwards", async () => {
    const testId = await publishedTest();
    const questionId = await createQuestion(database, taxonomy, admin.userId, {
      explanation: text("Original reasoning."),
    });
    const placementId = await placeQuestion(database, testId, questionId);

    await sit(testId, [{ placementId, response: "c" }]);

    await database.db.insert(assessmentQuestionVersions).values({
      questionId,
      version: 2,
      prompt: text("Revised prompt"),
      options: [
        { id: "a", content: text("Option A") },
        { id: "b", content: text("Option B") },
        { id: "c", content: text("Option C") },
      ],
      answerKey: { kind: "SINGLE", optionId: "b" },
      explanation: text("Rewritten reasoning."),
      searchText: "Revised prompt",
      createdBy: admin.userId,
    });
    await database.db
      .update(assessmentQuestions)
      .set({ currentVersion: 2 })
      .where(eq(assessmentQuestions.questionId, questionId));

    const [entry] = await notebook();
    expect(entry.questionVersion).toBe(1);
    expect(entry.explanation).toEqual(text("Original reasoning."));
    expect(entry.correctAnswer).toEqual({ kind: "SINGLE", optionId: "a" });
  });

  it("collects an entry for a partially credited answer", async () => {
    const testId = await publishedTest();
    const questionId = await createQuestion(database, taxonomy, admin.userId, {
      type: "MULTIPLE_CORRECT",
      partialCreditRule: "PROPORTIONAL",
    });
    const placementId = await placeQuestion(database, testId, questionId, {
      marks: "4",
    });

    await sit(testId, [{ placementId, response: ["a"] }]);

    const entries = await notebook();
    expect(entries).toHaveLength(1);
    expect(entries[0].givenAnswer).toEqual(["a"]);
  });

  it("keeps one student's notebook out of another's", async () => {
    const testId = await publishedTest();
    const questionId = await createQuestion(database, taxonomy, admin.userId);
    const placementId = await placeQuestion(database, testId, questionId);

    await sit(testId, [{ placementId, response: "b" }], student);

    expect(await notebook(student)).toHaveLength(1);
    expect(await notebook(other)).toHaveLength(0);

    const [entry] = await notebook(student);
    await request(app.getHttpServer())
      .post(`/assessment/error-notebook/${entry.entryId}/resolve`)
      .set(...authHeader(app, other))
      .expect(403);
  });

  it("filters the notebook by topic", async () => {
    const testId = await publishedTest();
    const otherTaxonomy = await createTaxonomy(database, admin.userId);

    const here = await createQuestion(database, taxonomy, admin.userId);
    const there = await createQuestion(database, otherTaxonomy, admin.userId);

    const firstPlacement = await placeQuestion(database, testId, here, {
      order: 1,
    });
    const secondPlacement = await placeQuestion(database, testId, there, {
      order: 2,
    });

    await sit(testId, [
      { placementId: firstPlacement, response: "b" },
      { placementId: secondPlacement, response: "b" },
    ]);

    const scoped = await notebook(student, `?topicId=${taxonomy.topicId}`);
    expect(scoped).toHaveLength(1);
    expect(scoped[0].questionId).toBe(here);
  });
});
