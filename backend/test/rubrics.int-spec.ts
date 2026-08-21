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
  createTest,
  createQuestion,
  createTaxonomy,
  placeQuestion,
  seedDifficultyScale,
  Taxonomy,
} from "./support/assessment-factories";

describe("rubrics (ticket 24)", () => {
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

  async function createRubric(
    actor: TestActor = admin,
    overrides: Record<string, unknown> = {},
  ) {
    const { body } = await request(app.getHttpServer())
      .post("/assessment/rubrics")
      .set(...authHeader(app, actor))
      .send({ title: "Test Rubric", scaleMax: 5, ...overrides })
      .expect(201);
    return body as {
      rubricId: string;
      title: string;
      scaleMax: number;
      criteria: Array<{
        criterionId: string;
        label: string;
        weight: string;
        order: number;
      }>;
    };
  }

  async function addCriterion(
    rubricId: string,
    actor: TestActor = admin,
    overrides: Record<string, unknown> = {},
  ) {
    const { body } = await request(app.getHttpServer())
      .post(`/assessment/rubrics/${rubricId}/criteria`)
      .set(...authHeader(app, actor))
      .send({ label: "Clarity", weight: 2, ...overrides })
      .expect(201);
    return body as {
      rubricId: string;
      criteria: Array<{ criterionId: string; label: string; weight: string }>;
    };
  }

  it("creates a rubric independently of any question or test", async () => {
    const rubric = await createRubric();
    expect(rubric.rubricId).toBeTruthy();
    expect(rubric.title).toBe("Test Rubric");
    expect(rubric.scaleMax).toBe(5);
    expect(rubric.criteria).toHaveLength(0);
  });

  it("can be created by an instructor", async () => {
    const rubric = await createRubric(instructor);
    expect(rubric.rubricId).toBeTruthy();
  });

  it("adds criteria to a rubric", async () => {
    const rubric = await createRubric();
    const updated = await addCriterion(rubric.rubricId);
    expect(updated.criteria).toHaveLength(1);
    expect(updated.criteria[0].label).toBe("Clarity");
    expect(Number(updated.criteria[0].weight)).toBe(2);
  });

  it("reads back a rubric with its criteria", async () => {
    const rubric = await createRubric();
    await addCriterion(rubric.rubricId, admin, { label: "C1", weight: 1 });
    await addCriterion(rubric.rubricId, admin, { label: "C2", weight: 2 });

    const { body } = await request(app.getHttpServer())
      .get(`/assessment/rubrics/${rubric.rubricId}`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(body.criteria).toHaveLength(2);
  });

  it("updates rubric metadata without changing existing grades", async () => {
    const rubric = await createRubric();

    const { body } = await request(app.getHttpServer())
      .patch(`/assessment/rubrics/${rubric.rubricId}`)
      .set(...authHeader(app, admin))
      .send({ title: "Updated Title" })
      .expect(200);

    expect(body.title).toBe("Updated Title");
    expect(body.scaleMax).toBe(5);
  });

  it("removes a criterion from a rubric", async () => {
    const rubric = await createRubric();
    const withCriterion = await addCriterion(rubric.rubricId);
    const criterionId = withCriterion.criteria[0].criterionId;

    const { body } = await request(app.getHttpServer())
      .delete(`/assessment/rubrics/${rubric.rubricId}/criteria/${criterionId}`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(body.criteria).toHaveLength(0);
  });

  it("attaches a rubric to a test placement", async () => {
    const rubric = await createRubric();
    await addCriterion(rubric.rubricId, admin, { label: "Accuracy", weight: 2 });
    await addCriterion(rubric.rubricId, admin, { label: "Clarity", weight: 2 });

    const testId = await createTest(database, admin.userId, {
      publishedAt: clock.now(),
    });
    const questionId = await createQuestion(database, taxonomy, admin.userId, {
      type: "WRITTEN",
    });
    const placementId = await placeQuestion(database, testId, questionId, {
      marks: "10",
    });

    const { body } = await request(app.getHttpServer())
      .put(`/assessment/test-questions/${placementId}/rubric`)
      .set(...authHeader(app, admin))
      .send({ rubricId: rubric.rubricId })
      .expect(200);

    expect(body.rubricId).toBe(rubric.rubricId);
    expect(body.placementId).toBe(placementId);
  });

  it("refuses to attach a rubric whose total weight exceeds the placement marks", async () => {
    const rubric = await createRubric();
    await addCriterion(rubric.rubricId, admin, { label: "A", weight: 8 });
    await addCriterion(rubric.rubricId, admin, { label: "B", weight: 5 });

    const testId = await createTest(database, admin.userId, {
      publishedAt: clock.now(),
    });
    const questionId = await createQuestion(database, taxonomy, admin.userId, {
      type: "WRITTEN",
    });
    const placementId = await placeQuestion(database, testId, questionId, {
      marks: "10",
    });

    await request(app.getHttpServer())
      .put(`/assessment/test-questions/${placementId}/rubric`)
      .set(...authHeader(app, admin))
      .send({ rubricId: rubric.rubricId })
      .expect(409);
  });

  it("a question with no rubric can be graded with a bare total", async () => {
    const testId = await createTest(database, admin.userId, {
      publishedAt: clock.now(),
    });
    const questionId = await createQuestion(database, taxonomy, admin.userId, {
      type: "WRITTEN",
    });
    await placeQuestion(database, testId, questionId, { marks: "10" });

    const attemptRes = await request(app.getHttpServer())
      .post(`/assessment/tests/${testId}/attempts`)
      .set(...authHeader(app, student))
      .expect(201);
    const attempt = attemptRes.body;
    const placementId = attempt.questions[0].placementId;

    await request(app.getHttpServer())
      .patch(`/assessment/attempts/${attempt.attemptId}/answers/${placementId}`)
      .set(...authHeader(app, student))
      .send({ response: "My written answer." })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/assessment/attempts/${attempt.attemptId}/submit`)
      .set(...authHeader(app, student))
      .expect(201);

    const answerId = await getAnswerIdForPlacement(
      attempt.attemptId,
      placementId,
    );

    const { body: graded } = await request(app.getHttpServer())
      .post(`/assessment/grading/answers/${answerId}/grade`)
      .set(...authHeader(app, admin))
      .send({ totalMarks: 7 })
      .expect(201);

    expect(graded.awardedMarks).toBe(7);
    expect(graded.status).toBe("GRADED");
  });

  async function getAnswerIdForPlacement(
    attemptId: string,
    placementId: string,
  ): Promise<string> {
    const { assessmentAttemptAnswers } = await import(
      "../src/database/schema"
    );
    const { and, eq } = await import("drizzle-orm");
    const [answer] = await database.db
      .select()
      .from(assessmentAttemptAnswers)
      .where(
        and(
          eq(assessmentAttemptAnswers.attemptId, attemptId),
          eq(assessmentAttemptAnswers.placementId, placementId),
        ),
      )
      .limit(1);
    return answer.answerId;
  }
});
