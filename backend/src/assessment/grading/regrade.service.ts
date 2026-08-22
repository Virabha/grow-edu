import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../../audit/audit-log.service";
import { CLOCK, Clock } from "../../common/clock";
import { isUniqueViolation } from "../../common/unique-violation";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assessmentAttemptAnswers,
  assessmentAttempts,
  assessmentRegradeRequests,
  assessmentTestQuestions,
  assessmentTests,
} from "../../database/schema";
import { OpenRegradeRequestDto, ResolveRegradeDto } from "./dto/regrade.dto";

@Injectable()
export class RegradeService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly auditLog: AuditLogService,
  ) {}

  async openRequest(dto: OpenRegradeRequestDto, studentId: string) {
    const [answer] = await this.db
      .select()
      .from(assessmentAttemptAnswers)
      .where(eq(assessmentAttemptAnswers.answerId, dto.answerId))
      .limit(1);

    if (!answer) throw new NotFoundException("Answer not found");

    const [attempt] = await this.db
      .select()
      .from(assessmentAttempts)
      .where(eq(assessmentAttempts.attemptId, answer.attemptId))
      .limit(1);

    if (!attempt) throw new NotFoundException("Attempt not found");

    if (attempt.userId !== studentId) {
      throw new ForbiddenException("That answer does not belong to you");
    }

    if (answer.status !== "GRADED") {
      throw new BadRequestException(
        "Regrade requests can only be opened against graded answers",
      );
    }

    const [existing] = await this.db
      .select()
      .from(assessmentRegradeRequests)
      .where(
        and(
          eq(assessmentRegradeRequests.answerId, dto.answerId),
          eq(assessmentRegradeRequests.status, "OPEN"),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(
        "An open regrade request already exists for this answer",
      );
    }

    const now = this.clock.now();
    try {
      const [request] = await this.db
        .insert(assessmentRegradeRequests)
        .values({
          answerId: dto.answerId,
          attemptId: answer.attemptId,
          studentId,
          reason: dto.reason,
          status: "OPEN",
          originalMarks: answer.awardedMarks,
          createdAt: now,
        })
        .returning();

      return request;
    } catch (err) {
      if (
        isUniqueViolation(err, "assessment_regrade_requests_open_unique")
      ) {
        throw new ConflictException(
          "An open regrade request already exists for this answer",
        );
      }
      throw err;
    }
  }

  async getQueue(instructorId: string, role = "INSTRUCTOR") {
    const isAdmin = role === "PLATFORM_ADMIN";
    const batchIds = isAdmin ? [] : await this.instructorBatchIds(instructorId);
    if (!isAdmin && batchIds.length === 0) return [];

    const whereClause = isAdmin
      ? eq(assessmentRegradeRequests.status, "OPEN")
      : and(
          eq(assessmentRegradeRequests.status, "OPEN"),
          inArray(assessmentTests.batchId, batchIds),
        );

    const requests = await this.db
      .select({
        requestId: assessmentRegradeRequests.requestId,
        answerId: assessmentRegradeRequests.answerId,
        attemptId: assessmentRegradeRequests.attemptId,
        studentId: assessmentRegradeRequests.studentId,
        reason: assessmentRegradeRequests.reason,
        status: assessmentRegradeRequests.status,
        originalMarks: assessmentRegradeRequests.originalMarks,
        createdAt: assessmentRegradeRequests.createdAt,
        testId: assessmentAttempts.testId,
        batchId: assessmentTests.batchId,
      })
      .from(assessmentRegradeRequests)
      .innerJoin(
        assessmentAttempts,
        eq(assessmentRegradeRequests.attemptId, assessmentAttempts.attemptId),
      )
      .innerJoin(
        assessmentTests,
        eq(assessmentAttempts.testId, assessmentTests.testId),
      )
      .where(whereClause)
      .orderBy(asc(assessmentRegradeRequests.createdAt));

    return requests;
  }

  async resolve(
    requestId: string,
    dto: ResolveRegradeDto,
    instructorId: string,
    role = "INSTRUCTOR",
  ) {
    const [request] = await this.db
      .select()
      .from(assessmentRegradeRequests)
      .where(eq(assessmentRegradeRequests.requestId, requestId))
      .limit(1);

    if (!request) throw new NotFoundException("Regrade request not found");

    if (request.status !== "OPEN") {
      throw new ConflictException("This regrade request is already resolved");
    }

    if (role !== "PLATFORM_ADMIN") {
      await this.assertInstructorCanSeeRequest(request, instructorId);
    }

    const originalMarks = Number(request.originalMarks ?? 0);
    const marksChanged = dto.resolvedMarks !== originalMarks;

    if (marksChanged && !dto.justification.trim()) {
      throw new BadRequestException(
        "A justification is required when changing the mark",
      );
    }

    const [answer] = await this.db
      .select()
      .from(assessmentAttemptAnswers)
      .where(eq(assessmentAttemptAnswers.answerId, request.answerId))
      .limit(1);

    if (!answer) throw new NotFoundException("Answer not found");

    const [placement] = await this.db
      .select()
      .from(assessmentTestQuestions)
      .where(eq(assessmentTestQuestions.placementId, answer.placementId))
      .limit(1);

    if (placement && dto.resolvedMarks > Number(placement.marks)) {
      throw new BadRequestException(
        `Resolved marks cannot exceed the placement's marks (${Number(placement.marks)})`,
      );
    }

    if (dto.resolvedMarks < 0) {
      throw new BadRequestException("Resolved marks cannot be negative");
    }

    const now = this.clock.now();
    const outcome = marksChanged ? "CHANGED" : "UPHELD";

    await this.db.transaction(async (tx) => {
      const claimed = await tx
        .update(assessmentRegradeRequests)
        .set({
          status: outcome,
          resolvedMarks: dto.resolvedMarks.toString(),
          justification: dto.justification,
          resolvedBy: instructorId,
          resolvedAt: now,
        })
        .where(
          and(
            eq(assessmentRegradeRequests.requestId, requestId),
            eq(assessmentRegradeRequests.status, "OPEN"),
          ),
        )
        .returning({ requestId: assessmentRegradeRequests.requestId });

      if (claimed.length === 0) {
        throw new ConflictException(
          "This regrade request is already resolved",
        );
      }

      if (marksChanged) {
        await tx
          .update(assessmentAttemptAnswers)
          .set({
            awardedMarks: dto.resolvedMarks.toString(),
            updatedAt: now,
          })
          .where(eq(assessmentAttemptAnswers.answerId, request.answerId));

        await this.recomputeAttemptFinalScore(request.attemptId, tx);
      }

      await this.auditLog.record({
        action: "REGRADE_RESOLVED",
        targetType: "regrade_request",
        targetId: requestId,
        before: { marks: request.originalMarks, status: "OPEN" },
        after: {
          marks: dto.resolvedMarks,
          status: outcome,
          justification: dto.justification,
        },
        tx,
      });
    });

    const [resolved] = await this.db
      .select()
      .from(assessmentRegradeRequests)
      .where(eq(assessmentRegradeRequests.requestId, requestId))
      .limit(1);

    return resolved;
  }

  private async recomputeAttemptFinalScore(
    attemptId: string,
    tx: Parameters<Parameters<typeof this.db.transaction>[0]>[0],
  ) {
    const [attempt] = await tx
      .select()
      .from(assessmentAttempts)
      .where(eq(assessmentAttempts.attemptId, attemptId))
      .limit(1);

    if (!attempt) return;

    const [{ totalGraded }] = await tx
      .select({
        totalGraded:
          sql<string>`coalesce(sum(awarded_marks::numeric), 0)::text`,
      })
      .from(assessmentAttemptAnswers)
      .where(
        and(
          eq(assessmentAttemptAnswers.attemptId, attemptId),
          eq(assessmentAttemptAnswers.status, "GRADED"),
        ),
      );

    const provisional = Number(attempt.provisionalScore ?? 0);
    const graded = Number(totalGraded);
    const finalScore = Number((provisional + graded).toFixed(2));

    await tx
      .update(assessmentAttempts)
      .set({ finalScore: finalScore.toString(), updatedAt: this.clock.now() })
      .where(eq(assessmentAttempts.attemptId, attemptId));
  }

  private async assertInstructorCanSeeRequest(
    request: typeof assessmentRegradeRequests.$inferSelect,
    instructorId: string,
  ) {
    const [attempt] = await this.db
      .select()
      .from(assessmentAttempts)
      .where(eq(assessmentAttempts.attemptId, request.attemptId))
      .limit(1);

    if (!attempt) throw new NotFoundException("Attempt not found");

    const [test] = await this.db
      .select()
      .from(assessmentTests)
      .where(eq(assessmentTests.testId, attempt.testId))
      .limit(1);

    if (!test || !test.batchId) {
      throw new ForbiddenException("Test is not associated with a batch");
    }

    const batchIds = await this.instructorBatchIds(instructorId);
    if (!batchIds.includes(test.batchId)) {
      throw new ForbiddenException(
        "You do not teach a batch that contains this attempt",
      );
    }
  }

  private async instructorBatchIds(instructorId: string): Promise<string[]> {
    const rows = await this.db
      .select({ batchId: schema.batchInstructors.batchId })
      .from(schema.batchInstructors)
      .where(eq(schema.batchInstructors.instructorId, instructorId));
    return rows.map((r) => r.batchId);
  }
}
