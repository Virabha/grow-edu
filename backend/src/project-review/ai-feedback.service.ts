import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { asc, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AiService } from "../ai/ai.service";
import { OPUS } from "../ai/model-provider";
import { FieldSpec } from "../ai/structured";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  aiProjectFeedbackDrafts,
  aiProjectSuggestedScores,
  assessmentRubricCriteria,
  assessmentRubrics,
  projectMilestones,
  projectSubmissions,
  projects,
} from "../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../jobs/job-queue";

export const AI_PROJECT_FEEDBACK_DRAIN = "ai.project-feedback.drain";
const DRAIN_INTERVAL_MS = 20_000;
const MAX_TOKENS = 1500;
const FEATURE = "project-feedback";

interface SuggestedScore {
  criterionId: string;
  suggestedValue: number;
  rationale: string;
}

interface FeedbackOutput {
  readabilitySummary: string;
  structureSummary: string;
  suggestedScores: SuggestedScore[];
}

function buildReviewSpec(criterionIds: string[]): FieldSpec {
  return {
    type: "object",
    fields: {
      readabilitySummary: { type: "string", minLength: 30 },
      structureSummary: { type: "string", minLength: 30 },
      suggestedScores: {
        type: "array",
        items: {
          type: "object",
          fields: {
            criterionId: { type: "string", enum: criterionIds.length > 0 ? criterionIds : undefined },
            suggestedValue: { type: "number", minimum: 0 },
            rationale: { type: "string", minLength: 10 },
          },
        },
      },
    },
  };
}

@Injectable()
export class AiProjectFeedbackService implements OnModuleInit {
  private readonly logger = new Logger(AiProjectFeedbackService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    private readonly ai: AiService,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      AI_PROJECT_FEEDBACK_DRAIN,
      async () => {
        await this.drain();
      },
      DRAIN_INTERVAL_MS,
      (err) =>
        this.logger.error("Failed to schedule project feedback drain", err),
    );
  }

  async drain(): Promise<void> {
    const pending = await this.db
      .select({
        submissionId: projectSubmissions.submissionId,
        projectId: projectSubmissions.projectId,
        milestoneId: projectSubmissions.milestoneId,
        userId: projectSubmissions.userId,
        repositoryUrl: projectSubmissions.repositoryUrl,
        organizationId: projectSubmissions.organizationId,
      })
      .from(projectSubmissions)
      .leftJoin(
        aiProjectFeedbackDrafts,
        eq(
          aiProjectFeedbackDrafts.submissionId,
          projectSubmissions.submissionId,
        ),
      )
      .where(isNull(aiProjectFeedbackDrafts.draftId))
      .orderBy(asc(projectSubmissions.submittedAt))
      .limit(5);

    for (const sub of pending) {
      await this.processFeedback(sub);
    }
  }

  private async processFeedback(sub: {
    submissionId: string;
    projectId: string;
    milestoneId: string;
    userId: string;
    repositoryUrl: string;
    organizationId: string;
  }): Promise<void> {
    const now = this.clock.now();

    const inserted = await this.db
      .insert(aiProjectFeedbackDrafts)
      .values({
        submissionId: sub.submissionId,
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({ draftId: aiProjectFeedbackDrafts.draftId });

    if (inserted.length === 0) return;

    const draftId = inserted[0].draftId;

    const [project] = await this.db
      .select({
        title: projects.title,
        requirements: projects.requirements,
        rubricId: projects.rubricId,
      })
      .from(projects)
      .where(eq(projects.projectId, sub.projectId))
      .limit(1);

    if (!project) {
      await this.markFailed(draftId, "Project not found");
      return;
    }

    const [milestone] = await this.db
      .select({ title: projectMilestones.title })
      .from(projectMilestones)
      .where(eq(projectMilestones.milestoneId, sub.milestoneId))
      .limit(1);

    const criteria = await this.db
      .select()
      .from(assessmentRubricCriteria)
      .where(eq(assessmentRubricCriteria.rubricId, project.rubricId))
      .orderBy(asc(assessmentRubricCriteria.order));

    const [rubric] = await this.db
      .select({ scaleMax: assessmentRubrics.scaleMax })
      .from(assessmentRubrics)
      .where(eq(assessmentRubrics.rubricId, project.rubricId))
      .limit(1);

    const sources = [
      {
        sourceId: `project:${sub.projectId}`,
        kind: "project",
        title: `Project: ${project.title}`,
        body: [
          `Requirements:\n${(project.requirements as string[]).map((r, i) => `${i + 1}. ${r}`).join("\n")}`,
          milestone ? `Milestone: ${milestone.title}` : "",
          `Repository: ${sub.repositoryUrl}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
      {
        sourceId: `rubric:${project.rubricId}`,
        kind: "rubric",
        title: "Assessment rubric",
        body: criteria
          .map(
            (c) =>
              `Criterion ID: ${c.criterionId}\nLabel: ${c.label}\nWeight: ${c.weight}`,
          )
          .join("\n\n"),
      },
    ];

    const criterionIds = criteria.map((c) => c.criterionId);
    const scaleMax = rubric?.scaleMax ?? 10;

    const instructions = [
      "You provide an automated first-pass review of a student project submission for an instructor.",
      "This draft is for the reviewer only and must never be shown to the student until the reviewer commits it.",
      "Provide:",
      "- readabilitySummary: overall code readability and documentation quality",
      "- structureSummary: project structure, organisation and architectural choices",
      `- suggestedScores: suggested score for each rubric criterion (scale 0 to ${scaleMax}), with a brief rationale`,
      "You MUST NOT assign marks. These are suggestions for the human reviewer to accept or override.",
      "Do not access the repository — assess based on the project requirements and rubric provided.",
    ].join("\n");

    const spec = buildReviewSpec(criterionIds);

    const outcome = await this.ai.completeStructured<FeedbackOutput>(
      {
        feature: FEATURE,
        model: OPUS,
        organizationId: sub.organizationId,
        instructions,
        sources,
        question: "Generate a first-pass review for this project submission.",
        maxTokens: MAX_TOKENS,
      },
      spec,
    );

    const updateNow = this.clock.now();

    if (!outcome.ok) {
      await this.markFailed(draftId, outcome.reason);
      return;
    }

    const validScores = outcome.value.suggestedScores.filter(
      (s) =>
        criterionIds.includes(s.criterionId) &&
        Number(s.suggestedValue) >= 0 &&
        Number(s.suggestedValue) <= scaleMax,
    );

    await this.db.transaction(async (tx) => {
      await tx
        .update(aiProjectFeedbackDrafts)
        .set({
          status: "READY",
          readabilitySummary: outcome.value.readabilitySummary,
          structureSummary: outcome.value.structureSummary,
          updatedAt: updateNow,
        })
        .where(eq(aiProjectFeedbackDrafts.draftId, draftId));

      for (const score of validScores) {
        await tx
          .insert(aiProjectSuggestedScores)
          .values({
            draftId,
            criterionId: score.criterionId,
            suggestedValue: String(score.suggestedValue),
            rationale: score.rationale,
          })
          .onConflictDoNothing();
      }
    });
  }

  async getDraft(submissionId: string) {
    const [submission] = await this.db
      .select({ submissionId: projectSubmissions.submissionId })
      .from(projectSubmissions)
      .where(eq(projectSubmissions.submissionId, submissionId))
      .limit(1);

    if (!submission) throw new NotFoundException("Submission not found");

    const [draft] = await this.db
      .select()
      .from(aiProjectFeedbackDrafts)
      .where(eq(aiProjectFeedbackDrafts.submissionId, submissionId))
      .limit(1);

    if (!draft) return { submissionId, status: "PENDING" as const };

    const scores = await this.db
      .select()
      .from(aiProjectSuggestedScores)
      .where(eq(aiProjectSuggestedScores.draftId, draft.draftId));

    return {
      submissionId,
      status: draft.status,
      readabilitySummary: draft.readabilitySummary,
      structureSummary: draft.structureSummary,
      suggestedScores: scores.map((s) => ({
        criterionId: s.criterionId,
        suggestedValue: s.suggestedValue,
        rationale: s.rationale,
      })),
    };
  }

  async discardDraft(submissionId: string) {
    const [draft] = await this.db
      .select({ draftId: aiProjectFeedbackDrafts.draftId, status: aiProjectFeedbackDrafts.status })
      .from(aiProjectFeedbackDrafts)
      .where(eq(aiProjectFeedbackDrafts.submissionId, submissionId))
      .limit(1);

    if (!draft) throw new NotFoundException("No AI feedback draft found for this submission");

    if (draft.status === "DISCARDED") {
      return { submissionId, discarded: true };
    }

    await this.db
      .update(aiProjectFeedbackDrafts)
      .set({
        status: "DISCARDED",
        discardedAt: this.clock.now(),
        updatedAt: this.clock.now(),
      })
      .where(eq(aiProjectFeedbackDrafts.draftId, draft.draftId));

    return { submissionId, discarded: true };
  }

  private async markFailed(draftId: string, reason: string): Promise<void> {
    await this.db
      .update(aiProjectFeedbackDrafts)
      .set({
        status: "FAILED",
        failureReason: reason.slice(0, 400),
        updatedAt: this.clock.now(),
      })
      .where(eq(aiProjectFeedbackDrafts.draftId, draftId));
  }
}
