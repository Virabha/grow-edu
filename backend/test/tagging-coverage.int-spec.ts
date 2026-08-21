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
  createTopicUnder,
  seedDifficultyScale,
} from "./support/assessment-factories";

interface TopicCoverage {
  topicId: string;
  topicName: string;
  total: number;
  byDifficulty: Record<string, number>;
  enoughForPractice: boolean;
}

interface SubjectCoverage {
  subjectId: string;
  subjectName: string;
  total: number;
  byDifficulty: Record<string, number>;
  topics: TopicCoverage[];
}

interface CoverageBody {
  difficultyLevels: { ordinal: number; label: string }[];
  practiceSetMinimum: number;
  totals: { questions: number; subjects: number; topics: number };
  subjects: SubjectCoverage[];
}

describe("tagging coverage report", () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let instructor: TestActor;
  let student: TestActor;

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
  });

  async function coverage(actor: TestActor): Promise<CoverageBody> {
    const { body } = await request(app.getHttpServer())
      .get("/assessment/insights/tagging-coverage")
      .set(...authHeader(app, actor))
      .expect(200);
    return body as CoverageBody;
  }

  function subjectNamed(body: CoverageBody, subjectId: string) {
    return body.subjects.find((s) => s.subjectId === subjectId);
  }

  it("reports counts per subject and topic broken down by difficulty band", async () => {
    const taxonomy = await createTaxonomy(database, admin.userId);
    await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });
    await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });
    await createQuestion(database, taxonomy, admin.userId, { difficulty: 3 });

    const body = await coverage(admin);
    const subject = subjectNamed(body, taxonomy.subjectId);

    expect(subject).toBeDefined();
    expect(subject?.total).toBe(3);
    expect(subject?.byDifficulty["1"]).toBe(2);
    expect(subject?.byDifficulty["2"]).toBe(0);
    expect(subject?.byDifficulty["3"]).toBe(1);

    const topic = subject?.topics.find((t) => t.topicId === taxonomy.topicId);
    expect(topic?.total).toBe(3);
    expect(topic?.byDifficulty["3"]).toBe(1);
  });

  it("reports a topic with no questions as empty rather than omitting it", async () => {
    const taxonomy = await createTaxonomy(database, admin.userId);
    const barren = await createTopicUnder(
      database,
      taxonomy.subjectId,
      admin.userId,
    );

    const body = await coverage(admin);
    const subject = subjectNamed(body, taxonomy.subjectId);
    const topic = subject?.topics.find((t) => t.topicId === barren);

    expect(topic).toBeDefined();
    expect(topic?.total).toBe(0);
    expect(topic?.enoughForPractice).toBe(false);
    expect(Object.values(topic?.byDifficulty ?? {})).toEqual([0, 0, 0]);
  });

  it("excludes retired questions from coverage", async () => {
    const taxonomy = await createTaxonomy(database, admin.userId);
    await createQuestion(database, taxonomy, admin.userId, { difficulty: 2 });
    await createQuestion(database, taxonomy, admin.userId, {
      difficulty: 2,
      isRetired: true,
    });

    const body = await coverage(admin);
    const subject = subjectNamed(body, taxonomy.subjectId);

    expect(subject?.total).toBe(1);
    expect(subject?.byDifficulty["2"]).toBe(1);
  });

  it("shows whether a topic has enough questions to generate a practice set", async () => {
    const taxonomy = await createTaxonomy(database, admin.userId);
    const thin = await coverage(admin);
    expect(thin.practiceSetMinimum).toBeGreaterThan(0);

    for (let i = 0; i < thin.practiceSetMinimum - 1; i += 1) {
      await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });
    }

    const before = await coverage(admin);
    const topicBefore = subjectNamed(before, taxonomy.subjectId)?.topics.find(
      (t) => t.topicId === taxonomy.topicId,
    );
    expect(topicBefore?.enoughForPractice).toBe(false);

    await createQuestion(database, taxonomy, admin.userId, { difficulty: 1 });

    const after = await coverage(admin);
    const topicAfter = subjectNamed(after, taxonomy.subjectId)?.topics.find(
      (t) => t.topicId === taxonomy.topicId,
    );
    expect(topicAfter?.enoughForPractice).toBe(true);
  });

  it("counts a question tagged to a sub-topic under its parent topic", async () => {
    const taxonomy = await createTaxonomy(database, admin.userId);
    await createQuestion(database, taxonomy, admin.userId, {
      difficulty: 1,
      subTopicId: taxonomy.subTopicId,
    });

    const body = await coverage(admin);
    const topic = subjectNamed(body, taxonomy.subjectId)?.topics.find(
      (t) => t.topicId === taxonomy.topicId,
    );

    expect(topic?.total).toBe(1);
  });

  it("is readable by staff and refused to a student", async () => {
    await createTaxonomy(database, admin.userId);

    await coverage(instructor);

    await request(app.getHttpServer())
      .get("/assessment/insights/tagging-coverage")
      .set(...authHeader(app, student))
      .expect(403);
  });
});
