import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  mockInterviewScores,
  mockInterviews,
  pathMentorAssignments,
  skillDemonstrations,
  skills,
} from "../database/schema";
import { ScheduleMockInterviewDto } from "./dto/schedule-mock-interview.dto";
import { SubmitScoreDto } from "./dto/submit-score.dto";

type DbType = PostgresJsDatabase<typeof schema>;

@Injectable()
export class MockInterviewsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async schedule(dto: ScheduleMockInterviewDto, mentorId: string) {
    const now = this.clock.now();
    const [assignment] = await this.db
      .select()
      .from(pathMentorAssignments)
      .where(
        and(
          eq(pathMentorAssignments.mentorId, mentorId),
          eq(pathMentorAssignments.studentId, dto.studentId),
          eq(pathMentorAssignments.pathId, dto.pathId),
          isNull(pathMentorAssignments.revokedAt),
        ),
      )
      .limit(1);

    if (!assignment) {
      throw new ForbiddenException(
        "No active mentor assignment for this student in this path",
      );
    }

    const [row] = await this.db
      .insert(mockInterviews)
      .values({
        pathId: dto.pathId,
        mentorId,
        studentId: dto.studentId,
        scheduledAt: new Date(dto.scheduledAt),
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return row;
  }

  async list(viewerId: string, viewerRole: string) {
    if (viewerRole === "PLATFORM_ADMIN") {
      return this.db.select().from(mockInterviews);
    }
    if (viewerRole === "INSTRUCTOR") {
      return this.db
        .select()
        .from(mockInterviews)
        .where(eq(mockInterviews.mentorId, viewerId));
    }
    return this.db
      .select()
      .from(mockInterviews)
      .where(eq(mockInterviews.studentId, viewerId));
  }

  async get(mockInterviewId: string, viewerId: string, viewerRole: string) {
    const [interview] = await this.db
      .select()
      .from(mockInterviews)
      .where(eq(mockInterviews.mockInterviewId, mockInterviewId))
      .limit(1);

    if (!interview) throw new NotFoundException("Mock interview not found");

    if (
      viewerRole !== "PLATFORM_ADMIN" &&
      interview.mentorId !== viewerId &&
      interview.studentId !== viewerId
    ) {
      throw new ForbiddenException("Access denied");
    }

    return interview;
  }

  async complete(mockInterviewId: string, mentorId: string) {
    const now = this.clock.now();
    const [interview] = await this.db
      .select()
      .from(mockInterviews)
      .where(eq(mockInterviews.mockInterviewId, mockInterviewId))
      .limit(1);

    if (!interview) throw new NotFoundException("Mock interview not found");
    if (interview.mentorId !== mentorId) {
      throw new ForbiddenException("Only the assigned mentor can complete this interview");
    }
    if (interview.status !== "SCHEDULED") {
      throw new ConflictException("Interview is not in SCHEDULED status");
    }

    const [updated] = await this.db
      .update(mockInterviews)
      .set({ status: "COMPLETED", completedAt: now, updatedAt: now })
      .where(eq(mockInterviews.mockInterviewId, mockInterviewId))
      .returning();
    return updated;
  }

  async submitScore(
    mockInterviewId: string,
    dto: SubmitScoreDto,
    mentorId: string,
  ) {
    const now = this.clock.now();
    const [interview] = await this.db
      .select()
      .from(mockInterviews)
      .where(eq(mockInterviews.mockInterviewId, mockInterviewId))
      .limit(1);

    if (!interview) throw new NotFoundException("Mock interview not found");
    if (interview.mentorId !== mentorId) {
      throw new ForbiddenException("Only the assigned mentor can submit scores");
    }
    if (interview.status !== "COMPLETED") {
      throw new ConflictException("Scores can only be submitted on completed interviews");
    }

    const [skill] = await this.db
      .select()
      .from(skills)
      .where(eq(skills.skillId, dto.skillId))
      .limit(1);
    if (!skill) throw new NotFoundException("Skill not found");

    const [score] = await this.db
      .insert(mockInterviewScores)
      .values({
        mockInterviewId,
        skillId: dto.skillId,
        score: dto.score,
        notes: dto.notes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          mockInterviewScores.mockInterviewId,
          mockInterviewScores.skillId,
        ],
        set: {
          score: dto.score,
          notes: dto.notes ?? null,
          editedAfterStudentViewed:
            interview.studentFirstViewedAt !== null,
          updatedAt: now,
        },
      })
      .returning();

    await this.syncSkillDemonstration(interview.studentId, dto.skillId, dto.score, now);

    return score;
  }

  private async syncSkillDemonstration(
    userId: string,
    skillId: string,
    score: number,
    now: Date,
  ) {
    const [existing] = await this.db
      .select()
      .from(skillDemonstrations)
      .where(
        and(
          eq(skillDemonstrations.userId, userId),
          eq(skillDemonstrations.skillId, skillId),
        ),
      )
      .limit(1);

    const demonstrated = score >= 3;

    if (existing) {
      await this.db
        .update(skillDemonstrations)
        .set({
          completedItems: existing.completedItems + 1,
          demonstratedAt: demonstrated ? now : existing.demonstratedAt,
          updatedAt: now,
        })
        .where(eq(skillDemonstrations.demonstrationId, existing.demonstrationId));
    } else {
      await this.db.insert(skillDemonstrations).values({
        userId,
        skillId,
        completedItems: 1,
        demonstratedAt: demonstrated ? now : null,
        updatedAt: now,
      });
    }
  }

  async getScores(
    mockInterviewId: string,
    viewerId: string,
    viewerRole: string,
  ) {
    const [interview] = await this.db
      .select()
      .from(mockInterviews)
      .where(eq(mockInterviews.mockInterviewId, mockInterviewId))
      .limit(1);

    if (!interview) throw new NotFoundException("Mock interview not found");

    if (
      viewerRole !== "PLATFORM_ADMIN" &&
      interview.mentorId !== viewerId &&
      interview.studentId !== viewerId
    ) {
      throw new ForbiddenException("Access denied");
    }

    if (interview.studentId === viewerId && interview.studentFirstViewedAt === null) {
      const now = this.clock.now();
      await this.db
        .update(mockInterviews)
        .set({ studentFirstViewedAt: now, updatedAt: now })
        .where(eq(mockInterviews.mockInterviewId, mockInterviewId));
    }

    return this.db
      .select()
      .from(mockInterviewScores)
      .where(eq(mockInterviewScores.mockInterviewId, mockInterviewId));
  }
}
