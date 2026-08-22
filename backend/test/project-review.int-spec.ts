import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { randomUUID } from "crypto";

import {
  createTestDatabase,
  truncateAll,
  TestDatabase,
} from "./support/test-database";
import { createTestApp, authHeader, TestActor } from "./support/test-app";
import { TestClock } from "./support/test-clock";
import { createUser } from "./support/factories";
import { JOB_QUEUE } from "../src/jobs/job-queue";
import { InlineJobQueue } from "../src/jobs/inline-job-queue";
import {
  PROJECT_CHECK_RUNNER,
  ProjectCheckRunner,
  CheckRunResult,
} from "../src/project-review/check-runner";
import {
  PROJECT_SIMILARITY_PROVIDER,
  ProjectSimilarityProvider,
  SimilarityCheckResult,
} from "../src/project-review/similarity-provider";

const PASS_CHECK: CheckRunResult = {
  buildStatus: "PASSED",
  lintStatus: "PASSED",
  testStatus: "PASSED",
  detail: { passed: true },
};

const FAIL_CHECK: CheckRunResult = {
  buildStatus: "PASSED",
  lintStatus: "FAILED",
  testStatus: "FAILED",
  detail: { errors: ["lint error"] },
};

const EMPTY_SIMILARITY: SimilarityCheckResult = {
  cohortMatches: [],
  publicMatches: [],
};

function stubCheckRunner(result: CheckRunResult | Error): ProjectCheckRunner {
  return {
    runChecks: async () => {
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

function stubSimilarityProvider(result: SimilarityCheckResult | Error): ProjectSimilarityProvider {
  return {
    compare: async () => {
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

describe("project-review (tickets 22-25)", () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let instructor: TestActor;
  let student: TestActor;
  let otherStudent: TestActor;

  let checkRunner: ProjectCheckRunner;
  let similarityProvider: ProjectSimilarityProvider;
  let queue: InlineJobQueue;

  async function boot(
    checkResult: CheckRunResult | Error = PASS_CHECK,
    simResult: SimilarityCheckResult | Error = EMPTY_SIMILARITY,
    runnerOverride?: ProjectCheckRunner,
  ) {
    if (app) await app.close();
    checkRunner = runnerOverride ?? stubCheckRunner(checkResult);
    similarityProvider = stubSimilarityProvider(simResult);
    app = await createTestApp(database, clock, [
      { token: PROJECT_CHECK_RUNNER, value: checkRunner },
      { token: PROJECT_SIMILARITY_PROVIDER, value: similarityProvider },
    ]);
    queue = app.get<InlineJobQueue>(JOB_QUEUE);
  }

  beforeAll(async () => {
    database = await createTestDatabase();
    await boot();
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
    otherStudent = await createUser(database, "LEARNER");
  });

  async function createRubricWithCriteria(): Promise<{
    rubricId: string;
    criterionId: string;
    scaleMax: number;
  }> {
    const { body: rubric } = await request(app.getHttpServer())
      .post("/assessment/rubrics")
      .set(...authHeader(app, admin))
      .send({ title: "Code Review Rubric", scaleMax: 10 })
      .expect(201);

    const { body: withCriterion } = await request(app.getHttpServer())
      .post(`/assessment/rubrics/${(rubric as { rubricId: string }).rubricId}/criteria`)
      .set(...authHeader(app, admin))
      .send({ label: "Code Quality", weight: 1 })
      .expect(201);

    const rubricId = (rubric as { rubricId: string }).rubricId;
    const criterionId = (withCriterion as { criteria: Array<{ criterionId: string }> }).criteria[0].criterionId;
    return { rubricId, criterionId, scaleMax: 10 };
  }

  async function createProjectWithMilestone(rubricId: string) {
    const { body: project } = await request(app.getHttpServer())
      .post("/projects")
      .set(...authHeader(app, admin))
      .send({
        title: "Build a REST API",
        brief: [{ type: "TEXT", text: "Build it." }],
        requirements: ["Must use Node.js"],
        rubricId,
      })
      .expect(201);

    const pid = (project as { projectId: string }).projectId;

    const { body: milestones } = await request(app.getHttpServer())
      .post(`/projects/${pid}/milestones`)
      .set(...authHeader(app, admin))
      .send({ ordinal: 1, title: "Setup" })
      .expect(201);

    return {
      projectId: pid,
      milestoneId: (milestones as Array<{ milestoneId: string }>)[0].milestoneId,
    };
  }

  async function enrolAndSubmit(
    projectId: string,
    milestoneId: string,
    actor: TestActor = student,
    repoUrl = "https://github.com/student/my-project",
  ) {
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/enrol`)
      .set(...authHeader(app, admin))
      .send({ userId: actor.userId })
      .expect(201);

    const { body: submission } = await request(app.getHttpServer())
      .post(`/projects/${projectId}/milestones/${milestoneId}/submit`)
      .set(...authHeader(app, actor))
      .send({ repositoryUrl: repoUrl })
      .expect(201);

    return submission as { submissionId: string; cycle: number };
  }

  describe("ticket 22 – automated checks", () => {
    it("check run starts as PENDING before the job fires", async () => {
      await boot(PASS_CHECK);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      const { body } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${submissionId}/checks`)
        .set(...authHeader(app, student))
        .expect(200);

      expect((body as { status: string }).status).toBe("PENDING");
    });

    it("check run is never inline with submission — submission 201 even before job runs", async () => {
      await boot(PASS_CHECK);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/enrol`)
        .set(...authHeader(app, admin))
        .send({ userId: student.userId })
        .expect(201);

      const { body } = await request(app.getHttpServer())
        .post(`/projects/${projectId}/milestones/${milestoneId}/submit`)
        .set(...authHeader(app, student))
        .send({ repositoryUrl: "https://github.com/student/repo" })
        .expect(201);

      expect((body as { submissionId: string }).submissionId).toBeTruthy();
    });

    it("job produces separate build, lint and test statuses — all PASSED", async () => {
      await boot(PASS_CHECK);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.run-checks", undefined);

      const { body } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${submissionId}/checks`)
        .set(...authHeader(app, student))
        .expect(200);

      const run = body as {
        buildStatus: string;
        lintStatus: string;
        testStatus: string;
      };
      expect(run.buildStatus).toBe("PASSED");
      expect(run.lintStatus).toBe("PASSED");
      expect(run.testStatus).toBe("PASSED");
    });

    it("job produces separate statuses — lint and test FAILED but build PASSED", async () => {
      await boot(FAIL_CHECK);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.run-checks", undefined);

      const { body } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${submissionId}/checks`)
        .set(...authHeader(app, student))
        .expect(200);

      const run = body as {
        buildStatus: string;
        lintStatus: string;
        testStatus: string;
      };
      expect(run.buildStatus).toBe("PASSED");
      expect(run.lintStatus).toBe("FAILED");
      expect(run.testStatus).toBe("FAILED");
    });

    it("a failing check never blocks submission", async () => {
      await boot(FAIL_CHECK);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/enrol`)
        .set(...authHeader(app, admin))
        .send({ userId: student.userId });

      const { body } = await request(app.getHttpServer())
        .post(`/projects/${projectId}/milestones/${milestoneId}/submit`)
        .set(...authHeader(app, student))
        .send({ repositoryUrl: "https://github.com/student/failing-repo" })
        .expect(201);

      expect((body as { submissionId: string }).submissionId).toBeTruthy();
    });

    it("harness error is distinguishable from student code failing", async () => {
      await boot(new Error("Container runtime crashed"));
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.run-checks", undefined);

      const { body } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${submissionId}/checks`)
        .set(...authHeader(app, student))
        .expect(200);

      const run = body as {
        buildStatus: string;
        lintStatus: string;
        testStatus: string;
        harnessError: string;
      };
      expect(run.buildStatus).toBe("HARNESS_ERROR");
      expect(run.lintStatus).toBe("HARNESS_ERROR");
      expect(run.testStatus).toBe("HARNESS_ERROR");
      expect(run.harnessError).toBeTruthy();
    });

    it("check results are visible to the student who submitted", async () => {
      await boot(PASS_CHECK);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.run-checks", undefined);

      const { body } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${submissionId}/checks`)
        .set(...authHeader(app, student))
        .expect(200);

      expect((body as { buildStatus: string }).buildStatus).toBe("PASSED");
    });

    it("check results appear alongside the submission in the review queue", async () => {
      await boot(PASS_CHECK);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.run-checks", undefined);

      const { body } = await request(app.getHttpServer())
        .get("/project-review/queue")
        .set(...authHeader(app, instructor))
        .expect(200);

      const item = (body as { item: { checkRun: { buildStatus: string } } }).item;
      expect(item.checkRun.buildStatus).toBe("PASSED");
    });

    it("check run is idempotent — running the job twice does not double-run", async () => {
      const runner = stubCheckRunner(PASS_CHECK);
      const spy = jest.spyOn(runner, "runChecks");
      await boot(PASS_CHECK, EMPTY_SIMILARITY, runner);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.run-checks", undefined);
      await queue.enqueue("project.run-checks", undefined);

      const { body } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${submissionId}/checks`)
        .set(...authHeader(app, student))
        .expect(200);

      expect((body as { buildStatus: string }).buildStatus).toBe("PASSED");
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("ticket 23 – similarity screening", () => {
    const highScoreResult: SimilarityCheckResult = {
      cohortMatches: [
        {
          comparedSubmissionId: "",
          score: 85,
          matchedRegions: [{ path: "src/index.js", startLine: 1, endLine: 50 }],
        },
      ],
      publicMatches: [],
    };

    it("flag never blocks submission", async () => {
      await boot(PASS_CHECK, highScoreResult);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/enrol`)
        .set(...authHeader(app, admin))
        .send({ userId: student.userId });

      const { body } = await request(app.getHttpServer())
        .post(`/projects/${projectId}/milestones/${milestoneId}/submit`)
        .set(...authHeader(app, student))
        .send({ repositoryUrl: "https://github.com/student/repo" })
        .expect(201);

      expect((body as { submissionId: string }).submissionId).toBeTruthy();
    });

    it("flag never changes submission state", async () => {
      await boot(PASS_CHECK, highScoreResult);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.screen-similarity", undefined);

      const { body } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${submissionId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      const sub = body as { outcome: string | null };
      expect(sub.outcome).toBeNull();
    });

    it("student is never notified of a similarity flag", async () => {
      await boot(PASS_CHECK, highScoreResult);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.screen-similarity", undefined);

      const { body } = await request(app.getHttpServer())
        .get("/notifications")
        .set(...authHeader(app, student))
        .expect(200);

      const notifArray = (body as { data: Array<{ type: string }> }).data ?? [];
      const flag = notifArray.find((n) => n.type === "SIMILARITY_FLAG");
      expect(flag).toBeUndefined();
    });

    it("student cannot see a similarity flag through the submission detail route", async () => {
      await boot(PASS_CHECK, highScoreResult);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.screen-similarity", undefined);

      const { body } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${submissionId}`)
        .set(...authHeader(app, student))
        .expect(200);

      const detail = body as Record<string, unknown>;
      expect(detail["flags"]).toBeUndefined();
    });

    it("student cannot access the flags endpoint", async () => {
      await boot(PASS_CHECK, highScoreResult);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await request(app.getHttpServer())
        .get(`/project-review/submissions/${submissionId}/flags`)
        .set(...authHeader(app, student))
        .expect(403);
    });

    it("flags above threshold are surfaced to staff", async () => {
      await boot(PASS_CHECK, highScoreResult);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.screen-similarity", undefined);

      const { body } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${submissionId}/flags`)
        .set(...authHeader(app, admin))
        .expect(200);

      const flags = body as Array<{ score: string; source: string }>;
      expect(flags.length).toBeGreaterThan(0);
      expect(flags[0].source).toBe("COHORT");
    });

    it("flags appear alongside submission in the review queue for staff", async () => {
      await boot(PASS_CHECK, highScoreResult);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.screen-similarity", undefined);

      const { body } = await request(app.getHttpServer())
        .get("/project-review/queue")
        .set(...authHeader(app, instructor))
        .expect(200);

      const item = (body as { item: { flags: unknown[] } }).item;
      expect(item.flags).toBeDefined();
    });

    it("comparisons below the threshold are not surfaced", async () => {
      const lowScore: SimilarityCheckResult = {
        cohortMatches: [
          {
            comparedSubmissionId: randomUUID(),
            score: 30,
            matchedRegions: [],
          },
        ],
        publicMatches: [],
      };
      await boot(PASS_CHECK, lowScore);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.screen-similarity", undefined);

      const { body } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${submissionId}/flags`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect((body as unknown[]).length).toBe(0);
    });

    it("similarity flag threshold is owner-managed configuration", async () => {
      const score50Result: SimilarityCheckResult = {
        cohortMatches: [
          {
            comparedSubmissionId: randomUUID(),
            score: 50,
            matchedRegions: [],
          },
        ],
        publicMatches: [],
      };
      await boot(PASS_CHECK, score50Result);

      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);

      await request(app.getHttpServer())
        .put("/settings/projectReview")
        .set(...authHeader(app, admin))
        .send({ similarityFlagThreshold: 40 })
        .expect(200);

      const { submissionId: sub1Id } = await enrolAndSubmit(projectId, milestoneId, student);

      await queue.enqueue("project.screen-similarity", undefined);

      const { body: flags1 } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${sub1Id}/flags`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect((flags1 as unknown[]).length).toBeGreaterThan(0);

      await request(app.getHttpServer())
        .put("/settings/projectReview")
        .set(...authHeader(app, admin))
        .send({ similarityFlagThreshold: 60 })
        .expect(200);

      const { submissionId: sub2Id } = await enrolAndSubmit(projectId, milestoneId, otherStudent);

      await queue.enqueue("project.screen-similarity", undefined);

      const { body: flags2 } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${sub2Id}/flags`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect((flags2 as unknown[]).length).toBe(0);
    });

    it("public source matches are flagged when above threshold", async () => {
      const publicScore: SimilarityCheckResult = {
        cohortMatches: [],
        publicMatches: [
          {
            sourceLabel: "github.com/public/starter-template",
            score: 90,
            matchedRegions: [{ path: "README.md", startLine: 1, endLine: 10 }],
          },
        ],
      };
      await boot(PASS_CHECK, publicScore);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.screen-similarity", undefined);

      const { body } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${submissionId}/flags`)
        .set(...authHeader(app, admin))
        .expect(200);

      const flags = body as Array<{ source: string; comparedSourceLabel: string }>;
      const pub = flags.find((f) => f.source === "PUBLIC");
      expect(pub).toBeDefined();
      expect(pub?.comparedSourceLabel).toBe("github.com/public/starter-template");
    });
  });

  describe("ticket 24 – project review", () => {
    it("instructor can create a PASSED review with rubric scores", async () => {
      await boot(PASS_CHECK);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      const { body } = await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, instructor))
        .send({
          outcome: "PASSED",
          criteria: [{ criterionId, value: 8, comment: "Great work" }],
          summary: "Excellent submission",
        })
        .expect(201);

      const review = body as {
        outcome: string;
        summary: string;
        criterionScores: Array<{ criterionId: string; value: string }>;
        weightedScore: number;
      };
      expect(review.outcome).toBe("PASSED");
      expect(review.summary).toBe("Excellent submission");
      expect(review.criterionScores[0].criterionId).toBe(criterionId);
      expect(Number(review.criterionScores[0].value)).toBe(8);
      expect(review.weightedScore).toBeGreaterThan(0);
    });

    it("review passes the milestone and opens the next one", async () => {
      await boot(PASS_CHECK);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { body: project } = await request(app.getHttpServer())
        .post("/projects")
        .set(...authHeader(app, admin))
        .send({
          title: "Multi-milestone Project",
          brief: [{ type: "TEXT", text: "Build it." }],
          requirements: [],
          rubricId,
        })
        .expect(201);

      const pid = (project as { projectId: string }).projectId;
      const { body: ms1 } = await request(app.getHttpServer())
        .post(`/projects/${pid}/milestones`)
        .set(...authHeader(app, admin))
        .send({ ordinal: 1, title: "Milestone 1" })
        .expect(201);
      const { body: ms2 } = await request(app.getHttpServer())
        .post(`/projects/${pid}/milestones`)
        .set(...authHeader(app, admin))
        .send({ ordinal: 2, title: "Milestone 2" })
        .expect(201);

      const m1Id = (ms1 as Array<{ milestoneId: string }>)[0].milestoneId;
      const m2Id = (ms2 as Array<{ milestoneId: string }>)[1].milestoneId;

      await request(app.getHttpServer())
        .post(`/projects/${pid}/enrol`)
        .set(...authHeader(app, admin))
        .send({ userId: student.userId })
        .expect(201);

      const { body: sub } = await request(app.getHttpServer())
        .post(`/projects/${pid}/milestones/${m1Id}/submit`)
        .set(...authHeader(app, student))
        .send({ repositoryUrl: "https://github.com/student/repo" })
        .expect(201);

      const submissionId = (sub as { submissionId: string }).submissionId;

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, instructor))
        .send({
          outcome: "PASSED",
          criteria: [{ criterionId, value: 7 }],
        })
        .expect(201);

      const { body: progress } = await request(app.getHttpServer())
        .get(`/projects/${pid}/progress`)
        .set(...authHeader(app, student))
        .expect(200);

      const m2Progress = (progress as Array<{ milestoneId: string; state: string }>)
        .find((p) => p.milestoneId === m2Id);
      expect(m2Progress?.state).toBe("OPEN");
    });

    it("uses the Phase 3 rubric criteria — rejects a criterion from a different rubric", async () => {
      await boot(PASS_CHECK);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, instructor))
        .send({
          outcome: "PASSED",
          criteria: [{ criterionId: randomUUID(), value: 5 }],
        })
        .expect(400);
    });

    it("rejects criterion value above scaleMax", async () => {
      await boot(PASS_CHECK);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, instructor))
        .send({
          outcome: "PASSED",
          criteria: [{ criterionId, value: 999 }],
        })
        .expect(400);
    });

    it("student cannot create a review", async () => {
      await boot(PASS_CHECK);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, student))
        .send({
          outcome: "PASSED",
          criteria: [{ criterionId, value: 5 }],
        })
        .expect(403);
    });

    it("student can see their own review", async () => {
      await boot(PASS_CHECK);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, instructor))
        .send({ outcome: "PASSED", criteria: [{ criterionId, value: 6 }] })
        .expect(201);

      const { body } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, student))
        .expect(200);

      expect((body as { outcome: string }).outcome).toBe("PASSED");
    });

    it("another student cannot see someone else's review", async () => {
      await boot(PASS_CHECK);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, instructor))
        .send({ outcome: "PASSED", criteria: [{ criterionId, value: 6 }] })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, otherStudent))
        .expect(403);
    });

    it("sending media feedback normalises a CDN URL to storage key", async () => {
      await boot(PASS_CHECK);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      const { body } = await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, instructor))
        .send({
          outcome: "PASSED",
          criteria: [{ criterionId, value: 5 }],
          feedbackMediaId: "feedback/recording.mp4",
        })
        .expect(201);

      const review = body as { feedbackMediaUrl: string | null };
      expect(review.feedbackMediaUrl).not.toBeNull();
    });

    it("check results and similarity flags appear alongside the submission for reviewer", async () => {
      const highScore: SimilarityCheckResult = {
        cohortMatches: [],
        publicMatches: [
          {
            sourceLabel: "github.com/example/public",
            score: 80,
            matchedRegions: [],
          },
        ],
      };
      await boot(PASS_CHECK, highScore);
      const { rubricId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.run-checks", undefined);
      await queue.enqueue("project.screen-similarity", undefined);

      const { body } = await request(app.getHttpServer())
        .get("/project-review/queue")
        .set(...authHeader(app, instructor))
        .expect(200);

      const item = (body as {
        item: {
          checkRun: { buildStatus: string };
          flags: Array<{ source: string }>;
        };
      }).item;
      expect(item.checkRun.buildStatus).toBe("PASSED");
      expect(item.flags.length).toBeGreaterThan(0);
    });

    it("duplicate review is rejected with 409", async () => {
      await boot(PASS_CHECK);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, instructor))
        .send({ outcome: "PASSED", criteria: [{ criterionId, value: 7 }] })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, instructor))
        .send({ outcome: "PASSED", criteria: [{ criterionId, value: 7 }] })
        .expect(409);
    });

    it("notification is sent to student after review", async () => {
      await boot(PASS_CHECK);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, instructor))
        .send({ outcome: "PASSED", criteria: [{ criterionId, value: 8 }] })
        .expect(201);

      const { body } = await request(app.getHttpServer())
        .get("/notifications")
        .set(...authHeader(app, student))
        .expect(200);

      const notifData = (body as { data: Array<{ type: string }> }).data ?? [];
      const reviewed = notifData.find((n) => n.type === "PROJECT_MILESTONE_REVIEWED");
      expect(reviewed).toBeDefined();
    });
  });

  describe("ticket 25 – resubmission cycles", () => {
    it("reviewer can return a submission with feedback", async () => {
      await boot(PASS_CHECK);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      const { body } = await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, instructor))
        .send({
          outcome: "RETURNED",
          criteria: [{ criterionId, value: 3, comment: "Needs more tests" }],
          summary: "Please add unit tests",
        })
        .expect(201);

      expect((body as { outcome: string }).outcome).toBe("RETURNED");
    });

    it("a returned milestone can be resubmitted", async () => {
      await boot(PASS_CHECK);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, instructor))
        .send({ outcome: "RETURNED", criteria: [{ criterionId, value: 2 }] })
        .expect(201);

      const { body: resub } = await request(app.getHttpServer())
        .post(`/projects/${projectId}/milestones/${milestoneId}/submit`)
        .set(...authHeader(app, student))
        .send({ repositoryUrl: "https://github.com/student/fixed-repo" })
        .expect(201);

      expect((resub as { cycle: number }).cycle).toBe(1);
    });

    it("a passed milestone cannot be resubmitted", async () => {
      await boot(PASS_CHECK);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId } = await enrolAndSubmit(projectId, milestoneId);

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, instructor))
        .send({ outcome: "PASSED", criteria: [{ criterionId, value: 9 }] })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/milestones/${milestoneId}/submit`)
        .set(...authHeader(app, student))
        .send({ repositoryUrl: "https://github.com/student/yet-another" })
        .expect(409);
    });

    it("every cycle is retained — prior review is visible alongside new submission", async () => {
      await boot(PASS_CHECK);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId: sub0Id } = await enrolAndSubmit(projectId, milestoneId);

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${sub0Id}/review`)
        .set(...authHeader(app, instructor))
        .send({
          outcome: "RETURNED",
          criteria: [{ criterionId, value: 4, comment: "First review" }],
          summary: "First cycle feedback",
        })
        .expect(201);

      const { body: resub } = await request(app.getHttpServer())
        .post(`/projects/${projectId}/milestones/${milestoneId}/submit`)
        .set(...authHeader(app, student))
        .send({ repositoryUrl: "https://github.com/student/v2" })
        .expect(201);

      const sub1Id = (resub as { submissionId: string }).submissionId;

      const { body: queue } = await request(app.getHttpServer())
        .get("/project-review/queue")
        .set(...authHeader(app, instructor))
        .expect(200);

      const item = (queue as {
        item: { submissionId: string; previousReviews: Array<{ summary: string }> };
      }).item;
      expect(item.submissionId).toBe(sub1Id);
      expect(item.previousReviews.length).toBeGreaterThan(0);
      expect(item.previousReviews[0].summary).toBe("First cycle feedback");
    });

    it("resubmission re-runs automated checks", async () => {
      await boot(PASS_CHECK);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId: sub0Id } = await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.run-checks", undefined);

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${sub0Id}/review`)
        .set(...authHeader(app, instructor))
        .send({ outcome: "RETURNED", criteria: [{ criterionId, value: 3 }] })
        .expect(201);

      const { body: resub } = await request(app.getHttpServer())
        .post(`/projects/${projectId}/milestones/${milestoneId}/submit`)
        .set(...authHeader(app, student))
        .send({ repositoryUrl: "https://github.com/student/v2" })
        .expect(201);

      const sub1Id = (resub as { submissionId: string }).submissionId;

      await queue.enqueue("project.run-checks", undefined);

      const { body } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${sub1Id}/checks`)
        .set(...authHeader(app, student))
        .expect(200);

      expect((body as { buildStatus: string }).buildStatus).toBe("PASSED");
    });

    it("resubmission re-runs similarity screening", async () => {
      const highScore: SimilarityCheckResult = {
        cohortMatches: [],
        publicMatches: [
          { sourceLabel: "github.com/example", score: 80, matchedRegions: [] },
        ],
      };
      await boot(PASS_CHECK, highScore);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
      const { submissionId: sub0Id } = await enrolAndSubmit(projectId, milestoneId);

      await queue.enqueue("project.screen-similarity", undefined);

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${sub0Id}/review`)
        .set(...authHeader(app, instructor))
        .send({ outcome: "RETURNED", criteria: [{ criterionId, value: 2 }] })
        .expect(201);

      const { body: resub } = await request(app.getHttpServer())
        .post(`/projects/${projectId}/milestones/${milestoneId}/submit`)
        .set(...authHeader(app, student))
        .send({ repositoryUrl: "https://github.com/student/v2" })
        .expect(201);

      const sub1Id = (resub as { submissionId: string }).submissionId;

      await queue.enqueue("project.screen-similarity", undefined);

      const { body } = await request(app.getHttpServer())
        .get(`/project-review/submissions/${sub1Id}/flags`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect((body as unknown[]).length).toBeGreaterThan(0);
    });

    it("exceeding maxResubmissionCycles forces PASSED outcome", async () => {
      await boot(PASS_CHECK);
      const { rubricId, criterionId } = await createRubricWithCriteria();
      const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);

      const { submissionId: s0 } = await enrolAndSubmit(projectId, milestoneId);
      await submitAndReturn(s0, criterionId);

      for (let i = 1; i <= 4; i++) {
        const { body: sub } = await request(app.getHttpServer())
          .post(`/projects/${projectId}/milestones/${milestoneId}/submit`)
          .set(...authHeader(app, student))
          .send({ repositoryUrl: `https://github.com/student/v${i + 1}` })
          .expect(201);

        const sid = (sub as { submissionId: string }).submissionId;
        if (i < 5) {
          await submitAndReturn(sid, criterionId);
        }
      }

      const { body: finalSub } = await request(app.getHttpServer())
        .post(`/projects/${projectId}/milestones/${milestoneId}/submit`)
        .set(...authHeader(app, student))
        .send({ repositoryUrl: "https://github.com/student/v6" })
        .expect(201);

      const finalId = (finalSub as { submissionId: string; cycle: number }).submissionId;

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${finalId}/review`)
        .set(...authHeader(app, instructor))
        .send({ outcome: "RETURNED", criteria: [{ criterionId, value: 1 }] })
        .expect(422);
    });

    async function submitAndReturn(submissionId: string, criterionId: string) {
      await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, instructor))
        .send({ outcome: "RETURNED", criteria: [{ criterionId, value: 2 }] })
        .expect(201);
    }
  });
});
