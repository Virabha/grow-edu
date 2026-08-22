import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { and, asc, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../common/clock";
import { toDayString } from "../common/day";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  aiStudyPlans,
  assessmentTests,
  assessmentTaxonomyNodes,
  assessmentWeakTopics,
  batchEnrollments,
  reviewItems,
  studentProfiles,
  studentStudyPreferences,
} from "../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../jobs/job-queue";
import { AiService } from "./ai.service";
import { HAIKU } from "./model-provider";
import { GroundingSource } from "./prompt";
import { FieldSpec } from "./structured";
import { StudyPlanInputs, StudyPlanItem } from "../database/schema/ai-study-plans";

export const STUDY_PLAN_REGEN_JOB = "ai.study-plan.regenerate";
const REGEN_INTERVAL_MS = 24 * 60 * 60 * 1_000;

interface AiPlanResponse {
  summary: string;
  items: StudyPlanItem[];
}

const PLAN_SPEC: FieldSpec = {
  type: "object",
  fields: {
    summary: { type: "string", minLength: 10 },
    items: {
      type: "array",
      items: {
        type: "object",
        fields: {
          kind: { type: "string", minLength: 1 },
          title: { type: "string", minLength: 1 },
          durationMinutes: { type: "integer", minimum: 1 },
          rationale: { type: "string", minLength: 1 },
        },
      },
    },
  },
};

const PLAN_INSTRUCTIONS = `You are a study plan assistant for an e-learning platform. \
Your job is to generate a realistic, achievable daily study plan based on the student's \
goal, weak topics, spaced-repetition review items due today, and upcoming test dates. \
The plan must fit within the student's declared available time. \
A student with no history must still receive a usable plan with at least one item. \
Prioritise revision of weak topics when a test is approaching. \
Each item must have a title, a kind (one of REVIEW, WEAK_TOPIC, NEW_LESSON, REVISION), \
a duration in minutes, and a brief rationale.`;

@Injectable()
export class StudyPlanService implements OnModuleInit {
  private readonly logger = new Logger(StudyPlanService.name);

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
      STUDY_PLAN_REGEN_JOB,
      () => this.runRegeneration(),
      REGEN_INTERVAL_MS,
      (err) => this.logger.error("Could not schedule study plan regeneration", err),
    );
  }

  async getCurrentPlan(userId: string) {
    const [plan] = await this.db
      .select()
      .from(aiStudyPlans)
      .where(
        and(eq(aiStudyPlans.userId, userId), isNull(aiStudyPlans.supersededAt)),
      )
      .orderBy(desc(aiStudyPlans.generatedAt))
      .limit(1);
    return plan ?? null;
  }

  async updatePreferences(userId: string, availableMinutesPerDay: number) {
    const now = this.clock.now();
    const [existing] = await this.db
      .select({ preferenceId: studentStudyPreferences.preferenceId })
      .from(studentStudyPreferences)
      .where(eq(studentStudyPreferences.userId, userId))
      .limit(1);

    if (existing) {
      await this.db
        .update(studentStudyPreferences)
        .set({ availableMinutesPerDay, updatedAt: now })
        .where(eq(studentStudyPreferences.userId, userId));
    } else {
      await this.db.insert(studentStudyPreferences).values({
        userId,
        availableMinutesPerDay,
        updatedAt: now,
      });
    }

    return { availableMinutesPerDay };
  }

  async runRegeneration(): Promise<void> {
    const enrolled = await this.db
      .selectDistinct({ userId: batchEnrollments.userId })
      .from(batchEnrollments)
      .where(eq(batchEnrollments.status, "ACTIVE"));

    for (const { userId } of enrolled) {
      try {
        await this.generateFor(userId);
      } catch (err) {
        this.logger.error(
          `Study plan generation failed for user ${userId}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }
  }

  private async generateFor(userId: string): Promise<void> {
    const now = this.clock.now();

    const [profile] = await this.db
      .select({ goalKey: studentProfiles.goalKey, level: studentProfiles.level })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId))
      .limit(1);

    const weakTopicRows = await this.db
      .select({
        topicId: assessmentWeakTopics.topicId,
        topicName: assessmentTaxonomyNodes.name,
        accuracy: assessmentWeakTopics.accuracy,
      })
      .from(assessmentWeakTopics)
      .leftJoin(
        assessmentTaxonomyNodes,
        eq(assessmentWeakTopics.topicId, assessmentTaxonomyNodes.nodeId),
      )
      .where(eq(assessmentWeakTopics.userId, userId))
      .orderBy(asc(assessmentWeakTopics.accuracy))
      .limit(5);

    const dueReviewItems = await this.db
      .select({ reviewItemId: reviewItems.reviewItemId })
      .from(reviewItems)
      .where(
        and(
          eq(reviewItems.userId, userId),
          isNull(reviewItems.retiredAt),
          lte(reviewItems.dueAt, now),
        ),
      );

    const enrolledBatches = await this.db
      .select({ batchId: batchEnrollments.batchId })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.userId, userId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      );

    const upcomingTests =
      enrolledBatches.length > 0
        ? await this.db
            .select({
              title: assessmentTests.title,
              opensAt: assessmentTests.opensAt,
            })
            .from(assessmentTests)
            .where(
              and(
                inArray(
                  assessmentTests.batchId,
                  enrolledBatches.map((e) => e.batchId),
                ),
                eq(assessmentTests.isDeleted, false),
                gte(assessmentTests.opensAt, now),
              ),
            )
            .orderBy(asc(assessmentTests.opensAt))
            .limit(3)
        : [];

    const [prefs] = await this.db
      .select({ availableMinutesPerDay: studentStudyPreferences.availableMinutesPerDay })
      .from(studentStudyPreferences)
      .where(eq(studentStudyPreferences.userId, userId))
      .limit(1);

    const availableMinutes = prefs?.availableMinutesPerDay ?? 60;

    const sources: GroundingSource[] = [];

    if (profile?.goalKey) {
      sources.push({
        sourceId: "student-goal",
        kind: "goal",
        title: "Student Learning Goal",
        body: `Goal: ${profile.goalKey}${profile.level ? `, Level: ${profile.level}` : ""}`,
      });
    }

    if (weakTopicRows.length > 0) {
      sources.push({
        sourceId: "weak-topics",
        kind: "weak_topics",
        title: "Topics Needing Practice",
        body: weakTopicRows
          .map(
            (t) =>
              `${t.topicName ?? t.topicId} (accuracy: ${Math.round(Number(t.accuracy) * 100)}%)`,
          )
          .join("\n"),
      });
    }

    if (upcomingTests.length > 0) {
      sources.push({
        sourceId: "upcoming-tests",
        kind: "upcoming_tests",
        title: "Upcoming Tests",
        body: upcomingTests
          .map((t) => `${t.title} (opens: ${toDayString(t.opensAt)})`)
          .join("\n"),
      });
    }

    const question =
      `Today is ${toDayString(now)}. ` +
      `I have ${availableMinutes} minutes available to study. ` +
      `There are ${dueReviewItems.length} spaced-repetition items due for review. ` +
      `Please generate my daily study plan.`;

    const inputs: StudyPlanInputs = {
      goalKey: profile?.goalKey ?? null,
      levelKey: profile?.level ?? null,
      availableMinutesPerDay: availableMinutes,
      weakTopicCount: weakTopicRows.length,
      reviewItemsDue: dueReviewItems.length,
      upcomingTestCount: upcomingTests.length,
    };

    const result = await this.ai.completeStructured<AiPlanResponse>(
      {
        feature: "study-plan",
        model: HAIKU,
        organizationId: null,
        instructions: PLAN_INSTRUCTIONS,
        sources,
        question,
        maxTokens: 1024,
      },
      PLAN_SPEC,
    );

    if (!result.ok) {
      return;
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(aiStudyPlans)
        .set({ supersededAt: now })
        .where(
          and(
            eq(aiStudyPlans.userId, userId),
            isNull(aiStudyPlans.supersededAt),
          ),
        );

      await tx.insert(aiStudyPlans).values({
        userId,
        summary: result.value.summary,
        items: result.value.items,
        inputs,
        generatedAt: now,
      });
    });
  }
}
