import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { MODEL_PROVIDER } from '../src/ai/model-provider';
import { AI_PROJECT_FEEDBACK_DRAIN } from '../src/project-review/ai-feedback.service';
import { PROJECT_CHECK_RUNNER } from '../src/project-review/check-runner';
import { PROJECT_SIMILARITY_PROVIDER } from '../src/project-review/similarity-provider';
import { InlineJobQueue } from '../src/jobs/inline-job-queue';
import { JOB_QUEUE } from '../src/jobs/job-queue';
import { createTestApp, authHeader, TestActor } from './support/test-app';
import { createTestDatabase, truncateAll, TestDatabase } from './support/test-database';
import { TestClock } from './support/test-clock';
import { createUser } from './support/factories';
import { makeModelProvider, RecordingModelProvider } from './support/ai-factories';

describe('ai project feedback', () => {
  let database: TestDatabase;
  let app: INestApplication;
  let queue: InlineJobQueue;
  let modelProvider: RecordingModelProvider;
  const clock = new TestClock();

  let admin: TestActor;
  let instructor: TestActor;
  let student: TestActor;

  beforeAll(async () => {
    database = await createTestDatabase();
    modelProvider = makeModelProvider();
    app = await createTestApp(database, clock, [
      { token: MODEL_PROVIDER, value: modelProvider },
      {
        token: PROJECT_CHECK_RUNNER,
        value: { runChecks: async () => ({ buildStatus: 'PASSED', lintStatus: 'PASSED', testStatus: 'PASSED', detail: {} }) },
      },
      {
        token: PROJECT_SIMILARITY_PROVIDER,
        value: { compare: async () => ({ cohortMatches: [], publicMatches: [] }) },
      },
    ]);
    queue = app.get<InlineJobQueue>(JOB_QUEUE);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (database) await database.destroy();
  });

  beforeEach(async () => {
    clock.reset();
    await truncateAll(database);
    modelProvider.calls = [];
    modelProvider.batches = [];
    modelProvider.failNext = false;
    modelProvider.structuredFor = () => null;

    admin = await createUser(database, 'PLATFORM_ADMIN');
    instructor = await createUser(database, 'INSTRUCTOR');
    student = await createUser(database, 'LEARNER');
  });

  async function createRubricWithCriterion() {
    const { body: rubric } = await request(app.getHttpServer())
      .post('/assessment/rubrics')
      .set(...authHeader(app, admin))
      .send({ title: 'Project Rubric', scaleMax: 10 })
      .expect(201);

    const rubricId = (rubric as { rubricId: string }).rubricId;

    const { body: withCriterion } = await request(app.getHttpServer())
      .post(`/assessment/rubrics/${rubricId}/criteria`)
      .set(...authHeader(app, admin))
      .send({ label: 'Code Quality', weight: 1 })
      .expect(201);

    const criterionId = (withCriterion as { criteria: Array<{ criterionId: string }> }).criteria[0].criterionId;
    return { rubricId, criterionId };
  }

  async function createProjectWithMilestone(rubricId: string) {
    const { body: project } = await request(app.getHttpServer())
      .post('/projects')
      .set(...authHeader(app, admin))
      .send({
        title: 'Build a REST API',
        brief: [{ type: 'TEXT', text: 'Build it.' }],
        requirements: ['Must use Node.js', 'Must include tests'],
        rubricId,
      })
      .expect(201);

    const projectId = (project as { projectId: string }).projectId;

    const { body: milestones } = await request(app.getHttpServer())
      .post(`/projects/${projectId}/milestones`)
      .set(...authHeader(app, admin))
      .send({ ordinal: 1, title: 'Setup and scaffold' })
      .expect(201);

    return {
      projectId,
      milestoneId: (milestones as Array<{ milestoneId: string }>)[0].milestoneId,
    };
  }

  async function enrolAndSubmit(projectId: string, milestoneId: string) {
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/enrol`)
      .set(...authHeader(app, admin))
      .send({ userId: student.userId })
      .expect(201);

    const { body: submission } = await request(app.getHttpServer())
      .post(`/projects/${projectId}/milestones/${milestoneId}/submit`)
      .set(...authHeader(app, student))
      .send({ repositoryUrl: 'https://github.com/student/repo' })
      .expect(201);

    return (submission as { submissionId: string }).submissionId;
  }

  it('returns pending before the drain fires', async () => {
    const { rubricId } = await createRubricWithCriterion();
    const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
    const submissionId = await enrolAndSubmit(projectId, milestoneId);

    const res = await request(app.getHttpServer())
      .get(`/project-review/submissions/${submissionId}/ai-feedback`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(res.body.status).toBe('PENDING');
  });

  it('produces a draft with readability and structure summaries after drain', async () => {
    const { rubricId, criterionId } = await createRubricWithCriterion();
    const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
    const submissionId = await enrolAndSubmit(projectId, milestoneId);

    modelProvider.structuredFor = () => ({
      readabilitySummary: 'The code is well documented and readable throughout.',
      structureSummary: 'Clean folder structure following MVC conventions overall.',
      suggestedScores: [
        { criterionId, suggestedValue: 8, rationale: 'Good quality overall.' },
      ],
    });

    await queue.enqueue(AI_PROJECT_FEEDBACK_DRAIN, undefined);

    const res = await request(app.getHttpServer())
      .get(`/project-review/submissions/${submissionId}/ai-feedback`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(res.body.status).toBe('READY');
    expect(res.body.readabilitySummary).toBeTruthy();
    expect(res.body.structureSummary).toBeTruthy();
    expect(res.body.suggestedScores).toHaveLength(1);
    expect(res.body.suggestedScores[0].criterionId).toBe(criterionId);
  });

  it('suggested scores are stored separately — not in committed criterion scores', async () => {
    const { rubricId, criterionId } = await createRubricWithCriterion();
    const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
    const submissionId = await enrolAndSubmit(projectId, milestoneId);

    modelProvider.structuredFor = () => ({
      readabilitySummary: 'Code is readable with consistent naming conventions.',
      structureSummary: 'Good structure with clear separation of concerns.',
      suggestedScores: [
        { criterionId, suggestedValue: 7, rationale: 'Meets requirements well.' },
      ],
    });

    await queue.enqueue(AI_PROJECT_FEEDBACK_DRAIN, undefined);

    const submitReview = await request(app.getHttpServer())
      .post(`/project-review/submissions/${submissionId}/review`)
      .set(...authHeader(app, admin))
      .send({
        outcome: 'PASSED',
        summary: 'Good work.',
        criteria: [{ criterionId, value: 9, comment: 'Excellent.' }],
      });

    expect(submitReview.status).toBe(201);

    const reviewDetails = await request(app.getHttpServer())
      .get(`/project-review/submissions/${submissionId}/review`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(reviewDetails.body.outcome).toBe('PASSED');
  });

  it('draft is never visible to the student', async () => {
    const { rubricId } = await createRubricWithCriterion();
    const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
    const submissionId = await enrolAndSubmit(projectId, milestoneId);

    modelProvider.structuredFor = () => ({
      readabilitySummary: 'The code is well documented with clear variable names.',
      structureSummary: 'Project follows a clean modular structure throughout.',
      suggestedScores: [],
    });

    await queue.enqueue(AI_PROJECT_FEEDBACK_DRAIN, undefined);

    await request(app.getHttpServer())
      .get(`/project-review/submissions/${submissionId}/ai-feedback`)
      .set(...authHeader(app, student))
      .expect(403);
  });

  it('reviewer can discard the draft', async () => {
    const { rubricId } = await createRubricWithCriterion();
    const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
    const submissionId = await enrolAndSubmit(projectId, milestoneId);

    modelProvider.structuredFor = () => ({
      readabilitySummary: 'The code is well documented with clear variable names.',
      structureSummary: 'Project follows a clean modular structure throughout.',
      suggestedScores: [],
    });

    await queue.enqueue(AI_PROJECT_FEEDBACK_DRAIN, undefined);

    await request(app.getHttpServer())
      .delete(`/project-review/submissions/${submissionId}/ai-feedback`)
      .set(...authHeader(app, admin))
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/project-review/submissions/${submissionId}/ai-feedback`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(res.body.status).toBe('DISCARDED');
  });

  it('marks draft as failed when model call fails', async () => {
    const { rubricId } = await createRubricWithCriterion();
    const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
    const submissionId = await enrolAndSubmit(projectId, milestoneId);

    modelProvider.failNext = true;
    await queue.enqueue(AI_PROJECT_FEEDBACK_DRAIN, undefined);

    const res = await request(app.getHttpServer())
      .get(`/project-review/submissions/${submissionId}/ai-feedback`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(res.body.status).toBe('FAILED');
  });

  it('does not run feedback twice for the same submission', async () => {
    const { rubricId } = await createRubricWithCriterion();
    const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
    await enrolAndSubmit(projectId, milestoneId);

    modelProvider.structuredFor = () => ({
      readabilitySummary: 'The code is well documented with clear variable names.',
      structureSummary: 'Project follows a clean modular structure throughout.',
      suggestedScores: [],
    });

    await queue.enqueue(AI_PROJECT_FEEDBACK_DRAIN, undefined);
    const callsAfterFirst = modelProvider.calls.length;

    await queue.enqueue(AI_PROJECT_FEEDBACK_DRAIN, undefined);
    expect(modelProvider.calls.length).toBe(callsAfterFirst);
  });

  it('committed review record carries the reviewer userId', async () => {
    const { rubricId, criterionId } = await createRubricWithCriterion();
    const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
    const submissionId = await enrolAndSubmit(projectId, milestoneId);

    modelProvider.structuredFor = () => ({
      readabilitySummary: 'Code is well documented.',
      structureSummary: 'Good structure.',
      suggestedScores: [{ criterionId, suggestedValue: 7, rationale: 'Good.' }],
    });

    await queue.enqueue(AI_PROJECT_FEEDBACK_DRAIN, undefined);

    const submitRes = await request(app.getHttpServer())
      .post(`/project-review/submissions/${submissionId}/review`)
      .set(...authHeader(app, admin))
      .send({
        outcome: 'PASSED',
        summary: 'Well done.',
        criteria: [{ criterionId, value: 8, comment: 'Strong effort.' }],
      })
      .expect(201);

    expect(submitRes.body.reviewerId).toBe(admin.userId);
  });

  it('automated feedback does not set a mark — AI never assigns a score', async () => {
    const { rubricId, criterionId } = await createRubricWithCriterion();
    const { projectId, milestoneId } = await createProjectWithMilestone(rubricId);
    const submissionId = await enrolAndSubmit(projectId, milestoneId);

    modelProvider.structuredFor = () => ({
      readabilitySummary: 'The code is very readable with excellent documentation.',
      structureSummary: 'Outstanding project structure with clear organisation.',
      suggestedScores: [
        { criterionId, suggestedValue: 10, rationale: 'Perfect implementation meeting all criteria.' },
      ],
    });

    await queue.enqueue(AI_PROJECT_FEEDBACK_DRAIN, undefined);

    const res = await request(app.getHttpServer())
      .get(`/project-review/submissions/${submissionId}/ai-feedback`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect(res.body.status).toBe('READY');

    const detail = await request(app.getHttpServer())
      .get(`/project-review/submissions/${submissionId}`)
      .set(...authHeader(app, admin))
      .expect(200);

    expect((detail.body as { outcome?: unknown }).outcome).toBeNull();
  });
});
