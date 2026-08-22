import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnprocessableEntityException,
} from "@nestjs/common";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  projectCheckRuns,
  projectCriterionScores,
  projectMilestoneProgress,
  projectMilestones,
  projectReviews,
  projectSimilarityFlags,
  projectSubmissions,
  projects,
} from "../database/schema";
import { FilesService } from "../files/files.service";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../jobs/job-queue";
import { NotificationsService } from "../notifications/notifications.service";
import { ProjectsService } from "../projects/projects.service";
import { RubricService } from "../assessment/grading/rubric.service";
import { SettingsService } from "../settings/settings.service";
import { PROJECT_REVIEW_SETTINGS_GROUP } from "../settings/settings.definitions";
import {
  PROJECT_CHECK_RUNNER,
  ProjectCheckRunner,
} from "./check-runner";
import {
  CohortEntry,
  PROJECT_SIMILARITY_PROVIDER,
  ProjectSimilarityProvider,
} from "./similarity-provider";
import { CreateProjectReviewDto } from "./dto/project-review.dto";

const JOB_RUN_CHECKS = "project.run-checks";
const JOB_SCREEN_SIMILARITY = "project.screen-similarity";
const CHECKS_INTERVAL_MS = 30_000;
const SIMILARITY_INTERVAL_MS = 60_000;

@Injectable()
export class ProjectReviewService implements OnModuleInit {
  private readonly logger = new Logger(ProjectReviewService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
    @Inject(PROJECT_CHECK_RUNNER)
    private readonly checkRunner: ProjectCheckRunner,
    @Inject(PROJECT_SIMILARITY_PROVIDER)
    private readonly similarityProvider: ProjectSimilarityProvider,
    private readonly projectsService: ProjectsService,
    private readonly rubrics: RubricService,
    private readonly files: FilesService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      JOB_RUN_CHECKS,
      () => this.processCheckJobs(),
      CHECKS_INTERVAL_MS,
      (err) => this.logger.error("Failed to schedule check runs", err),
    );
    registerAndRepeat(
      this.jobs,
      JOB_SCREEN_SIMILARITY,
      () => this.processSimilarityJobs(),
      SIMILARITY_INTERVAL_MS,
      (err) => this.logger.error("Failed to schedule similarity screening", err),
    );
  }

  private async processCheckJobs(): Promise<void> {
    const pending = await this.db
      .select({
        submissionId: projectSubmissions.submissionId,
        repositoryUrl: projectSubmissions.repositoryUrl,
      })
      .from(projectSubmissions)
      .leftJoin(
        projectCheckRuns,
        eq(projectCheckRuns.submissionId, projectSubmissions.submissionId),
      )
      .where(isNull(projectCheckRuns.checkRunId))
      .orderBy(asc(projectSubmissions.submittedAt))
      .limit(25);

    for (const sub of pending) {
      await this.runChecksForSubmission(sub.submissionId, sub.repositoryUrl);
    }
  }

  private async runChecksForSubmission(
    submissionId: string,
    repositoryUrl: string,
  ): Promise<void> {
    const now = this.clock.now();
    const inserted = await this.db
      .insert(projectCheckRuns)
      .values({
        submissionId,
        buildStatus: "PENDING",
        lintStatus: "PENDING",
        testStatus: "PENDING",
        detail: {},
        startedAt: now,
      })
      .onConflictDoNothing()
      .returning({ checkRunId: projectCheckRuns.checkRunId });

    if (inserted.length === 0) return;

    const group = await this.settings.getGroup(PROJECT_REVIEW_SETTINGS_GROUP);
    const timeoutSeconds = Number(group.values["checkTimeoutSeconds"] ?? 600);

    try {
      const result = await this.checkRunner.runChecks(repositoryUrl, timeoutSeconds);
      await this.db
        .update(projectCheckRuns)
        .set({
          buildStatus: result.buildStatus,
          lintStatus: result.lintStatus,
          testStatus: result.testStatus,
          detail: result.detail,
          completedAt: this.clock.now(),
        })
        .where(eq(projectCheckRuns.submissionId, submissionId));
    } catch (err) {
      await this.db
        .update(projectCheckRuns)
        .set({
          buildStatus: "HARNESS_ERROR",
          lintStatus: "HARNESS_ERROR",
          testStatus: "HARNESS_ERROR",
          harnessError: err instanceof Error ? err.message : String(err),
          completedAt: this.clock.now(),
        })
        .where(eq(projectCheckRuns.submissionId, submissionId));
    }
  }

  private async processSimilarityJobs(): Promise<void> {
    const unscreened = await this.db
      .select({
        submissionId: projectSubmissions.submissionId,
        milestoneId: projectSubmissions.milestoneId,
        repositoryUrl: projectSubmissions.repositoryUrl,
      })
      .from(projectSubmissions)
      .where(isNull(projectSubmissions.screenedAt))
      .orderBy(asc(projectSubmissions.submittedAt))
      .limit(25);

    for (const sub of unscreened) {
      await this.screenSubmission(sub.submissionId, sub.milestoneId, sub.repositoryUrl);
    }
  }

  private async screenSubmission(
    submissionId: string,
    milestoneId: string,
    repositoryUrl: string,
  ): Promise<void> {
    const group = await this.settings.getGroup(PROJECT_REVIEW_SETTINGS_GROUP);
    const threshold = Number(group.values["similarityFlagThreshold"] ?? 70);

    const otherSubs = await this.db
      .select({
        submissionId: projectSubmissions.submissionId,
        repositoryUrl: projectSubmissions.repositoryUrl,
      })
      .from(projectSubmissions)
      .where(
        and(
          eq(projectSubmissions.milestoneId, milestoneId),
          ne(projectSubmissions.submissionId, submissionId),
        ),
      );

    const cohortEntries: CohortEntry[] = otherSubs.map((s) => ({
      submissionId: s.submissionId,
      repositoryUrl: s.repositoryUrl,
    }));

    let result;
    try {
      result = await this.similarityProvider.compare(repositoryUrl, cohortEntries);
    } catch (err) {
      this.logger.error(`Similarity screening failed for ${submissionId}`, err);
      await this.db
        .update(projectSubmissions)
        .set({ screenedAt: this.clock.now() })
        .where(eq(projectSubmissions.submissionId, submissionId));
      return;
    }

    const now = this.clock.now();
    const flagsToInsert: (typeof projectSimilarityFlags.$inferInsert)[] = [];

    for (const match of result.cohortMatches) {
      if (Number(match.score) >= threshold) {
        flagsToInsert.push({
          submissionId,
          source: "COHORT",
          comparedSubmissionId: match.comparedSubmissionId,
          comparedSourceLabel: null,
          score: match.score.toString(),
          matchedRegions: match.matchedRegions,
          createdAt: now,
        });
      }
    }

    for (const match of result.publicMatches) {
      if (Number(match.score) >= threshold) {
        flagsToInsert.push({
          submissionId,
          source: "PUBLIC",
          comparedSubmissionId: null,
          comparedSourceLabel: match.sourceLabel,
          score: match.score.toString(),
          matchedRegions: match.matchedRegions,
          createdAt: now,
        });
      }
    }

    if (flagsToInsert.length > 0) {
      await this.db.insert(projectSimilarityFlags).values(flagsToInsert);
    }

    await this.db
      .update(projectSubmissions)
      .set({ screenedAt: now })
      .where(eq(projectSubmissions.submissionId, submissionId));
  }

  async getCheckRun(submissionId: string, requestUserId: string, isStaff: boolean) {
    await this.requireSubmissionAccess(submissionId, requestUserId, isStaff);

    const [run] = await this.db
      .select()
      .from(projectCheckRuns)
      .where(eq(projectCheckRuns.submissionId, submissionId))
      .limit(1);

    if (!run) return { submissionId, status: "PENDING" as const };
    return run;
  }

  async getFlags(submissionId: string) {
    return this.db
      .select()
      .from(projectSimilarityFlags)
      .where(eq(projectSimilarityFlags.submissionId, submissionId))
      .orderBy(asc(projectSimilarityFlags.createdAt));
  }

  async getReviewQueue(_reviewerId: string, _role: string) {
    const pending = await this.db
      .select({
        submissionId: projectSubmissions.submissionId,
        projectId: projectSubmissions.projectId,
        milestoneId: projectSubmissions.milestoneId,
        userId: projectSubmissions.userId,
        cycle: projectSubmissions.cycle,
        repositoryUrl: projectSubmissions.repositoryUrl,
        deploymentUrl: projectSubmissions.deploymentUrl,
        submittedAt: projectSubmissions.submittedAt,
        milestoneTitle: projectMilestones.title,
        projectTitle: projects.title,
      })
      .from(projectSubmissions)
      .leftJoin(
        projectReviews,
        eq(projectReviews.submissionId, projectSubmissions.submissionId),
      )
      .innerJoin(
        projectMilestones,
        eq(projectMilestones.milestoneId, projectSubmissions.milestoneId),
      )
      .innerJoin(projects, eq(projects.projectId, projectSubmissions.projectId))
      .where(isNull(projectReviews.reviewId))
      .orderBy(asc(projectSubmissions.submittedAt))
      .limit(1);

    if (pending.length === 0) return { item: null };

    const first = pending[0];
    const checkRun = await this.getCheckRunRaw(first.submissionId);
    const flags = await this.getFlags(first.submissionId);
    const previousReviews = await this.getPreviousReviews(
      first.milestoneId,
      first.userId,
      first.cycle,
    );

    return {
      item: {
        ...first,
        checkRun,
        flags,
        previousReviews,
      },
    };
  }

  async getSubmissionDetail(
    submissionId: string,
    requestUserId: string,
    isStaff: boolean,
  ) {
    const sub = await this.requireSubmissionAccess(submissionId, requestUserId, isStaff);

    const checkRun = await this.getCheckRunRaw(submissionId);
    const review = await this.getReviewRaw(submissionId);
    const previousReviews = await this.getPreviousReviews(
      sub.milestoneId,
      sub.userId,
      sub.cycle,
    );

    if (!isStaff) {
      return {
        submissionId: sub.submissionId,
        projectId: sub.projectId,
        milestoneId: sub.milestoneId,
        cycle: sub.cycle,
        repositoryUrl: sub.repositoryUrl,
        deploymentUrl: sub.deploymentUrl,
        submittedAt: sub.submittedAt,
        reviewedAt: sub.reviewedAt,
        outcome: sub.outcome,
        checkRun,
        review,
        previousReviews,
      };
    }

    const flags = await this.getFlags(submissionId);
    return { ...sub, checkRun, review, previousReviews, flags };
  }

  async getReview(submissionId: string, requestUserId: string, isStaff: boolean) {
    await this.requireSubmissionAccess(submissionId, requestUserId, isStaff);
    const review = await this.getReviewRaw(submissionId);
    if (!review) throw new NotFoundException("Review not found");
    return review;
  }

  async createReview(
    submissionId: string,
    dto: CreateProjectReviewDto,
    reviewerId: string,
  ) {
    const [submission] = await this.db
      .select()
      .from(projectSubmissions)
      .where(eq(projectSubmissions.submissionId, submissionId))
      .limit(1);

    if (!submission) throw new NotFoundException("Submission not found");

    const existingReview = await this.getReviewRaw(submissionId);
    if (existingReview) throw new ConflictException("This submission has already been reviewed");

    const [progress] = await this.db
      .select()
      .from(projectMilestoneProgress)
      .where(
        and(
          eq(projectMilestoneProgress.milestoneId, submission.milestoneId),
          eq(projectMilestoneProgress.userId, submission.userId),
        ),
      )
      .limit(1);

    if (!progress || progress.state !== "SUBMITTED") {
      throw new ConflictException("Milestone is not in SUBMITTED state");
    }

    const [project] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.projectId, submission.projectId))
      .limit(1);

    if (!project) throw new NotFoundException("Project not found");

    const rubric = await this.rubrics.getRubric(project.rubricId);
    const criteriaMap = new Map(rubric.criteria.map((c) => [c.criterionId, c]));

    for (const score of dto.criteria) {
      if (!criteriaMap.has(score.criterionId)) {
        throw new BadRequestException(
          `Criterion ${score.criterionId} does not belong to this rubric`,
        );
      }
      await this.rubrics.validateCriterionValue(project.rubricId, score.value);
    }

    if (dto.outcome === "RETURNED") {
      const group = await this.settings.getGroup(PROJECT_REVIEW_SETTINGS_GROUP);
      const maxCycles = Number(group.values["maxResubmissionCycles"] ?? 5);
      if (submission.cycle >= maxCycles) {
        throw new UnprocessableEntityException(
          `Maximum resubmission cycles (${maxCycles}) reached; outcome must be PASSED`,
        );
      }
    }

    let feedbackMediaKey: string | null = null;
    if (dto.feedbackMediaId) {
      feedbackMediaKey = this.normalizeToStorageKey(dto.feedbackMediaId);
    }

    const totalWeight = rubric.criteria.reduce((s, c) => s + Number(c.weight), 0);
    const earned =
      totalWeight > 0
        ? dto.criteria.reduce((sum, score) => {
            const criterion = criteriaMap.get(score.criterionId);
            if (!criterion) return sum;
            return sum + (score.value / rubric.scaleMax) * Number(criterion.weight);
          }, 0)
        : 0;
    const weightedScore =
      totalWeight > 0
        ? Number(((earned / totalWeight) * 100).toFixed(2))
        : 0;

    const now = this.clock.now();

    await this.db.transaction(async (tx) => {
      await tx.insert(projectReviews).values({
        submissionId,
        reviewerId,
        outcome: dto.outcome,
        summary: dto.summary ?? null,
        feedbackMediaId: feedbackMediaKey,
        createdAt: now,
      });

      for (const score of dto.criteria) {
        await tx
          .insert(projectCriterionScores)
          .values({
            submissionId,
            criterionId: score.criterionId,
            value: score.value.toString(),
            comment: score.comment ?? null,
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: [
              projectCriterionScores.submissionId,
              projectCriterionScores.criterionId,
            ],
            set: {
              value: score.value.toString(),
              comment: score.comment ?? null,
            },
          });
      }

      await tx
        .update(projectSubmissions)
        .set({ reviewedAt: now, reviewedBy: reviewerId, outcome: dto.outcome })
        .where(eq(projectSubmissions.submissionId, submissionId));

      if (dto.outcome === "PASSED") {
        await this.projectsService.markMilestonePassed(
          submission.milestoneId,
          submission.userId,
          tx,
        );
      } else {
        await this.projectsService.markMilestoneReturned(
          submission.milestoneId,
          submission.userId,
          tx,
        );
      }
    });

    const [milestone] = await this.db
      .select()
      .from(projectMilestones)
      .where(eq(projectMilestones.milestoneId, submission.milestoneId))
      .limit(1);

    await this.notifications.notify({
      userId: submission.userId,
      type: "PROJECT_MILESTONE_REVIEWED",
      vars: {
        milestoneTitle: milestone?.title ?? "Milestone",
        body: dto.outcome === "PASSED"
          ? "Your milestone has been passed."
          : "Your milestone has been returned with feedback.",
      },
    }).catch((err) =>
      this.logger.error("Failed to send PROJECT_MILESTONE_REVIEWED notification", err),
    );

    const review = await this.getReviewRaw(submissionId);
    const scores = await this.db
      .select()
      .from(projectCriterionScores)
      .where(eq(projectCriterionScores.submissionId, submissionId));

    return {
      ...review,
      criterionScores: scores,
      weightedScore,
      feedbackMediaUrl: feedbackMediaKey
        ? this.files.getDownloadUrl(feedbackMediaKey)
        : null,
    };
  }

  private async requireSubmissionAccess(
    submissionId: string,
    requestUserId: string,
    isStaff: boolean,
  ) {
    const [submission] = await this.db
      .select()
      .from(projectSubmissions)
      .where(eq(projectSubmissions.submissionId, submissionId))
      .limit(1);

    if (!submission) throw new NotFoundException("Submission not found");

    if (!isStaff && submission.userId !== requestUserId) {
      throw new ForbiddenException("Access denied");
    }

    return submission;
  }

  private async getCheckRunRaw(submissionId: string) {
    const [run] = await this.db
      .select()
      .from(projectCheckRuns)
      .where(eq(projectCheckRuns.submissionId, submissionId))
      .limit(1);
    return run ?? null;
  }

  private async getReviewRaw(submissionId: string) {
    const [review] = await this.db
      .select()
      .from(projectReviews)
      .where(eq(projectReviews.submissionId, submissionId))
      .limit(1);
    return review ?? null;
  }

  private async getPreviousReviews(
    milestoneId: string,
    userId: string,
    currentCycle: number,
  ) {
    if (currentCycle === 0) return [];

    const priorSubmissions = await this.db
      .select({ submissionId: projectSubmissions.submissionId })
      .from(projectSubmissions)
      .where(
        and(
          eq(projectSubmissions.milestoneId, milestoneId),
          eq(projectSubmissions.userId, userId),
        ),
      );

    const priorIds = priorSubmissions
      .map((s) => s.submissionId)
      .filter((id) => id !== undefined);

    if (priorIds.length === 0) return [];

    const reviews: (typeof projectReviews.$inferSelect & {
      criterionScores: (typeof projectCriterionScores.$inferSelect)[];
    })[] = [];

    for (const id of priorIds) {
      const [rev] = await this.db
        .select()
        .from(projectReviews)
        .where(eq(projectReviews.submissionId, id))
        .limit(1);
      if (!rev) continue;
      const scores = await this.db
        .select()
        .from(projectCriterionScores)
        .where(eq(projectCriterionScores.submissionId, id));
      reviews.push({ ...rev, criterionScores: scores });
    }

    return reviews;
  }

  private normalizeToStorageKey(input: string): string {
    if (!input.startsWith("http")) return input;
    const key = this.files.extractKey(input);
    const reconstructed = this.files.getDownloadUrl(key);
    if (reconstructed !== input) {
      throw new BadRequestException(
        "Feedback media must be a storage key or a URL hosted on this platform's CDN",
      );
    }
    return key;
  }
}
