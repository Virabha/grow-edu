import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, gt } from "drizzle-orm";
import { Queryable } from "../database/transaction";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  projectMilestoneProgress,
  projectMilestones,
  projectSubmissions,
  projects,
} from "../database/schema";
import { parseContent } from "../assessment/bank/content";
import {
  CreateMilestoneDto,
  CreateProjectDto,
  EnrolDto,
  SubmitMilestoneDto,
  UpdateMilestoneDto,
  UpdateProjectDto,
} from "./dto/project.dto";
import { RubricService } from "../assessment/grading/rubric.service";

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly rubrics: RubricService,
  ) {}

  async createProject(dto: CreateProjectDto, createdBy: string) {
    await this.rubrics.getRubric(dto.rubricId);

    const brief = parseContent(dto.brief, "brief", { allowEmpty: true });
    const now = this.clock.now();

    const [project] = await this.db
      .insert(projects)
      .values({
        title: dto.title,
        brief,
        requirements: dto.requirements,
        rubricId: dto.rubricId,
        starterRepositoryUrl: dto.starterRepositoryUrl ?? null,
        createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.getProject(project.projectId);
  }

  async getProject(projectId: string) {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.projectId, projectId), eq(projects.isDeleted, false)))
      .limit(1);

    if (!project) throw new NotFoundException("Project not found");

    const rubric = await this.rubrics.getRubric(project.rubricId);
    const milestones = await this.getMilestones(projectId);

    return { ...project, rubric, milestones };
  }

  async updateProject(projectId: string, dto: UpdateProjectDto) {
    const [existing] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.projectId, projectId), eq(projects.isDeleted, false)))
      .limit(1);

    if (!existing) throw new NotFoundException("Project not found");

    if (dto.rubricId !== undefined) {
      await this.rubrics.getRubric(dto.rubricId);
    }

    const updates: Partial<typeof projects.$inferInsert> = {
      updatedAt: this.clock.now(),
    };

    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.requirements !== undefined) updates.requirements = dto.requirements;
    if (dto.rubricId !== undefined) updates.rubricId = dto.rubricId;
    if (dto.starterRepositoryUrl !== undefined)
      updates.starterRepositoryUrl = dto.starterRepositoryUrl;
    if (dto.brief !== undefined)
      updates.brief = parseContent(dto.brief, "brief", { allowEmpty: true });

    await this.db
      .update(projects)
      .set(updates)
      .where(eq(projects.projectId, projectId));

    return this.getProject(projectId);
  }

  async deleteProject(projectId: string) {
    const [existing] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.projectId, projectId), eq(projects.isDeleted, false)))
      .limit(1);

    if (!existing) throw new NotFoundException("Project not found");

    await this.db
      .update(projects)
      .set({ isDeleted: true, updatedAt: this.clock.now() })
      .where(eq(projects.projectId, projectId));

    return { deleted: true };
  }

  async addMilestone(projectId: string, dto: CreateMilestoneDto) {
    await this.requireProject(projectId);

    const description = dto.description
      ? parseContent(dto.description, "description", { allowEmpty: true })
      : [];

    const now = this.clock.now();
    await this.db.insert(projectMilestones).values({
      projectId,
      ordinal: dto.ordinal,
      title: dto.title,
      description,
      createdAt: now,
      updatedAt: now,
    });

    return this.getMilestones(projectId);
  }

  async getMilestones(projectId: string) {
    return this.db
      .select()
      .from(projectMilestones)
      .where(
        and(
          eq(projectMilestones.projectId, projectId),
          eq(projectMilestones.isDeleted, false),
        ),
      )
      .orderBy(asc(projectMilestones.ordinal));
  }

  async updateMilestone(
    projectId: string,
    milestoneId: string,
    dto: UpdateMilestoneDto,
  ) {
    await this.requireProject(projectId);
    const milestone = await this.requireMilestone(projectId, milestoneId);

    const updates: Partial<typeof projectMilestones.$inferInsert> = {
      updatedAt: this.clock.now(),
    };

    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.ordinal !== undefined) updates.ordinal = dto.ordinal;
    if (dto.description !== undefined)
      updates.description = parseContent(dto.description, "description", {
        allowEmpty: true,
      });

    await this.db
      .update(projectMilestones)
      .set(updates)
      .where(eq(projectMilestones.milestoneId, milestone.milestoneId));

    return this.getMilestones(projectId);
  }

  async deleteMilestone(projectId: string, milestoneId: string) {
    await this.requireProject(projectId);
    const milestone = await this.requireMilestone(projectId, milestoneId);

    await this.db
      .update(projectMilestones)
      .set({ isDeleted: true, updatedAt: this.clock.now() })
      .where(eq(projectMilestones.milestoneId, milestone.milestoneId));

    return { deleted: true };
  }

  async enrolStudent(projectId: string, dto: EnrolDto) {
    await this.requireProject(projectId);

    const milestones = await this.getMilestones(projectId);
    if (milestones.length === 0) {
      throw new BadRequestException("Project has no milestones to enrol into");
    }

    const existing = await this.db
      .select()
      .from(projectMilestoneProgress)
      .where(
        and(
          eq(projectMilestoneProgress.projectId, projectId),
          eq(projectMilestoneProgress.userId, dto.userId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException("Student is already enrolled in this project");
    }

    const now = this.clock.now();

    await this.db.insert(projectMilestoneProgress).values(
      milestones.map((m, idx) => ({
        projectId,
        milestoneId: m.milestoneId,
        userId: dto.userId,
        state:
          idx === 0
            ? ("OPEN" as const)
            : ("LOCKED" as const),
        cycle: 0,
        openedAt: idx === 0 ? now : null,
        updatedAt: now,
      })),
    );

    return this.getProgress(projectId, dto.userId);
  }

  async getProgress(projectId: string, userId: string) {
    await this.requireProject(projectId);
    return this.db
      .select()
      .from(projectMilestoneProgress)
      .where(
        and(
          eq(projectMilestoneProgress.projectId, projectId),
          eq(projectMilestoneProgress.userId, userId),
        ),
      )
      .orderBy(asc(projectMilestoneProgress.milestoneId));
  }

  async submit(
    projectId: string,
    milestoneId: string,
    userId: string,
    dto: SubmitMilestoneDto,
  ) {
    await this.requireProject(projectId);
    await this.requireMilestone(projectId, milestoneId);

    const [progress] = await this.db
      .select()
      .from(projectMilestoneProgress)
      .where(
        and(
          eq(projectMilestoneProgress.milestoneId, milestoneId),
          eq(projectMilestoneProgress.userId, userId),
        ),
      )
      .limit(1);

    if (!progress) {
      throw new BadRequestException("You are not enrolled in this project");
    }

    if (progress.state === "LOCKED") {
      throw new ConflictException("This milestone is locked");
    }

    if (progress.state === "SUBMITTED") {
      throw new ConflictException("This milestone is already submitted");
    }

    if (progress.state === "PASSED") {
      throw new ConflictException("This milestone has already been passed");
    }

    const now = this.clock.now();
    return this.db.transaction(async (tx) => {
      const [submission] = await tx
        .insert(projectSubmissions)
        .values({
          projectId,
          milestoneId,
          userId,
          cycle: progress.cycle,
          repositoryUrl: dto.repositoryUrl,
          deploymentUrl: dto.deploymentUrl ?? null,
          submittedAt: now,
        })
        .returning();

      await tx
        .update(projectMilestoneProgress)
        .set({ state: "SUBMITTED", updatedAt: now })
        .where(eq(projectMilestoneProgress.progressId, progress.progressId));

      return submission;
    });
  }

  async listSubmissions(
    projectId: string,
    requestUserId: string,
    isStaff: boolean,
  ) {
    await this.requireProject(projectId);

    const conditions = [eq(projectSubmissions.projectId, projectId)];

    if (!isStaff) {
      conditions.push(eq(projectSubmissions.userId, requestUserId));
    }

    return this.db
      .select()
      .from(projectSubmissions)
      .where(and(...conditions))
      .orderBy(asc(projectSubmissions.submittedAt));
  }

  async getSubmission(submissionId: string, requestUserId: string, isStaff: boolean) {
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

  async markMilestonePassed(
    milestoneId: string,
    userId: string,
    tx: Queryable = this.db,
  ) {
    const [progress] = await tx
      .select()
      .from(projectMilestoneProgress)
      .where(
        and(
          eq(projectMilestoneProgress.milestoneId, milestoneId),
          eq(projectMilestoneProgress.userId, userId),
        ),
      )
      .limit(1);

    if (!progress) throw new NotFoundException("Progress record not found");

    if (progress.state !== "SUBMITTED") {
      throw new ConflictException(
        "Milestone must be in SUBMITTED state to be marked as passed",
      );
    }

    const now = this.clock.now();

    await tx
      .update(projectMilestoneProgress)
      .set({ state: "PASSED", passedAt: now, updatedAt: now })
      .where(eq(projectMilestoneProgress.progressId, progress.progressId));

    const [currentMilestone] = await tx
      .select()
      .from(projectMilestones)
      .where(eq(projectMilestones.milestoneId, milestoneId))
      .limit(1);

    if (!currentMilestone) return;

    const [nextMilestone] = await tx
      .select()
      .from(projectMilestones)
      .where(
        and(
          eq(projectMilestones.projectId, currentMilestone.projectId),
          eq(projectMilestones.isDeleted, false),
          gt(projectMilestones.ordinal, currentMilestone.ordinal),
        ),
      )
      .orderBy(asc(projectMilestones.ordinal))
      .limit(1);

    if (!nextMilestone) return;

    const [existingNext] = await tx
      .select()
      .from(projectMilestoneProgress)
      .where(
        and(
          eq(projectMilestoneProgress.milestoneId, nextMilestone.milestoneId),
          eq(projectMilestoneProgress.userId, userId),
        ),
      )
      .limit(1);

    if (existingNext) {
      await tx
        .update(projectMilestoneProgress)
        .set({ state: "OPEN", openedAt: now, updatedAt: now })
        .where(eq(projectMilestoneProgress.progressId, existingNext.progressId));
    } else {
      await tx.insert(projectMilestoneProgress).values({
        projectId: currentMilestone.projectId,
        milestoneId: nextMilestone.milestoneId,
        userId,
        state: "OPEN",
        cycle: 0,
        openedAt: now,
        updatedAt: now,
      });
    }
  }

  async markMilestoneReturned(
    milestoneId: string,
    userId: string,
    tx: Queryable = this.db,
  ) {
    const [progress] = await tx
      .select()
      .from(projectMilestoneProgress)
      .where(
        and(
          eq(projectMilestoneProgress.milestoneId, milestoneId),
          eq(projectMilestoneProgress.userId, userId),
        ),
      )
      .limit(1);

    if (!progress) throw new NotFoundException("Progress record not found");

    if (progress.state !== "SUBMITTED") {
      throw new ConflictException(
        "Milestone must be in SUBMITTED state to be returned",
      );
    }

    await tx
      .update(projectMilestoneProgress)
      .set({
        state: "RETURNED",
        cycle: progress.cycle + 1,
        updatedAt: this.clock.now(),
      })
      .where(eq(projectMilestoneProgress.progressId, progress.progressId));
  }

  private async requireProject(projectId: string) {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.projectId, projectId), eq(projects.isDeleted, false)))
      .limit(1);

    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  private async requireMilestone(projectId: string, milestoneId: string) {
    const [milestone] = await this.db
      .select()
      .from(projectMilestones)
      .where(
        and(
          eq(projectMilestones.milestoneId, milestoneId),
          eq(projectMilestones.projectId, projectId),
          eq(projectMilestones.isDeleted, false),
        ),
      )
      .limit(1);

    if (!milestone) throw new NotFoundException("Milestone not found");
    return milestone;
  }
}
