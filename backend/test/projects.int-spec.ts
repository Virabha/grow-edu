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

describe("projects (tickets 19-21)", () => {
  let database: TestDatabase;
  let app: INestApplication;
  const clock = new TestClock();
  let admin: TestActor;
  let instructor: TestActor;
  let student: TestActor;
  let otherStudent: TestActor;
  let rubricId: string;

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
    otherStudent = await createUser(database, "LEARNER");
    rubricId = await createRubricViaHttp(admin);
  });

  async function createRubricViaHttp(actor: TestActor): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .post("/assessment/rubrics")
      .set(...authHeader(app, actor))
      .send({ title: "Project Rubric", scaleMax: 10 })
      .expect(201);
    return (body as { rubricId: string }).rubricId;
  }

  async function createProject(
    actor: TestActor = admin,
    overrides: Record<string, unknown> = {},
  ) {
    const { body } = await request(app.getHttpServer())
      .post("/projects")
      .set(...authHeader(app, actor))
      .send({
        title: "Build a REST API",
        brief: [{ type: "TEXT", text: "Build a full REST API." }],
        requirements: ["Must use Node.js", "Must have tests"],
        rubricId,
        ...overrides,
      })
      .expect(201);
    return body as {
      projectId: string;
      title: string;
      rubricId: string;
      rubric: { rubricId: string; title: string; scaleMax: number };
      milestones: unknown[];
    };
  }

  async function addMilestone(
    projectId: string,
    ordinal: number,
    title: string,
    actor: TestActor = admin,
  ) {
    const { body } = await request(app.getHttpServer())
      .post(`/projects/${projectId}/milestones`)
      .set(...authHeader(app, actor))
      .send({
        ordinal,
        title,
        description: [{ type: "TEXT", text: `Do ${title}` }],
      })
      .expect(201);
    return body as Array<{ milestoneId: string; ordinal: number; title: string }>;
  }

  function enrolStudent(
    projectId: string,
    userId: string,
    actor: TestActor = admin,
  ) {
    return request(app.getHttpServer())
      .post(`/projects/${projectId}/enrol`)
      .set(...authHeader(app, actor))
      .send({ userId });
  }

  function submitMilestone(
    projectId: string,
    milestoneId: string,
    actor: TestActor = student,
    overrides: Record<string, unknown> = {},
  ) {
    return request(app.getHttpServer())
      .post(`/projects/${projectId}/milestones/${milestoneId}/submit`)
      .set(...authHeader(app, actor))
      .send({
        repositoryUrl: "https://github.com/student/my-project",
        ...overrides,
      });
  }

  describe("ticket 19 – project brief", () => {
    it("creates a project with title, brief, requirements and rubric", async () => {
      const project = await createProject();
      expect(project.projectId).toBeTruthy();
      expect(project.title).toBe("Build a REST API");
      expect(project.rubricId).toBe(rubricId);
    });

    it("reuses the Phase 3 rubric model — rubricId is a reference to assessment_rubrics", async () => {
      const project = await createProject();
      expect(project.rubric.rubricId).toBe(rubricId);
      expect(project.rubric.title).toBe("Project Rubric");
      expect(project.rubric.scaleMax).toBe(10);
    });

    it("includes optional starter repository URL", async () => {
      const { body } = await request(app.getHttpServer())
        .post("/projects")
        .set(...authHeader(app, admin))
        .send({
          title: "Build a REST API",
          brief: [{ type: "TEXT", text: "Build it." }],
          requirements: ["Must work"],
          rubricId,
          starterRepositoryUrl: "https://github.com/org/starter-template",
        })
        .expect(201);
      expect((body as { starterRepositoryUrl: string }).starterRepositoryUrl).toBe(
        "https://github.com/org/starter-template",
      );
    });

    it("student can read a project and see the rubric they will be marked against", async () => {
      const project = await createProject();
      const { body } = await request(app.getHttpServer())
        .get(`/projects/${project.projectId}`)
        .set(...authHeader(app, student))
        .expect(200);
      expect((body as { rubric: { rubricId: string } }).rubric.rubricId).toBe(rubricId);
    });

    it("refuses a non-existent rubric", async () => {
      await request(app.getHttpServer())
        .post("/projects")
        .set(...authHeader(app, admin))
        .send({
          title: "Some Project",
          brief: [{ type: "TEXT", text: "desc" }],
          requirements: [],
          rubricId: randomUUID(),
        })
        .expect(404);
    });

    it("validates brief content blocks", async () => {
      await request(app.getHttpServer())
        .post("/projects")
        .set(...authHeader(app, admin))
        .send({
          title: "Some Project",
          brief: [{ type: "UNKNOWN_TYPE", text: "oops" }],
          requirements: [],
          rubricId,
        })
        .expect(400);
    });

    it("an instructor can create projects", async () => {
      const project = await createProject(instructor);
      expect(project.projectId).toBeTruthy();
    });

    it("a student cannot create projects", async () => {
      await request(app.getHttpServer())
        .post("/projects")
        .set(...authHeader(app, student))
        .send({
          title: "Hack",
          brief: [{ type: "TEXT", text: "desc" }],
          requirements: [],
          rubricId,
        })
        .expect(403);
    });

    it("can update project title", async () => {
      const project = await createProject();
      const { body } = await request(app.getHttpServer())
        .patch(`/projects/${project.projectId}`)
        .set(...authHeader(app, admin))
        .send({ title: "Build a GraphQL API" })
        .expect(200);
      expect((body as { title: string }).title).toBe("Build a GraphQL API");
    });

    it("soft-deletes a project", async () => {
      const project = await createProject();
      await request(app.getHttpServer())
        .delete(`/projects/${project.projectId}`)
        .set(...authHeader(app, admin))
        .expect(200);

      await request(app.getHttpServer())
        .get(`/projects/${project.projectId}`)
        .set(...authHeader(app, student))
        .expect(404);
    });
  });

  describe("ticket 20 – milestones unlocking in sequence", () => {
    it("adds ordered milestones to a project", async () => {
      const project = await createProject();
      const milestones = await addMilestone(project.projectId, 1, "Setup");
      expect(milestones).toHaveLength(1);
      expect(milestones[0].ordinal).toBe(1);
      expect(milestones[0].title).toBe("Setup");
    });

    it("lists milestones ordered by ordinal", async () => {
      const project = await createProject();
      await addMilestone(project.projectId, 2, "Feature");
      await addMilestone(project.projectId, 1, "Setup");
      const { body } = await request(app.getHttpServer())
        .get(`/projects/${project.projectId}/milestones`)
        .set(...authHeader(app, student))
        .expect(200);
      const ms = body as Array<{ ordinal: number }>;
      expect(ms[0].ordinal).toBe(1);
      expect(ms[1].ordinal).toBe(2);
    });

    it("only the first milestone is OPEN after enrolment", async () => {
      const project = await createProject();
      const after1 = await addMilestone(project.projectId, 1, "Setup");
      const after2 = await addMilestone(project.projectId, 2, "Feature");
      const after3 = await addMilestone(project.projectId, 3, "Deploy");

      const m1Id = after1[0].milestoneId;
      const m2Id = after2[1].milestoneId;
      const m3Id = after3[2].milestoneId;

      await enrolStudent(project.projectId, student.userId);

      const { body } = await request(app.getHttpServer())
        .get(`/projects/${project.projectId}/progress`)
        .set(...authHeader(app, student))
        .expect(200);

      const progress = body as Array<{ state: string; milestoneId: string }>;
      expect(progress).toHaveLength(3);

      const byMilestone = (id: string) => progress.find((p) => p.milestoneId === id);
      expect(byMilestone(m1Id)?.state).toBe("OPEN");
      expect(byMilestone(m2Id)?.state).toBe("LOCKED");
      expect(byMilestone(m3Id)?.state).toBe("LOCKED");
    });

    it("submitting to a LOCKED milestone is refused", async () => {
      const project = await createProject();
      const milestones1 = await addMilestone(project.projectId, 1, "Setup");
      const milestones2 = await addMilestone(project.projectId, 2, "Feature");

      await enrolStudent(project.projectId, student.userId);

      const lockedMilestoneId = milestones2[1].milestoneId;
      await submitMilestone(project.projectId, lockedMilestoneId).expect(409);
    });

    it("passing milestone 1 opens milestone 2 and leaves milestone 3 LOCKED", async () => {
      const project = await createProject();
      const m1 = (await addMilestone(project.projectId, 1, "Setup"))[0];
      const afterAddM2 = await addMilestone(project.projectId, 2, "Feature");
      const afterAddM3 = await addMilestone(project.projectId, 3, "Deploy");
      const m2Id = afterAddM2[1].milestoneId;
      const m3Id = afterAddM3[2].milestoneId;

      await enrolStudent(project.projectId, student.userId).expect(201);
      const { body: sub } = await submitMilestone(project.projectId, m1.milestoneId).expect(201);
      const submissionId = (sub as { submissionId: string }).submissionId;

      await request(app.getHttpServer())
        .post(`/project-review/submissions/${submissionId}/review`)
        .set(...authHeader(app, instructor))
        .send({ outcome: "PASSED", criteria: [] })
        .expect(201);

      const { body: progress } = await request(app.getHttpServer())
        .get(`/projects/${project.projectId}/progress`)
        .set(...authHeader(app, student))
        .expect(200);

      const progressArr = progress as Array<{ milestoneId: string; state: string }>;
      const m2Progress = progressArr.find((p) => p.milestoneId === m2Id);
      const m3Progress = progressArr.find((p) => p.milestoneId === m3Id);
      expect(m2Progress?.state).toBe("OPEN");
      expect(m3Progress?.state).toBe("LOCKED");
    });

    it("returning a milestone leaves it RETURNED and the next still LOCKED", async () => {
      const project = await createProject();
      const m1 = (await addMilestone(project.projectId, 1, "Setup"))[0];
      await addMilestone(project.projectId, 2, "Feature");

      await enrolStudent(project.projectId, student.userId);
      await submitMilestone(project.projectId, m1.milestoneId).expect(201);

      const { projectMilestoneProgress } = await import("../src/database/schema");
      const { eq, and } = await import("drizzle-orm");

      const service = app.get(
        (await import("../src/projects/projects.service")).ProjectsService,
        { strict: false },
      );
      await service.markMilestoneReturned(m1.milestoneId, student.userId);

      const progressAfter = await database.db
        .select()
        .from(projectMilestoneProgress)
        .where(
          and(
            eq(projectMilestoneProgress.projectId, project.projectId),
            eq(projectMilestoneProgress.userId, student.userId),
          ),
        );

      const { projectMilestones: milestonesTable } = await import("../src/database/schema");
      const allMilestones = await database.db
        .select()
        .from(milestonesTable)
        .where(eq(milestonesTable.projectId, project.projectId));

      const m1Row = progressAfter.find((p) => p.milestoneId === m1.milestoneId);
      const m2 = allMilestones.find((m) => m.ordinal === 2);
      const m2Row = progressAfter.find((p) => p.milestoneId === m2?.milestoneId);

      expect(m1Row?.state).toBe("RETURNED");
      expect(m2Row?.state).toBe("LOCKED");
    });

    it("student can resubmit after RETURNED with incremented cycle", async () => {
      const project = await createProject();
      const m1 = (await addMilestone(project.projectId, 1, "Setup"))[0];

      await enrolStudent(project.projectId, student.userId);
      await submitMilestone(project.projectId, m1.milestoneId).expect(201);

      const service = app.get(
        (await import("../src/projects/projects.service")).ProjectsService,
        { strict: false },
      );
      await service.markMilestoneReturned(m1.milestoneId, student.userId);

      const { body } = await submitMilestone(project.projectId, m1.milestoneId).expect(201);
      expect((body as { cycle: number }).cycle).toBe(1);
    });

    it("refuses to enrol the same student twice", async () => {
      const project = await createProject();
      await addMilestone(project.projectId, 1, "Setup");
      await enrolStudent(project.projectId, student.userId).expect(201);
      await enrolStudent(project.projectId, student.userId).expect(409);
    });
  });

  describe("ticket 21 – repository submission", () => {
    it("creates a submission with repositoryUrl and optional deploymentUrl", async () => {
      const project = await createProject();
      const m1 = (await addMilestone(project.projectId, 1, "Setup"))[0];
      await enrolStudent(project.projectId, student.userId);

      const { body } = await submitMilestone(project.projectId, m1.milestoneId, student, {
        repositoryUrl: "https://github.com/student/project",
        deploymentUrl: "https://my-project.vercel.app",
      }).expect(201);

      expect((body as { repositoryUrl: string }).repositoryUrl).toBe(
        "https://github.com/student/project",
      );
      expect((body as { deploymentUrl: string }).deploymentUrl).toBe(
        "https://my-project.vercel.app",
      );
    });

    it("attaches submission to exactly one milestone", async () => {
      const project = await createProject();
      const m1 = (await addMilestone(project.projectId, 1, "Setup"))[0];
      await enrolStudent(project.projectId, student.userId);

      const { body } = await submitMilestone(project.projectId, m1.milestoneId).expect(201);
      expect((body as { milestoneId: string }).milestoneId).toBe(m1.milestoneId);
      expect((body as { projectId: string }).projectId).toBe(project.projectId);
    });

    it("refuses a malformed repository URL", async () => {
      const project = await createProject();
      const m1 = (await addMilestone(project.projectId, 1, "Setup"))[0];
      await enrolStudent(project.projectId, student.userId);

      await request(app.getHttpServer())
        .post(`/projects/${project.projectId}/milestones/${m1.milestoneId}/submit`)
        .set(...authHeader(app, student))
        .send({ repositoryUrl: "not-a-url" })
        .expect(400);
    });

    it("refuses a repository URL without a protocol", async () => {
      const project = await createProject();
      const m1 = (await addMilestone(project.projectId, 1, "Setup"))[0];
      await enrolStudent(project.projectId, student.userId);

      await request(app.getHttpServer())
        .post(`/projects/${project.projectId}/milestones/${m1.milestoneId}/submit`)
        .set(...authHeader(app, student))
        .send({ repositoryUrl: "github.com/student/project" })
        .expect(400);
    });

    it("a student sees their own submissions and nobody else's", async () => {
      const project = await createProject();
      const m1 = (await addMilestone(project.projectId, 1, "Setup"))[0];
      await enrolStudent(project.projectId, student.userId);
      await enrolStudent(project.projectId, otherStudent.userId);

      await submitMilestone(project.projectId, m1.milestoneId, student).expect(201);
      await submitMilestone(project.projectId, m1.milestoneId, otherStudent).expect(201);

      const { body: studentSubs } = await request(app.getHttpServer())
        .get(`/projects/${project.projectId}/submissions`)
        .set(...authHeader(app, student))
        .expect(200);

      const subs = studentSubs as Array<{ userId: string }>;
      expect(subs).toHaveLength(1);
      expect(subs[0].userId).toBe(student.userId);
    });

    it("staff see all submissions", async () => {
      const project = await createProject();
      const m1 = (await addMilestone(project.projectId, 1, "Setup"))[0];
      await enrolStudent(project.projectId, student.userId);
      await enrolStudent(project.projectId, otherStudent.userId);

      await submitMilestone(project.projectId, m1.milestoneId, student).expect(201);
      await submitMilestone(project.projectId, m1.milestoneId, otherStudent).expect(201);

      const { body: adminSubs } = await request(app.getHttpServer())
        .get(`/projects/${project.projectId}/submissions`)
        .set(...authHeader(app, admin))
        .expect(200);

      expect((adminSubs as unknown[]).length).toBe(2);
    });

    it("there is no file-upload path for project work", async () => {
      await request(app.getHttpServer())
        .post("/projects/upload")
        .set(...authHeader(app, student))
        .expect([404, 403]);
    });
  });
});
