import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assessmentAttemptAnswers,
  assessmentAttempts,
  assessmentCriterionScores,
  assessmentTestQuestions,
  assessmentTests,
  assessmentQuestions,
} from "../../database/schema";
import { FilesService } from "../../files/files.service";
import { AttachFeedbackDto, GradeAnswerDto } from "./dto/grading.dto";
import { RubricService } from "./rubric.service";

@Injectable()
export class GradingService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly rubrics: RubricService,
    private readonly files: FilesService,
  ) {}

  async getQueue(instructorId: string, role = "INSTRUCTOR") {
    const isAdmin = role === "PLATFORM_ADMIN";
    const batchIds = isAdmin ? [] : await this.instructorBatchIds(instructorId);
    if (!isAdmin && batchIds.length === 0) return { item: null };

    const whereClause = isAdmin
      ? eq(assessmentAttemptAnswers.status, "PENDING_GRADING")
      : and(
          eq(assessmentAttemptAnswers.status, "PENDING_GRADING"),
          inArray(assessmentTests.batchId, batchIds),
        );

    const pendingAnswers = await this.db
      .select({
        answerId: assessmentAttemptAnswers.answerId,
        attemptId: assessmentAttemptAnswers.attemptId,
        placementId: assessmentAttemptAnswers.placementId,
        questionId: assessmentAttemptAnswers.questionId,
        response: assessmentAttemptAnswers.response,
        graderComment: assessmentAttemptAnswers.graderComment,
        gradedBy: assessmentAttemptAnswers.gradedBy,
        gradedAt: assessmentAttemptAnswers.gradedAt,
        status: assessmentAttemptAnswers.status,
        testId: assessmentAttempts.testId,
        userId: assessmentAttempts.userId,
        marks: assessmentTestQuestions.marks,
        rubricId: assessmentTestQuestions.rubricId,
        batchId: assessmentTests.batchId,
      })
      .from(assessmentAttemptAnswers)
      .innerJoin(
        assessmentAttempts,
        eq(assessmentAttemptAnswers.attemptId, assessmentAttempts.attemptId),
      )
      .innerJoin(
        assessmentTestQuestions,
        eq(
          assessmentAttemptAnswers.placementId,
          assessmentTestQuestions.placementId,
        ),
      )
      .innerJoin(
        assessmentTests,
        eq(assessmentAttempts.testId, assessmentTests.testId),
      )
      .where(whereClause)
      .orderBy(asc(assessmentAttemptAnswers.createdAt))
      .limit(1);

    if (pendingAnswers.length === 0) return { item: null };

    const first = pendingAnswers[0];
    const rubric = first.rubricId
      ? await this.rubrics.getRubric(first.rubricId)
      : null;

    const existingScores = await this.db
      .select()
      .from(assessmentCriterionScores)
      .where(eq(assessmentCriterionScores.answerId, first.answerId));

    return {
      item: {
        answerId: first.answerId,
        attemptId: first.attemptId,
        placementId: first.placementId,
        questionId: first.questionId,
        response: first.response,
        graderComment: first.graderComment,
        marks: Number(first.marks),
        rubric,
        partialScores: existingScores,
        batchId: first.batchId,
        studentId: first.userId,
      },
    };
  }

  async getAnswerForGrading(answerId: string, instructorId: string, role = "INSTRUCTOR") {
    const answer = await this.requireAnswerForInstructor(answerId, instructorId, role);

    const [placement] = await this.db
      .select()
      .from(assessmentTestQuestions)
      .where(eq(assessmentTestQuestions.placementId, answer.placementId))
      .limit(1);

    const rubric = placement?.rubricId
      ? await this.rubrics.getRubric(placement.rubricId)
      : null;

    const existingScores = await this.db
      .select()
      .from(assessmentCriterionScores)
      .where(eq(assessmentCriterionScores.answerId, answerId));

    const question = await this.db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.questionId, answer.questionId))
      .limit(1);

    const pages: string[] =
      question[0]?.type === "IMAGE_UPLOAD"
        ? this.extractPages(answer.response)
        : [];

    return {
      answerId: answer.answerId,
      attemptId: answer.attemptId,
      placementId: answer.placementId,
      questionId: answer.questionId,
      questionType: question[0]?.type ?? null,
      response: answer.response,
      pages,
      graderComment: answer.graderComment,
      gradedBy: answer.gradedBy,
      gradedAt: answer.gradedAt,
      awardedMarks:
        answer.awardedMarks !== null ? Number(answer.awardedMarks) : null,
      status: answer.status,
      marks: placement ? Number(placement.marks) : null,
      rubric,
      criterionScores: existingScores,
      feedbackMediaId: answer.feedbackMediaId
        ? this.files.getDownloadUrl(answer.feedbackMediaId)
        : null,
    };
  }

  async gradeAnswer(
    answerId: string,
    dto: GradeAnswerDto,
    instructorId: string,
    role = "INSTRUCTOR",
  ) {
    const answer = await this.requireAnswerForInstructor(answerId, instructorId, role);

    if (answer.status === "AUTO_SCORED") {
      throw new BadRequestException(
        "This answer is auto-scored and cannot be human-graded",
      );
    }

    const [placement] = await this.db
      .select()
      .from(assessmentTestQuestions)
      .where(eq(assessmentTestQuestions.placementId, answer.placementId))
      .limit(1);

    if (!placement) throw new NotFoundException("Placement not found");

    const placementMarks = Number(placement.marks);
    const now = this.clock.now();

    let awardedMarks: number;

    if (dto.criteria && dto.criteria.length > 0 && placement.rubricId) {
      const rubric = await this.rubrics.getRubric(placement.rubricId);
      const criteria = rubric.criteria;
      const criteriaMap = new Map(criteria.map((c) => [c.criterionId, c]));

      for (const score of dto.criteria) {
        if (!criteriaMap.has(score.criterionId)) {
          throw new BadRequestException(
            `Criterion ${score.criterionId} does not belong to this rubric`,
          );
        }
        await this.rubrics.validateCriterionValue(placement.rubricId, score.value);
      }

      const totalWeight = criteria.reduce((s, c) => s + Number(c.weight), 0);
      const earned = dto.criteria.reduce((sum, score) => {
        const criterion = criteriaMap.get(score.criterionId);
        if (!criterion) return sum;
        return sum + (score.value / rubric.scaleMax) * Number(criterion.weight);
      }, 0);

      awardedMarks = Math.min(
        placementMarks,
        Number(((earned / totalWeight) * placementMarks).toFixed(2)),
      );

      await this.db.transaction(async (tx) => {
        for (const score of dto.criteria ?? []) {
          await tx
            .insert(assessmentCriterionScores)
            .values({
              answerId,
              criterionId: score.criterionId,
              value: score.value.toString(),
              comment: score.comment ?? null,
              createdAt: now,
            })
            .onConflictDoUpdate({
              target: [
                assessmentCriterionScores.answerId,
                assessmentCriterionScores.criterionId,
              ],
              set: {
                value: score.value.toString(),
                comment: score.comment ?? null,
              },
            });
        }
        await tx
          .update(assessmentAttemptAnswers)
          .set({
            awardedMarks: awardedMarks.toString(),
            graderComment: dto.comment ?? null,
            gradedBy: instructorId,
            gradedAt: now,
            status: "GRADED",
            updatedAt: now,
          })
          .where(eq(assessmentAttemptAnswers.answerId, answerId));
      });
    } else if (dto.totalMarks !== undefined) {
      if (dto.totalMarks < 0 || dto.totalMarks > placementMarks) {
        throw new BadRequestException(
          `Marks must be between 0 and ${placementMarks}`,
        );
      }
      awardedMarks = dto.totalMarks;
    } else {
      throw new BadRequestException(
        "Provide either criteria scores or a total marks value",
      );
    }

    if (!dto.criteria || dto.criteria.length === 0 || !placement.rubricId) {
      await this.db
        .update(assessmentAttemptAnswers)
        .set({
          awardedMarks: awardedMarks.toString(),
          graderComment: dto.comment ?? null,
          gradedBy: instructorId,
          gradedAt: now,
          status: "GRADED",
          updatedAt: now,
        })
        .where(eq(assessmentAttemptAnswers.answerId, answerId));
    }

    await this.maybeFinaliseAttempt(answer.attemptId, now);

    return this.getAnswerForGrading(answerId, instructorId, role);
  }

  async attachFeedback(
    answerId: string,
    dto: AttachFeedbackDto,
    instructorId: string,
    role = "INSTRUCTOR",
  ) {
    const answer = await this.requireAnswerForInstructor(answerId, instructorId, role);

    if (answer.status !== "GRADED") {
      throw new BadRequestException(
        "Feedback can only be attached to a graded answer",
      );
    }

    const key = this.normalizeToStorageKey(dto.mediaKey);
    const now = this.clock.now();

    await this.db
      .update(assessmentAttemptAnswers)
      .set({ feedbackMediaId: key, updatedAt: now })
      .where(eq(assessmentAttemptAnswers.answerId, answerId));

    return { answerId, feedbackMediaId: this.files.getDownloadUrl(key) };
  }

  async getFeedback(answerId: string, requesterId: string, requesterRole: string) {
    const [answer] = await this.db
      .select()
      .from(assessmentAttemptAnswers)
      .where(eq(assessmentAttemptAnswers.answerId, answerId))
      .limit(1);

    if (!answer) throw new NotFoundException("Answer not found");

    const [attempt] = await this.db
      .select()
      .from(assessmentAttempts)
      .where(eq(assessmentAttempts.attemptId, answer.attemptId))
      .limit(1);

    if (!attempt) throw new NotFoundException("Attempt not found");

    const isStaff =
      requesterRole === "PLATFORM_ADMIN" || requesterRole === "INSTRUCTOR";
    const isOwner = attempt.userId === requesterId;

    if (!isStaff && !isOwner) {
      throw new ForbiddenException(
        "Only the student who owns this attempt or staff may retrieve feedback",
      );
    }

    if (!answer.feedbackMediaId) {
      throw new NotFoundException("No feedback media attached to this answer");
    }

    return {
      answerId,
      feedbackMediaId: this.files.getDownloadUrl(answer.feedbackMediaId),
    };
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

  private extractPages(response: unknown): string[] {
    if (!Array.isArray(response)) return [];
    return response.filter((entry): entry is string => typeof entry === "string");
  }

  private async requireAnswerForInstructor(
    answerId: string,
    instructorId: string,
    role = "INSTRUCTOR",
  ) {
    const [answer] = await this.db
      .select()
      .from(assessmentAttemptAnswers)
      .where(eq(assessmentAttemptAnswers.answerId, answerId))
      .limit(1);

    if (!answer) throw new NotFoundException("Answer not found");

    const [attempt] = await this.db
      .select()
      .from(assessmentAttempts)
      .where(eq(assessmentAttempts.attemptId, answer.attemptId))
      .limit(1);

    if (!attempt) throw new NotFoundException("Attempt not found");

    const [test] = await this.db
      .select()
      .from(assessmentTests)
      .where(eq(assessmentTests.testId, attempt.testId))
      .limit(1);

    if (role === "PLATFORM_ADMIN") return answer;

    if (!test || !test.batchId) {
      throw new ForbiddenException("Test is not associated with a batch");
    }

    const batchIds = await this.instructorBatchIds(instructorId);
    if (!batchIds.includes(test.batchId)) {
      throw new ForbiddenException(
        "You do not teach a batch that contains this attempt",
      );
    }

    return answer;
  }

  private async instructorBatchIds(instructorId: string): Promise<string[]> {
    const rows = await this.db
      .select({ batchId: schema.batchInstructors.batchId })
      .from(schema.batchInstructors)
      .where(eq(schema.batchInstructors.instructorId, instructorId));
    return rows.map((r) => r.batchId);
  }

  private async maybeFinaliseAttempt(attemptId: string, now: Date) {
    const [{ pending }] = await this.db
      .select({ pending: sql<number>`count(*)::int` })
      .from(assessmentAttemptAnswers)
      .where(
        and(
          eq(assessmentAttemptAnswers.attemptId, attemptId),
          eq(assessmentAttemptAnswers.status, "PENDING_GRADING"),
        ),
      );

    if (pending > 0) return;

    const [attempt] = await this.db
      .select()
      .from(assessmentAttempts)
      .where(eq(assessmentAttempts.attemptId, attemptId))
      .limit(1);

    if (!attempt || attempt.status !== "AWAITING_GRADING") return;

    const [{ totalGraded }] = await this.db
      .select({
        totalGraded: sql<string>`coalesce(sum(awarded_marks::numeric), 0)::text`,
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

    await this.db
      .update(assessmentAttempts)
      .set({
        status: "GRADED",
        finalScore: finalScore.toString(),
        gradedAt: now,
        updatedAt: now,
      })
      .where(eq(assessmentAttempts.attemptId, attemptId));
  }
}
