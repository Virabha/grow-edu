import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  codingRuns,
  pathStageProgress,
  projectMilestoneProgress,
  skillDemonstrations,
  skillTags,
  skills,
} from "../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../jobs/job-queue";

export const SKILL_DEMONSTRATION_SWEEP_JOB =
  "skill.demonstration.sweep";

const EVERY_HOUR = 60 * 60 * 1000;

type DbType = PostgresJsDatabase<typeof schema>;

@Injectable()
export class SkillDemonstrationSweepService implements OnModuleInit {
  private readonly logger = new Logger(
    SkillDemonstrationSweepService.name,
  );

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      SKILL_DEMONSTRATION_SWEEP_JOB,
      async () => {
        await this.sweep();
      },
      EVERY_HOUR,
      (err) =>
        this.logger.error("Could not schedule skill demonstration sweep", err),
    );
  }

  async sweep(): Promise<void> {
    const allSkills = await this.db
      .select()
      .from(skills)
      .where(eq(skills.isRetired, false));

    for (const skill of allSkills) {
      try {
        await this.sweepSkill(skill);
      } catch (err) {
        this.logger.error(
          `Skill sweep failed for skillId=${skill.skillId}`,
          err,
        );
      }
    }
  }

  private async sweepSkill(
    skill: typeof skills.$inferSelect,
  ): Promise<void> {
    const tags = await this.db
      .select()
      .from(skillTags)
      .where(eq(skillTags.skillId, skill.skillId));

    if (tags.length === 0) return;

    const problemIds = tags
      .filter((t) => t.subjectKind === "PROBLEM")
      .map((t) => t.subjectId);
    const projectIds = tags
      .filter((t) => t.subjectKind === "PROJECT")
      .map((t) => t.subjectId);
    const stageIds = tags
      .filter((t) => t.subjectKind === "STAGE")
      .map((t) => t.subjectId);

    const userCountMap = new Map<string, number>();

    if (problemIds.length > 0) {
      const rows = await this.db
        .select({
          userId: codingRuns.userId,
          count: sql<number>`count(distinct ${codingRuns.problemId})::int`,
        })
        .from(codingRuns)
        .where(
          and(
            inArray(codingRuns.problemId, problemIds),
            eq(codingRuns.verdict, "ACCEPTED"),
            eq(codingRuns.kind, "JUDGE_SUBMISSION"),
          ),
        )
        .groupBy(codingRuns.userId);
      for (const r of rows) {
        userCountMap.set(r.userId, (userCountMap.get(r.userId) ?? 0) + r.count);
      }
    }

    if (projectIds.length > 0) {
      const rows = await this.db
        .select({
          userId: projectMilestoneProgress.userId,
          count: sql<number>`count(distinct ${projectMilestoneProgress.projectId})::int`,
        })
        .from(projectMilestoneProgress)
        .where(
          and(
            inArray(projectMilestoneProgress.projectId, projectIds),
            eq(projectMilestoneProgress.state, "PASSED"),
          ),
        )
        .groupBy(projectMilestoneProgress.userId);
      for (const r of rows) {
        userCountMap.set(r.userId, (userCountMap.get(r.userId) ?? 0) + r.count);
      }
    }

    if (stageIds.length > 0) {
      const rows = await this.db
        .select({
          userId: pathStageProgress.userId,
          count: sql<number>`count(*)::int`,
        })
        .from(pathStageProgress)
        .where(
          and(
            inArray(pathStageProgress.stageId, stageIds),
            eq(pathStageProgress.state, "COMPLETE"),
          ),
        )
        .groupBy(pathStageProgress.userId);
      for (const r of rows) {
        userCountMap.set(r.userId, (userCountMap.get(r.userId) ?? 0) + r.count);
      }
    }

    if (userCountMap.size === 0) return;

    const userIds = [...userCountMap.keys()];
    const existing = await this.db
      .select()
      .from(skillDemonstrations)
      .where(
        and(
          eq(skillDemonstrations.skillId, skill.skillId),
          inArray(skillDemonstrations.userId, userIds),
        ),
      );
    const existingMap = new Map(existing.map((d) => [d.userId, d]));

    const now = this.clock.now();

    for (const [userId, count] of userCountMap) {
      const existingDemo = existingMap.get(userId);
      const nowMeetsThreshold = count >= skill.requiredItems;

      await this.db
        .insert(skillDemonstrations)
        .values({
          userId,
          skillId: skill.skillId,
          completedItems: count,
          demonstratedAt: nowMeetsThreshold ? now : null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [skillDemonstrations.userId, skillDemonstrations.skillId],
          set: {
            completedItems: count,
            demonstratedAt: existingDemo?.demonstratedAt
              ? existingDemo.demonstratedAt
              : nowMeetsThreshold
                ? now
                : null,
            updatedAt: now,
          },
        });
    }
  }
}
