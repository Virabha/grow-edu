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
  openAttempt,
  answerQuestion,
  submitAttempt,
  readAttempt,
  placeQuestion,
  seedDifficultyScale,
  Taxonomy,
} from "./support/assessment-factories";

interface AttemptQuestion {
  placementId: string;
  questionId: string;
  elapsedSeconds: number;
  isSkipped: boolean;
  order: number;
}

interface Attempt {
  attemptId: string;
  status: string;
  questions: AttemptQuestion[];
}

describe("per-question timing on attempts", () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let student: TestActor;
  let taxonomy: Taxonomy;
  let testId: string;
  let firstPlacement: string;
  let secondPlacement: string;

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

    testId = await createTest(database, admin.userId, {
      publishedAt: clock.now(),
      durationMinutes: 120,
    });

    const one = await createQuestion(database, taxonomy, admin.userId);
    const two = await createQuestion(database, taxonomy, admin.userId);
    firstPlacement = await placeQuestion(database, testId, one, { order: 1 });
    secondPlacement = await placeQuestion(database, testId, two, { order: 2 });
  });

  async function focus(attemptId: string, placementId: string) {
    return request(app.getHttpServer())
      .post(`/assessment/attempts/${attemptId}/focus`)
      .set(...authHeader(app, student))
      .send({ placementId })
      .expect(201);
  }

  function timingOf(attempt: Attempt, placementId: string): number {
    const question = attempt.questions.find(
      (q) => q.placementId === placementId,
    );
    if (!question) throw new Error(`no question for placement ${placementId}`);
    return question.elapsedSeconds;
  }

  it("records a per-question elapsed time that is readable after submission", async () => {
    const attempt = await openAttempt<Attempt>(app, testId, student);

    clock.advance(30_000);
    await focus(attempt.attemptId, firstPlacement);

    await submitAttempt(app, attempt.attemptId, student);

    const submitted = await readAttempt<Attempt>(app, attempt.attemptId, student);
    expect(submitted.status).not.toBe("IN_PROGRESS");
    expect(timingOf(submitted, firstPlacement)).toBe(30);
  });

  it("accumulates rather than replaces elapsed time when a question is revisited", async () => {
    const attempt = await openAttempt<Attempt>(app, testId, student);

    clock.advance(20_000);
    await focus(attempt.attemptId, firstPlacement);

    clock.advance(45_000);
    await focus(attempt.attemptId, secondPlacement);

    clock.advance(10_000);
    await focus(attempt.attemptId, firstPlacement);

    const current = await readAttempt<Attempt>(app, attempt.attemptId, student);
    expect(timingOf(current, firstPlacement)).toBe(30);
    expect(timingOf(current, secondPlacement)).toBe(45);
  });

  it("records zero rather than absent for a question never visited", async () => {
    const attempt = await openAttempt<Attempt>(app, testId, student);

    clock.advance(15_000);
    await focus(attempt.attemptId, firstPlacement);

    await submitAttempt(app, attempt.attemptId, student);

    const submitted = await readAttempt<Attempt>(app, attempt.attemptId, student);
    const untouched = submitted.questions.find(
      (q) => q.placementId === secondPlacement,
    );

    expect(untouched).toBeDefined();
    expect(untouched?.elapsedSeconds).toBe(0);
    expect(untouched?.isSkipped).toBe(true);
  });

  it("drives timing from the injected clock rather than wall time", async () => {
    const attempt = await openAttempt<Attempt>(app, testId, student);

    clock.advance(3_600_000);
    await focus(attempt.attemptId, firstPlacement);

    const current = await readAttempt<Attempt>(app, attempt.attemptId, student);
    expect(timingOf(current, firstPlacement)).toBe(3600);
  });

  it("leaves timings immutable once the attempt is submitted", async () => {
    const attempt = await openAttempt<Attempt>(app, testId, student);

    clock.advance(25_000);
    await focus(attempt.attemptId, firstPlacement);

    await submitAttempt(app, attempt.attemptId, student);

    await request(app.getHttpServer())
      .post(`/assessment/attempts/${attempt.attemptId}/focus`)
      .set(...authHeader(app, student))
      .send({ placementId: firstPlacement })
      .expect(409);

    await answerQuestion(app, attempt.attemptId, firstPlacement, "a", student, 409);

    const submitted = await readAttempt<Attempt>(app, attempt.attemptId, student);
    expect(timingOf(submitted, firstPlacement)).toBe(25);
  });

  it("attributes time to the question being answered", async () => {
    const attempt = await openAttempt<Attempt>(app, testId, student);

    clock.advance(12_000);
    await answerQuestion(app, attempt.attemptId, secondPlacement, "a", student);

    const current = await readAttempt<Attempt>(app, attempt.attemptId, student);
    expect(timingOf(current, secondPlacement)).toBe(12);
    expect(timingOf(current, firstPlacement)).toBe(0);
  });
});
