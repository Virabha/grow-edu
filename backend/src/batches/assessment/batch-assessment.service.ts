import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchQuizAttempts,
  batchQuizQuestions,
  batchQuizzes,
  users,
} from "../../database/schema";
import { QuizCorrectAnswer } from "../../database/schema/batches";
import { Queryable } from "../../database/transaction";
import { NotificationsService } from "../../notifications/notifications.service";
import { BatchAccessService, SignedInViewer, Viewer } from "../access/batch-access.service";
import { CLOCK, Clock } from "../../common/clock";
import { BatchMediaService } from "../batch-media.service";
import {
  CreateBatchQuizDto,
  CreateQuizQuestionDto,
  SubmitQuizAnswerDto,
  UpdateBatchQuizDto,
  UpdateQuizQuestionDto,
} from "../dto/batch-quiz.dto";

@Injectable()
export class BatchAssessmentService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly access: BatchAccessService,
    private readonly media: BatchMediaService,
    private readonly notifications: NotificationsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async listQuizzes(batchId: string, viewer: SignedInViewer) {
    const { isStaff } = await this.access.require(batchId, viewer, "READ");

    const conditions = [
      eq(batchQuizzes.batchId, batchId),
      eq(batchQuizzes.isDeleted, false),
    ];
    if (!isStaff) {
      conditions.push(sql`${batchQuizzes.publishedAt} IS NOT NULL`);
    }

    const quizzes = await this.db
      .select()
      .from(batchQuizzes)
      .where(and(...conditions))
      .orderBy(desc(batchQuizzes.createdAt));

    if (isStaff || quizzes.length === 0) return quizzes;

    const userAttempts = await this.db
      .select({
        quizId: batchQuizAttempts.quizId,
        score: batchQuizAttempts.score,
        maxScore: batchQuizAttempts.maxScore,
        submittedAt: batchQuizAttempts.submittedAt,
        status: batchQuizAttempts.status,
      })
      .from(batchQuizAttempts)
      .where(
        and(
          eq(batchQuizAttempts.userId, viewer.userId),
          inArray(
            batchQuizAttempts.quizId,
            quizzes.map((q) => q.quizId),
          ),
        ),
      );

    const best = new Map<
      string,
      {
        score: number | null;
        maxScore: number | null;
        submittedAt: Date | null;
        status: string;
      }
    >();
    for (const a of userAttempts) {
      const prev = best.get(a.quizId);
      const score = a.score ? Number(a.score) : 0;
      if (!prev || score > (prev.score ?? 0)) {
        best.set(a.quizId, {
          score: a.score ? Number(a.score) : null,
          maxScore: a.maxScore ? Number(a.maxScore) : null,
          submittedAt: a.submittedAt,
          status: a.status,
        });
      }
    }

    return quizzes.map((q) => ({
      ...q,
      myBestAttempt: best.get(q.quizId) ?? null,
    }));
  }

  async getQuiz(
    batchId: string,
    quizId: string,
    viewer: Viewer,
    includeAnswers = false,
  ) {
    const { isStaff } = await this.access.require(batchId, viewer, "READ");
    const quiz = await this.requireQuiz(batchId, quizId);
    if (!isStaff && !quiz.publishedAt) {
      throw new NotFoundException("Quiz not found");
    }

    const questions = await this.db
      .select()
      .from(batchQuizQuestions)
      .where(
        and(
          eq(batchQuizQuestions.quizId, quizId),
          eq(batchQuizQuestions.isDeleted, false),
        ),
      )
      .orderBy(asc(batchQuizQuestions.order));

    const safeQuestions =
      isStaff || includeAnswers
        ? questions
        : questions.map((q) => ({
            ...q,
            correctAnswer: null as unknown,
            explanation: null as string | null,
          }));

    return { ...quiz, questions: safeQuestions };
  }

  async createQuiz(
    batchId: string,
    dto: CreateBatchQuizDto,
    createdBy: string,
  ) {
    const batch = await this.access.requireBatch(batchId);
    if (
      dto.opensAt &&
      dto.closesAt &&
      new Date(dto.closesAt) <= new Date(dto.opensAt)
    ) {
      throw new BadRequestException("closesAt must be after opensAt");
    }
    const [created] = await this.db
      .insert(batchQuizzes)
      .values({
        batchId,
        subjectId: dto.subjectId,
        title: dto.title,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        maxAttempts: dto.maxAttempts,
        negativeMarkPercent: dto.negativeMarkPercent.toString(),
        passingPercent: dto.passingPercent.toString(),
        showLeaderboard: dto.showLeaderboard ?? true,
        showSolutions: dto.showSolutions ?? true,
        opensAt: dto.opensAt ? new Date(dto.opensAt) : null,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
        publishedAt: dto.publish ? new Date() : null,
        createdBy,
      })
      .returning();

    if (dto.publish) {
      const enrolledIds = await this.access.enrolledUserIds(batchId);
      await this.notifications.fanout(enrolledIds, {
        type: "BATCH_QUIZ_PUBLISHED",
        title: `New test: ${dto.title}`,
        body: `${dto.durationMinutes} min · max ${dto.maxAttempts} attempt${dto.maxAttempts === 1 ? "" : "s"}`,
        link: `/batches/${batch.slug}/quizzes/${created.quizId}`,
        batchId,
      });
    }
    return created;
  }

  async updateQuiz(batchId: string, quizId: string, dto: UpdateBatchQuizDto) {
    const existing = await this.requireQuiz(batchId, quizId);

    const [updated] = await this.db
      .update(batchQuizzes)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
        ...(dto.durationMinutes !== undefined && {
          durationMinutes: dto.durationMinutes,
        }),
        ...(dto.maxAttempts !== undefined && { maxAttempts: dto.maxAttempts }),
        ...(dto.negativeMarkPercent !== undefined && {
          negativeMarkPercent: dto.negativeMarkPercent.toString(),
        }),
        ...(dto.passingPercent !== undefined && {
          passingPercent: dto.passingPercent.toString(),
        }),
        ...(dto.showLeaderboard !== undefined && {
          showLeaderboard: dto.showLeaderboard,
        }),
        ...(dto.showSolutions !== undefined && {
          showSolutions: dto.showSolutions,
        }),
        ...(dto.opensAt !== undefined && {
          opensAt: dto.opensAt ? new Date(dto.opensAt) : null,
        }),
        ...(dto.closesAt !== undefined && {
          closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
        }),
        ...(dto.publish === true &&
          !existing.publishedAt && { publishedAt: new Date() }),
        ...(dto.publish === false && { publishedAt: null }),
        updatedAt: new Date(),
      })
      .where(eq(batchQuizzes.quizId, quizId))
      .returning();
    return updated;
  }

  async deleteQuiz(batchId: string, quizId: string) {
    await this.requireQuiz(batchId, quizId);
    await this.db
      .update(batchQuizzes)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batchQuizzes.quizId, quizId));
    return { success: true };
  }

  async createQuestion(
    batchId: string,
    quizId: string,
    dto: CreateQuizQuestionDto,
  ) {
    await this.requireQuiz(batchId, quizId);
    this.validateQuestionShape(dto);
    const [created] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .insert(batchQuizQuestions)
        .values({
          quizId,
          order: dto.order,
          type: dto.type,
          prompt: dto.prompt,
          options: dto.options ?? [],
          correctAnswer: dto.correctAnswer,
          marks: dto.marks.toString(),
          explanation: dto.explanation,
        })
        .returning();
      await this.bumpVersion(tx, quizId);
      return rows;
    });
    return created;
  }

  async updateQuestion(
    batchId: string,
    quizId: string,
    questionId: string,
    dto: UpdateQuizQuestionDto,
  ) {
    await this.requireQuiz(batchId, quizId);
    const [existing] = await this.db
      .select()
      .from(batchQuizQuestions)
      .where(
        and(
          eq(batchQuizQuestions.questionId, questionId),
          eq(batchQuizQuestions.quizId, quizId),
          eq(batchQuizQuestions.isDeleted, false),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundException("Question not found");

    if (dto.type || dto.correctAnswer !== undefined) {
      this.validateQuestionShape({
        type: dto.type ?? existing.type,
        options: dto.options ?? existing.options,
        correctAnswer:
          dto.correctAnswer !== undefined
            ? dto.correctAnswer
            : existing.correctAnswer,
      });
    }

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(batchQuizQuestions)
        .set({
          ...(dto.order !== undefined && { order: dto.order }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.prompt !== undefined && { prompt: dto.prompt }),
          ...(dto.options !== undefined && { options: dto.options }),
          ...(dto.correctAnswer !== undefined && {
            correctAnswer: dto.correctAnswer,
          }),
          ...(dto.marks !== undefined && { marks: dto.marks.toString() }),
          ...(dto.explanation !== undefined && {
            explanation: dto.explanation,
          }),
          updatedAt: new Date(),
        })
        .where(eq(batchQuizQuestions.questionId, questionId))
        .returning();
      await this.bumpVersion(tx, quizId);
      return rows;
    });
    return updated;
  }

  async deleteQuestion(batchId: string, quizId: string, questionId: string) {
    await this.requireQuiz(batchId, quizId);
    await this.db.transaction(async (tx) => {
      await tx
        .update(batchQuizQuestions)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(
          and(
            eq(batchQuizQuestions.questionId, questionId),
            eq(batchQuizQuestions.quizId, quizId),
          ),
        );
      await this.bumpVersion(tx, quizId);
    });
    return { success: true };
  }

  async startAttempt(batchId: string, quizId: string, viewer: SignedInViewer) {
    await this.access.require(batchId, viewer, "READ");
    const userId = viewer.userId;
    const quiz = await this.requireQuiz(batchId, quizId);

    if (!quiz.publishedAt) throw new BadRequestException("Quiz not published");
    const now = this.clock.epochMillis();
    if (quiz.opensAt && quiz.opensAt.getTime() > now) {
      throw new BadRequestException("Quiz hasn't opened yet");
    }
    if (quiz.closesAt && quiz.closesAt.getTime() < now) {
      throw new BadRequestException("Quiz has closed");
    }

    const [inProgress] = await this.db
      .select()
      .from(batchQuizAttempts)
      .where(
        and(
          eq(batchQuizAttempts.quizId, quizId),
          eq(batchQuizAttempts.userId, userId),
          eq(batchQuizAttempts.status, "IN_PROGRESS"),
        ),
      )
      .limit(1);
    if (inProgress) return inProgress;

    const [{ used }] = await this.db
      .select({ used: sql<number>`count(*)::int` })
      .from(batchQuizAttempts)
      .where(
        and(
          eq(batchQuizAttempts.quizId, quizId),
          eq(batchQuizAttempts.userId, userId),
          inArray(batchQuizAttempts.status, ["SUBMITTED", "EXPIRED"]),
        ),
      );
    if (used >= quiz.maxAttempts) {
      throw new BadRequestException("Maximum attempts reached");
    }

    const [created] = await this.db
      .insert(batchQuizAttempts)
      .values({
        quizId,
        userId,
        quizVersion: quiz.version,
        attemptNo: used + 1,
        status: "IN_PROGRESS",
        expiresAt: new Date(
          this.clock.epochMillis() + quiz.durationMinutes * 60_000,
        ),
        answers: {},
      })
      .returning();
    return created;
  }

  async submitAttempt(
    batchId: string,
    quizId: string,
    attemptId: string,
    dto: SubmitQuizAnswerDto,
    viewer: SignedInViewer,
  ) {
    await this.access.require(batchId, viewer, "READ");
    const userId = viewer.userId;

    const [attempt] = await this.db
      .select()
      .from(batchQuizAttempts)
      .where(
        and(
          eq(batchQuizAttempts.attemptId, attemptId),
          eq(batchQuizAttempts.quizId, quizId),
          eq(batchQuizAttempts.userId, userId),
        ),
      )
      .limit(1);
    if (!attempt) throw new NotFoundException("Attempt not found");
    if (attempt.status !== "IN_PROGRESS") {
      throw new BadRequestException("Attempt already finalized");
    }

    const quiz = await this.requireQuiz(batchId, quizId);
    const questions = await this.db
      .select()
      .from(batchQuizQuestions)
      .where(
        and(
          eq(batchQuizQuestions.quizId, quizId),
          eq(batchQuizQuestions.isDeleted, false),
        ),
      );

    const marked = this.mark(
      questions,
      dto.answers,
      Number(quiz.negativeMarkPercent) / 100,
    );
    const expired = attempt.expiresAt.getTime() < this.clock.epochMillis();

    const [updated] = await this.db
      .update(batchQuizAttempts)
      .set({
        status: expired ? "EXPIRED" : "SUBMITTED",
        submittedAt: new Date(),
        score: marked.earned.toString(),
        maxScore: marked.total.toString(),
        correctCount: marked.correctCount,
        wrongCount: marked.wrongCount,
        skippedCount: marked.skippedCount,
        answers: dto.answers,
        updatedAt: new Date(),
      })
      .where(eq(batchQuizAttempts.attemptId, attemptId))
      .returning();

    return updated;
  }

  async getAttempt(
    batchId: string,
    quizId: string,
    attemptId: string,
    viewer: Viewer,
  ) {
    const [attempt] = await this.db
      .select()
      .from(batchQuizAttempts)
      .where(
        and(
          eq(batchQuizAttempts.attemptId, attemptId),
          eq(batchQuizAttempts.quizId, quizId),
        ),
      )
      .limit(1);
    if (!attempt) throw new NotFoundException("Attempt not found");

    if (attempt.userId === viewer.userId) {
      await this.access.require(batchId, viewer, "READ");
      return attempt;
    }
    await this.access.require(batchId, viewer, "MANAGE");
    return attempt;
  }

  async listMyAttempts(batchId: string, quizId: string, viewer: SignedInViewer) {
    await this.access.require(batchId, viewer, "READ");
    return this.db
      .select()
      .from(batchQuizAttempts)
      .where(
        and(
          eq(batchQuizAttempts.quizId, quizId),
          eq(batchQuizAttempts.userId, viewer.userId),
        ),
      )
      .orderBy(desc(batchQuizAttempts.startedAt));
  }

  async leaderboard(batchId: string, quizId: string, viewer: Viewer) {
    await this.access.require(batchId, viewer, "READ");
    const quiz = await this.requireQuiz(batchId, quizId);
    if (!quiz.showLeaderboard) {
      throw new ForbiddenException("Leaderboard disabled for this quiz");
    }

    const rows = await this.db
      .select({
        attempt: batchQuizAttempts,
        user: {
          userId: users.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImage: users.profileImage,
        },
      })
      .from(batchQuizAttempts)
      .innerJoin(users, eq(batchQuizAttempts.userId, users.userId))
      .where(
        and(
          eq(batchQuizAttempts.quizId, quizId),
          eq(batchQuizAttempts.status, "SUBMITTED"),
        ),
      )
      .orderBy(desc(batchQuizAttempts.score), asc(batchQuizAttempts.submittedAt))
      .limit(50);

    const seen = new Set<string>();
    const leaderboard = [];
    let rank = 0;
    for (const r of rows) {
      if (seen.has(r.user.userId)) continue;
      seen.add(r.user.userId);
      rank++;
      leaderboard.push({
        userId: r.user.userId,
        name:
          [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") ||
          "Student",
        profileImage: this.media.url(r.user.profileImage),
        score: r.attempt.score ? Number(r.attempt.score) : null,
        maxScore: r.attempt.maxScore ? Number(r.attempt.maxScore) : null,
        submittedAt: r.attempt.submittedAt,
        rank,
      });
    }
    return leaderboard;
  }

  private mark(
    questions: (typeof batchQuizQuestions.$inferSelect)[],
    answers: Record<string, unknown>,
    negativeFraction: number,
  ) {
    let total = 0;
    let earned = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    for (const q of questions) {
      const marks = Number(q.marks);
      total += marks;
      const given = answers[q.questionId];

      if (given === undefined || given === null || given === "") {
        skippedCount++;
        continue;
      }

      if (this.isCorrect(q, given)) {
        earned += marks;
        correctCount++;
      } else {
        earned -= marks * negativeFraction;
        wrongCount++;
      }
    }

    return {
      total,
      earned: Math.max(0, Number(earned.toFixed(2))),
      correctCount,
      wrongCount,
      skippedCount,
    };
  }

  private isCorrect(
    question: typeof batchQuizQuestions.$inferSelect,
    given: unknown,
  ): boolean {
    if (question.type === "MCQ_SINGLE") {
      return given === question.correctAnswer;
    }
    if (question.type === "MCQ_MULTI") {
      if (!Array.isArray(given) || !Array.isArray(question.correctAnswer)) {
        return false;
      }
      const givenSet = new Set(given);
      const correctSet = new Set(question.correctAnswer as string[]);
      return (
        givenSet.size === correctSet.size &&
        [...givenSet].every((v) => correctSet.has(v as string))
      );
    }
    const expected = question.correctAnswer as {
      value: number;
      tolerance?: number;
    };
    const numeric = Number(given);
    if (Number.isNaN(numeric)) return false;
    return Math.abs(numeric - expected.value) <= (expected.tolerance ?? 0);
  }

  private async bumpVersion(tx: Queryable, quizId: string): Promise<void> {
    await tx
      .update(batchQuizzes)
      .set({ version: sql`${batchQuizzes.version} + 1`, updatedAt: new Date() })
      .where(eq(batchQuizzes.quizId, quizId));
  }

  private validateQuestionShape(q: {
    type: "MCQ_SINGLE" | "MCQ_MULTI" | "NUMERICAL";
    options?: Array<{ id: string; text: string }> | null;
    correctAnswer: QuizCorrectAnswer;
  }) {
    if (q.type === "MCQ_SINGLE" || q.type === "MCQ_MULTI") {
      if (!q.options || q.options.length < 2) {
        throw new BadRequestException("MCQ questions need at least 2 options");
      }
      const ids = new Set(q.options.map((o) => o.id));
      if (q.type === "MCQ_SINGLE") {
        if (typeof q.correctAnswer !== "string" || !ids.has(q.correctAnswer)) {
          throw new BadRequestException(
            "MCQ_SINGLE correctAnswer must be an option id",
          );
        }
      } else if (
        !Array.isArray(q.correctAnswer) ||
        q.correctAnswer.length === 0 ||
        !q.correctAnswer.every((a) => typeof a === "string" && ids.has(a))
      ) {
        throw new BadRequestException(
          "MCQ_MULTI correctAnswer must be a non-empty array of option ids",
        );
      }
      return;
    }

    const ca = q.correctAnswer;
    if (
      typeof ca !== "object" ||
      ca === null ||
      Array.isArray(ca) ||
      typeof ca.value !== "number" ||
      (ca.tolerance !== undefined && typeof ca.tolerance !== "number")
    ) {
      throw new BadRequestException(
        "NUMERICAL correctAnswer must be { value: number, tolerance?: number }",
      );
    }
  }

  private async requireQuiz(batchId: string, quizId: string) {
    const [quiz] = await this.db
      .select()
      .from(batchQuizzes)
      .where(
        and(
          eq(batchQuizzes.quizId, quizId),
          eq(batchQuizzes.batchId, batchId),
          eq(batchQuizzes.isDeleted, false),
        ),
      )
      .limit(1);
    if (!quiz) throw new NotFoundException("Quiz not found");
    return quiz;
  }
}
