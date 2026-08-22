import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  batchSessions,
  mentorSessionFeedback,
  pathMentorAssignments,
} from "../database/schema";
import { AssignMentorDto } from "./dto/assign-mentor.dto";
import { CreateMentorSessionDto, LiveProvider } from "./dto/create-mentor-session.dto";
import { WriteFeedbackDto } from "./dto/write-feedback.dto";

type DbType = PostgresJsDatabase<typeof schema>;

@Injectable()
export class MentorshipService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async assign(dto: AssignMentorDto, assignedBy: string) {
    const now = this.clock.now();
    try {
      const [row] = await this.db
        .insert(pathMentorAssignments)
        .values({
          pathId: dto.pathId,
          mentorId: dto.mentorId,
          studentId: dto.studentId,
          assignedBy,
          assignedAt: now,
        })
        .returning();
      return row;
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message.includes("path_mentor_assignments_active_unique")
      ) {
        throw new ConflictException("Mentor is already assigned to this student in this path");
      }
      throw err;
    }
  }

  async listAssignments(
    viewerId: string,
    viewerRole: string,
    filters: { mentorId?: string; studentId?: string } = {},
  ) {
    const conditions = [isNull(pathMentorAssignments.revokedAt)];

    if (viewerRole === "INSTRUCTOR") {
      conditions.push(eq(pathMentorAssignments.mentorId, viewerId));
    } else if (viewerRole === "LEARNER") {
      conditions.push(eq(pathMentorAssignments.studentId, viewerId));
    } else {
      if (filters.mentorId) {
        conditions.push(eq(pathMentorAssignments.mentorId, filters.mentorId));
      }
      if (filters.studentId) {
        conditions.push(eq(pathMentorAssignments.studentId, filters.studentId));
      }
    }

    return this.db
      .select()
      .from(pathMentorAssignments)
      .where(and(...conditions))
      .orderBy(desc(pathMentorAssignments.assignedAt));
  }

  async revoke(assignmentId: string, revokedBy: string) {
    const now = this.clock.now();
    const [row] = await this.db
      .select()
      .from(pathMentorAssignments)
      .where(eq(pathMentorAssignments.assignmentId, assignmentId))
      .limit(1);
    if (!row) throw new NotFoundException("Assignment not found");
    if (row.revokedAt) throw new ConflictException("Assignment already revoked");

    const [updated] = await this.db
      .update(pathMentorAssignments)
      .set({ revokedAt: now, revokedBy })
      .where(eq(pathMentorAssignments.assignmentId, assignmentId))
      .returning();
    return updated;
  }

  async engagement() {
    return this.db
      .select()
      .from(pathMentorAssignments)
      .orderBy(desc(pathMentorAssignments.assignedAt));
  }

  async createSession(dto: CreateMentorSessionDto, mentorId: string) {
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

    const [session] = await this.db
      .insert(batchSessions)
      .values({
        title: dto.title,
        type: "ONE_TO_ONE",
        teacherId: mentorId,
        scheduledStartAt: new Date(dto.scheduledStartAt),
        scheduledEndAt: new Date(dto.scheduledEndAt),
        joinUrl: dto.joinUrl ?? null,
        liveProvider: (dto.liveProvider as LiveProvider) ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return session;
  }

  async listSessions(viewerId: string, viewerRole: string) {
    if (viewerRole === "PLATFORM_ADMIN") {
      return this.db
        .select()
        .from(batchSessions)
        .where(eq(batchSessions.type, "ONE_TO_ONE"))
        .orderBy(desc(batchSessions.scheduledStartAt));
    }

    if (viewerRole === "INSTRUCTOR") {
      return this.db
        .select()
        .from(batchSessions)
        .where(
          and(
            eq(batchSessions.type, "ONE_TO_ONE"),
            eq(batchSessions.teacherId, viewerId),
          ),
        )
        .orderBy(desc(batchSessions.scheduledStartAt));
    }

    const feedbacks = await this.db
      .select({ sessionId: mentorSessionFeedback.sessionId })
      .from(mentorSessionFeedback)
      .where(eq(mentorSessionFeedback.studentId, viewerId));

    if (feedbacks.length === 0) return [];

    const sessionIds = feedbacks.map((f) => f.sessionId);
    return this.db
      .select()
      .from(batchSessions)
      .where(
        and(
          eq(batchSessions.type, "ONE_TO_ONE"),
          inArray(batchSessions.sessionId, sessionIds),
        ),
      )
      .orderBy(desc(batchSessions.scheduledStartAt));
  }

  async writeFeedback(
    sessionId: string,
    mentorId: string,
    studentId: string,
    dto: WriteFeedbackDto,
  ) {
    const [session] = await this.db
      .select()
      .from(batchSessions)
      .where(
        and(
          eq(batchSessions.sessionId, sessionId),
          eq(batchSessions.type, "ONE_TO_ONE"),
        ),
      )
      .limit(1);

    if (!session) throw new NotFoundException("Session not found");
    if (session.teacherId !== mentorId) {
      throw new ForbiddenException("Only the mentor who created this session can write feedback");
    }

    const now = this.clock.now();
    const [existing] = await this.db
      .select()
      .from(mentorSessionFeedback)
      .where(eq(mentorSessionFeedback.sessionId, sessionId))
      .limit(1);

    if (existing) {
      const [updated] = await this.db
        .update(mentorSessionFeedback)
        .set({ notes: dto.notes, updatedAt: now })
        .where(eq(mentorSessionFeedback.feedbackId, existing.feedbackId))
        .returning();
      return updated;
    }

    const [row] = await this.db
      .insert(mentorSessionFeedback)
      .values({
        sessionId,
        mentorId,
        studentId,
        notes: dto.notes,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return row;
  }

  async getFeedback(sessionId: string, viewerId: string, viewerRole: string) {
    const [feedback] = await this.db
      .select()
      .from(mentorSessionFeedback)
      .where(eq(mentorSessionFeedback.sessionId, sessionId))
      .limit(1);

    if (!feedback) throw new NotFoundException("Feedback not found");

    if (
      viewerRole !== "PLATFORM_ADMIN" &&
      feedback.mentorId !== viewerId
    ) {
      throw new ForbiddenException("Access denied");
    }

    return feedback;
  }
}
