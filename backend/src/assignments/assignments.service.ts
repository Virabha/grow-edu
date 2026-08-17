import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  assignments,
  assignmentSubmissions,
  courses,
  enrollments,
  users,
} from "../database/schema";
import { CreateAssignmentDto } from "./dto/create-assignment.dto";
import { UpdateAssignmentDto } from "./dto/update-assignment.dto";
import { FilterAssignmentsDto } from "./dto/filter-assignments.dto";
import { SubmitAssignmentDto } from "./dto/submit-assignment.dto";
import { GradeSubmissionDto } from "./dto/grade-submission.dto";
import { FilterSubmissionsDto } from "./dto/filter-submissions.dto";
import { PaginationDto } from "../common/dto/pagination.dto";

const MAX_PAGE_LIMIT = 100;

type DbType = PostgresJsDatabase<typeof schema>;

@Injectable()
export class AssignmentsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
  ) {}

  async listAssignments(userId: string, role: string, filters: FilterAssignmentsDto) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    const conditions = [eq(assignments.isDeleted, false)];
    if (role !== "PLATFORM_ADMIN") {
      conditions.push(eq(assignments.instructorId, userId));
    }
    if (filters.submissionType && filters.submissionType !== "all") {
      conditions.push(
        eq(assignments.submissionType, filters.submissionType as "FILE" | "TEXT" | "LINK"),
      );
    }
    if (filters.search) {
      conditions.push(ilike(assignments.title, `%${filters.search}%`));
    }

    const where = and(...conditions);

    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          id: assignments.id,
          title: assignments.title,
          courseId: assignments.courseId,
          courseTitle: courses.title,
          submissionType: assignments.submissionType,
          dueAt: assignments.dueAt,
          isPublished: assignments.isPublished,
          submissions: sql<number>`count(${assignmentSubmissions.id})::int`,
          graded: sql<number>`count(case when ${assignmentSubmissions.status} = 'GRADED' then 1 end)::int`,
        })
        .from(assignments)
        .leftJoin(courses, eq(assignments.courseId, courses.courseId))
        .leftJoin(
          assignmentSubmissions,
          eq(assignments.id, assignmentSubmissions.assignmentId),
        )
        .where(where)
        .groupBy(assignments.id, courses.title)
        .orderBy(desc(assignments.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(assignments)
        .where(where),
    ]);

    const total = countRows[0]?.total ?? 0;
    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createAssignment(userId: string, role: string, dto: CreateAssignmentDto) {
    if (dto.passMarks > dto.maxMarks) {
      throw new BadRequestException("passMarks cannot exceed maxMarks");
    }

    const [course] = await this.db
      .select({ courseId: courses.courseId, instructorId: courses.instructorId })
      .from(courses)
      .where(eq(courses.courseId, dto.courseId))
      .limit(1);

    if (!course) {
      throw new NotFoundException("Course not found");
    }
    if (role !== "PLATFORM_ADMIN" && course.instructorId !== userId) {
      throw new ForbiddenException("You can only create assignments for your own courses");
    }

    const [created] = await this.db
      .insert(assignments)
      .values({
        courseId: dto.courseId,
        instructorId: course.instructorId,
        title: dto.title,
        instructions: dto.instructions ?? null,
        submissionType: dto.submissionType,
        maxMarks: dto.maxMarks,
        passMarks: dto.passMarks,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        allowResubmission: dto.allowResubmission ?? false,
        isPublished: dto.isPublished ?? false,
      })
      .returning();

    return created;
  }

  async getAssignment(assignmentId: string, userId: string, role: string) {
    const [row] = await this.db
      .select({
        id: assignments.id,
        courseId: assignments.courseId,
        instructorId: assignments.instructorId,
        title: assignments.title,
        instructions: assignments.instructions,
        submissionType: assignments.submissionType,
        maxMarks: assignments.maxMarks,
        passMarks: assignments.passMarks,
        dueAt: assignments.dueAt,
        allowResubmission: assignments.allowResubmission,
        isPublished: assignments.isPublished,
        createdAt: assignments.createdAt,
        updatedAt: assignments.updatedAt,
        courseTitle: courses.title,
      })
      .from(assignments)
      .leftJoin(courses, eq(assignments.courseId, courses.courseId))
      .where(and(eq(assignments.id, assignmentId), eq(assignments.isDeleted, false)))
      .limit(1);

    if (!row) {
      throw new NotFoundException("Assignment not found");
    }
    if (role !== "PLATFORM_ADMIN" && row.instructorId !== userId) {
      throw new ForbiddenException("Access denied");
    }

    return row;
  }

  async updateAssignment(
    assignmentId: string,
    userId: string,
    role: string,
    dto: UpdateAssignmentDto,
  ) {
    const [existing] = await this.db
      .select({
        id: assignments.id,
        instructorId: assignments.instructorId,
        maxMarks: assignments.maxMarks,
        passMarks: assignments.passMarks,
      })
      .from(assignments)
      .where(and(eq(assignments.id, assignmentId), eq(assignments.isDeleted, false)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException("Assignment not found");
    }
    if (role !== "PLATFORM_ADMIN" && existing.instructorId !== userId) {
      throw new ForbiddenException("You can only edit your own assignments");
    }

    const resolvedMax = dto.maxMarks ?? existing.maxMarks;
    const resolvedPass = dto.passMarks ?? existing.passMarks;
    if (resolvedPass > resolvedMax) {
      throw new BadRequestException("passMarks cannot exceed maxMarks");
    }

    const [updated] = await this.db
      .update(assignments)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.instructions !== undefined && { instructions: dto.instructions }),
        ...(dto.submissionType !== undefined && { submissionType: dto.submissionType }),
        ...(dto.maxMarks !== undefined && { maxMarks: dto.maxMarks }),
        ...(dto.passMarks !== undefined && { passMarks: dto.passMarks }),
        ...(dto.dueAt !== undefined && { dueAt: new Date(dto.dueAt) }),
        ...(dto.allowResubmission !== undefined && { allowResubmission: dto.allowResubmission }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
        updatedAt: new Date(),
      })
      .where(eq(assignments.id, assignmentId))
      .returning();

    return updated;
  }

  async deleteAssignment(assignmentId: string, userId: string, role: string) {
    const [existing] = await this.db
      .select({ id: assignments.id, instructorId: assignments.instructorId })
      .from(assignments)
      .where(and(eq(assignments.id, assignmentId), eq(assignments.isDeleted, false)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException("Assignment not found");
    }
    if (role !== "PLATFORM_ADMIN" && existing.instructorId !== userId) {
      throw new ForbiddenException("You can only delete your own assignments");
    }

    await this.db
      .update(assignments)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(assignments.id, assignmentId));

    return { deleted: true };
  }

  async listAssignmentSubmissions(
    assignmentId: string,
    userId: string,
    role: string,
    filters: PaginationDto,
  ) {
    const [assignment] = await this.db
      .select({ id: assignments.id, instructorId: assignments.instructorId })
      .from(assignments)
      .where(and(eq(assignments.id, assignmentId), eq(assignments.isDeleted, false)))
      .limit(1);

    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }
    if (role !== "PLATFORM_ADMIN" && assignment.instructorId !== userId) {
      throw new ForbiddenException("Access denied");
    }

    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    const where = eq(assignmentSubmissions.assignmentId, assignmentId);

    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          id: assignmentSubmissions.id,
          assignmentId: assignmentSubmissions.assignmentId,
          userId: assignmentSubmissions.userId,
          attempt: assignmentSubmissions.attemptNo,
          fileKey: assignmentSubmissions.fileKey,
          textAnswer: assignmentSubmissions.textAnswer,
          linkUrl: assignmentSubmissions.linkUrl,
          status: assignmentSubmissions.status,
          marks: assignmentSubmissions.marks,
          feedback: assignmentSubmissions.feedback,
          gradedBy: assignmentSubmissions.gradedBy,
          gradedAt: assignmentSubmissions.gradedAt,
          submittedAt: assignmentSubmissions.submittedAt,
          learnerName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
          learnerEmail: users.email,
          assignmentTitle: assignments.title,
        })
        .from(assignmentSubmissions)
        .leftJoin(users, eq(assignmentSubmissions.userId, users.userId))
        .leftJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
        .where(where)
        .orderBy(desc(assignmentSubmissions.submittedAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(assignmentSubmissions)
        .where(where),
    ]);

    const total = countRows[0]?.total ?? 0;
    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async listAllSubmissions(userId: string, role: string, filters: FilterSubmissionsDto) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];
    if (role !== "PLATFORM_ADMIN") {
      conditions.push(eq(assignments.instructorId, userId));
    }
    if (filters.status && filters.status !== "all") {
      conditions.push(
        eq(assignmentSubmissions.status, filters.status as "SUBMITTED" | "GRADED" | "RETURNED"),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          id: assignmentSubmissions.id,
          assignmentId: assignmentSubmissions.assignmentId,
          userId: assignmentSubmissions.userId,
          attempt: assignmentSubmissions.attemptNo,
          fileKey: assignmentSubmissions.fileKey,
          textAnswer: assignmentSubmissions.textAnswer,
          linkUrl: assignmentSubmissions.linkUrl,
          status: assignmentSubmissions.status,
          marks: assignmentSubmissions.marks,
          feedback: assignmentSubmissions.feedback,
          submittedAt: assignmentSubmissions.submittedAt,
          learnerName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
          learnerEmail: users.email,
          assignmentTitle: assignments.title,
        })
        .from(assignmentSubmissions)
        .leftJoin(users, eq(assignmentSubmissions.userId, users.userId))
        .leftJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
        .where(where)
        .orderBy(desc(assignmentSubmissions.submittedAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(assignmentSubmissions)
        .leftJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
        .where(where),
    ]);

    const total = countRows[0]?.total ?? 0;
    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async submitAssignment(assignmentId: string, userId: string, dto: SubmitAssignmentDto) {
    const [assignment] = await this.db
      .select({
        id: assignments.id,
        courseId: assignments.courseId,
        submissionType: assignments.submissionType,
        dueAt: assignments.dueAt,
        allowResubmission: assignments.allowResubmission,
        isPublished: assignments.isPublished,
        isDeleted: assignments.isDeleted,
      })
      .from(assignments)
      .where(and(eq(assignments.id, assignmentId), eq(assignments.isDeleted, false)))
      .limit(1);

    if (!assignment || !assignment.isPublished) {
      throw new NotFoundException("Assignment not found");
    }

    if (assignment.dueAt && new Date() > assignment.dueAt) {
      throw new UnprocessableEntityException("Assignment is past its due date");
    }

    if (assignment.submissionType === "FILE" && !dto.fileKey) {
      throw new BadRequestException("File submission requires a fileKey");
    }
    if (assignment.submissionType === "TEXT" && !dto.textAnswer) {
      throw new BadRequestException("Text submission requires a textAnswer");
    }
    if (assignment.submissionType === "LINK" && !dto.linkUrl) {
      throw new BadRequestException("Link submission requires a linkUrl");
    }

    const [enrollment] = await this.db
      .select({ enrollmentId: enrollments.enrollmentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, assignment.courseId),
          eq(enrollments.status, "ACTIVE"),
        ),
      )
      .limit(1);

    if (!enrollment) {
      throw new ForbiddenException("You must be enrolled in this course to submit assignments");
    }

    const [latestSub] = await this.db
      .select({ attemptNo: assignmentSubmissions.attemptNo })
      .from(assignmentSubmissions)
      .where(
        and(
          eq(assignmentSubmissions.assignmentId, assignmentId),
          eq(assignmentSubmissions.userId, userId),
        ),
      )
      .orderBy(desc(assignmentSubmissions.attemptNo))
      .limit(1);

    if (latestSub) {
      if (!assignment.allowResubmission) {
        throw new BadRequestException("This assignment does not allow resubmission");
      }
    }

    const attemptNo = latestSub ? latestSub.attemptNo + 1 : 1;

    const [submission] = await this.db
      .insert(assignmentSubmissions)
      .values({
        assignmentId,
        userId,
        attemptNo,
        fileKey: dto.fileKey ?? null,
        textAnswer: dto.textAnswer ?? null,
        linkUrl: dto.linkUrl ?? null,
        status: "SUBMITTED",
        submittedAt: new Date(),
      })
      .returning();

    return submission;
  }

  async gradeSubmission(
    submissionId: string,
    graderId: string,
    graderRole: string,
    dto: GradeSubmissionDto,
  ) {
    const [sub] = await this.db
      .select({
        id: assignmentSubmissions.id,
        assignmentId: assignmentSubmissions.assignmentId,
      })
      .from(assignmentSubmissions)
      .where(eq(assignmentSubmissions.id, submissionId))
      .limit(1);

    if (!sub) {
      throw new NotFoundException("Submission not found");
    }

    const [assignment] = await this.db
      .select({
        id: assignments.id,
        maxMarks: assignments.maxMarks,
        instructorId: assignments.instructorId,
      })
      .from(assignments)
      .where(eq(assignments.id, sub.assignmentId))
      .limit(1);

    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }
    if (graderRole !== "PLATFORM_ADMIN" && assignment.instructorId !== graderId) {
      throw new ForbiddenException("You can only grade submissions for your own assignments");
    }
    if (dto.marks < 0 || dto.marks > assignment.maxMarks) {
      throw new BadRequestException(
        `Marks must be between 0 and ${assignment.maxMarks}`,
      );
    }

    const [updated] = await this.db
      .update(assignmentSubmissions)
      .set({
        marks: dto.marks,
        feedback: dto.feedback ?? null,
        status: dto.status ?? "GRADED",
        gradedBy: graderId,
        gradedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(assignmentSubmissions.id, submissionId))
      .returning();

    return updated;
  }
}
