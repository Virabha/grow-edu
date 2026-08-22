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

import { CLOCK, Clock } from "../../common/clock";
import { isUniqueViolation } from "../../common/unique-violation";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  ContentBlock,
  QuestionOption,
  assessmentAttemptAnswers,
  assessmentAttempts,
  assessmentQuestionGroups,
  assessmentQuestionVersions,
  assessmentQuestions,
  assessmentTestQuestions,
  assessmentTests,
  batchEnrollments,
  batchInstructors,
  users,
} from "../../database/schema";
import { Queryable } from "../../database/transaction";
import {
  ErrorNotebookService,
  NotebookDraft,
} from "../notebook/error-notebook.service";
import {
  clampToFloor,
  isBlank,
  scoreAnswer,
  toleranceFrom,
} from "./scoring";

type AttemptRow = typeof assessmentAttempts.$inferSelect;
type AnswerRow = typeof assessmentAttemptAnswers.$inferSelect;
type PlacementRow = typeof assessmentTestQuestions.$inferSelect;
type TestRow = typeof assessmentTests.$inferSelect;

export interface AttemptQuestionView {
  placementId: string;
  questionId: string;
  questionVersion: number;
  type: string;
  order: number;
  sectionName: string | null;
  groupId: string | null;
  groupStimulus: ContentBlock[] | null;
  marks: number;
  prompt: ContentBlock[];
  options: { id: string; content: ContentBlock[] }[];
  response: unknown;
  elapsedSeconds: number;
  isSkipped: boolean;
  isHumanGraded: boolean;
  awardedMarks: number | null;
  outcome: string | null;
  status: string;
}

export interface AttemptView {
  attemptId: string;
  testId: string;
  userId: string;
  attemptNo: number;
  status: string;
  startedAt: Date;
  expiresAt: Date;
  submittedAt: Date | null;
  maxScore: number;
  autoScoredMaxMarks: number;
  pendingMarks: number;
  provisionalScore: number | null;
  finalScore: number | null;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  questions: AttemptQuestionView[];
}

const HUMAN_GRADED = ["WRITTEN", "IMAGE_UPLOAD"];

@Injectable()
export class AttemptService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly notebook: ErrorNotebookService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async start(testId: string, userId: string): Promise<AttemptView> {
    const test = await this.requireOpenTest(testId);
    await this.requireBatchAccess(test, userId);
    const placements = await this.placementsOf(testId);

    if (placements.length === 0) {
      throw new ConflictException("That test has no questions yet");
    }

    const now = this.clock.now();

    const [{ used }] = await this.db
      .select({ used: sql<number>`count(*)::int` })
      .from(assessmentAttempts)
      .where(
        and(
          eq(assessmentAttempts.testId, testId),
          eq(assessmentAttempts.userId, userId),
        ),
      );

    if (used >= test.maxAttempts) {
      throw new ConflictException("No attempts remaining on this test");
    }

    const questions = await this.questionsFor(
      placements.map((placement) => placement.questionId),
    );

    const maxScore = placements.reduce(
      (sum, placement) => sum + Number(placement.marks),
      0,
    );

    let attemptId: string;
    try {
      attemptId = await this.db.transaction(async (tx) => {
        const [attempt] = await tx
          .insert(assessmentAttempts)
          .values({
            testId,
            userId,
            attemptNo: used + 1,
            status: "IN_PROGRESS",
            startedAt: now,
            expiresAt: new Date(now.getTime() + test.durationMinutes * 60_000),
            maxScore: maxScore.toFixed(2),
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        await tx.insert(assessmentAttemptAnswers).values(
          placements.map((placement) => ({
            attemptId: attempt.attemptId,
            placementId: placement.placementId,
            questionId: placement.questionId,
            questionVersion:
              questions.get(placement.questionId)?.currentVersion ?? 1,
            response: null,
            elapsedSeconds: 0,
            isSkipped: true,
            status: HUMAN_GRADED.includes(
              questions.get(placement.questionId)?.type ?? "",
            )
              ? ("PENDING_GRADING" as const)
              : ("AUTO_SCORED" as const),
            createdAt: now,
            updatedAt: now,
          })),
        );

        return attempt.attemptId;
      });
    } catch (err) {
      if (isUniqueViolation(err, "assessment_attempts_unique")) {
        throw new ConflictException("No attempts remaining on this test");
      }
      throw err;
    }

    return this.view(attemptId, userId);
  }

  async get(attemptId: string, userId: string): Promise<AttemptView> {
    await this.requireOwn(attemptId, userId);
    return this.view(attemptId, userId);
  }

  async saveAnswer(
    attemptId: string,
    placementId: string,
    response: unknown,
    userId: string,
  ): Promise<AttemptView> {
    const attempt = await this.requireLive(attemptId, userId);
    const now = this.clock.now();

    await this.assertResponseShape(attemptId, placementId, response);

    await this.db.transaction(async (tx) => {
      await this.attributeElapsed(tx, attempt, placementId, now);

      const [updated] = await tx
        .update(assessmentAttemptAnswers)
        .set({
          response: response ?? null,
          isSkipped: isBlank(response),
          updatedAt: now,
        })
        .where(
          and(
            eq(assessmentAttemptAnswers.attemptId, attemptId),
            eq(assessmentAttemptAnswers.placementId, placementId),
          ),
        )
        .returning();

      if (!updated) throw new NotFoundException("That question is not on this attempt");
    });

    return this.view(attemptId, userId);
  }

  async focus(
    attemptId: string,
    placementId: string,
    userId: string,
  ): Promise<{ placementId: string; elapsedSeconds: number }> {
    const attempt = await this.requireLive(attemptId, userId);
    const now = this.clock.now();

    const elapsed = await this.db.transaction(async (tx) => {
      const seconds = await this.attributeElapsed(
        tx,
        attempt,
        placementId,
        now,
      );
      return seconds;
    });

    return { placementId, elapsedSeconds: elapsed };
  }

  async submit(attemptId: string, userId: string): Promise<AttemptView> {
    const attempt = await this.requireOwn(attemptId, userId);
    if (attempt.status !== "IN_PROGRESS") {
      throw new ConflictException("That attempt has already been submitted");
    }

    const now = this.clock.now();
    const test = await this.requireTest(attempt.testId);
    const placements = await this.placementsOf(attempt.testId);
    const byPlacement = new Map(placements.map((p) => [p.placementId, p]));

    const answers = await this.db
      .select()
      .from(assessmentAttemptAnswers)
      .where(eq(assessmentAttemptAnswers.attemptId, attemptId));

    const versions = await this.versionsFor(answers);
    const questions = await this.questionsFor(
      answers.map((answer) => answer.questionId),
    );

    let earned = 0;
    let pending = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    const updates: {
      answerId: string;
      isCorrect: boolean | null;
      awardedMarks: string | null;
      status: "AUTO_SCORED" | "PENDING_GRADING";
    }[] = [];
    const drafts: NotebookDraft[] = [];

    for (const answer of answers) {
      const placement = byPlacement.get(answer.placementId);
      const question = questions.get(answer.questionId);
      const version = versions.get(
        `${answer.questionId}:${answer.questionVersion}`,
      );
      if (!placement || !question || !version) continue;

      const marks = Number(placement.marks);

      if (HUMAN_GRADED.includes(question.type)) {
        pending += marks;
        updates.push({
          answerId: answer.answerId,
          isCorrect: null,
          awardedMarks: null,
          status: "PENDING_GRADING",
        });
        if (answer.isSkipped) skippedCount += 1;
        continue;
      }

      const negative =
        placement.negativeMarkPercent === null
          ? Number(test.negativeMarkPercent)
          : Number(placement.negativeMarkPercent);

      const scored = scoreAnswer(
        {
          options: version.options,
          answerKey: version.answerKey ?? null,
          partialCreditRule: version.partialCreditRule,
          tolerance: toleranceFrom(version.toleranceKind, version.tolerance),
        },
        { marks, negativeMarkPercent: negative },
        answer.response,
      );

      earned += scored.awarded;
      if (scored.outcome === "CORRECT") correctCount += 1;
      else if (scored.outcome === "WRONG") wrongCount += 1;
      else if (scored.outcome === "SKIPPED") skippedCount += 1;

      if (scored.outcome === "WRONG" || scored.outcome === "PARTIAL") {
        drafts.push({
          userId,
          questionId: answer.questionId,
          questionVersion: answer.questionVersion,
          attemptId,
          answerId: answer.answerId,
          topicId: question.topicId,
          givenAnswer: answer.response,
          correctAnswer: version.answerKey ?? null,
          explanation: version.explanation,
        });
      }

      updates.push({
        answerId: answer.answerId,
        isCorrect: scored.outcome === "CORRECT",
        awardedMarks: scored.awarded.toFixed(2),
        status: "AUTO_SCORED",
      });
    }

    const provisional = clampToFloor(earned, Number(test.scoreFloor));
    const awaiting = pending > 0;

    await this.db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(assessmentAttemptAnswers)
          .set({
            isCorrect: update.isCorrect,
            awardedMarks: update.awardedMarks,
            status: update.status,
            updatedAt: now,
          })
          .where(eq(assessmentAttemptAnswers.answerId, update.answerId));
      }

      await tx
        .update(assessmentAttempts)
        .set({
          status: awaiting ? "AWAITING_GRADING" : "GRADED",
          submittedAt: now,
          gradedAt: awaiting ? null : now,
          provisionalScore: provisional.toFixed(2),
          finalScore: awaiting ? null : provisional.toFixed(2),
          pendingMarks: pending.toFixed(2),
          correctCount,
          wrongCount,
          skippedCount,
          updatedAt: now,
        })
        .where(eq(assessmentAttempts.attemptId, attemptId));

      await this.notebook.collect(drafts, tx);
    });

    return this.view(attemptId, userId);
  }

  private async assertResponseShape(
    attemptId: string,
    placementId: string,
    response: unknown,
  ): Promise<void> {
    if (isBlank(response)) return;

    const [answer] = await this.db
      .select()
      .from(assessmentAttemptAnswers)
      .where(
        and(
          eq(assessmentAttemptAnswers.attemptId, attemptId),
          eq(assessmentAttemptAnswers.placementId, placementId),
        ),
      )
      .limit(1);

    if (!answer) {
      throw new NotFoundException("That question is not on this attempt");
    }

    const questions = await this.questionsFor([answer.questionId]);
    const question = questions.get(answer.questionId);
    if (!question) return;

    const versions = await this.versionsFor([answer]);
    const version = versions.get(
      `${answer.questionId}:${answer.questionVersion}`,
    );
    const optionIds = new Set((version?.options ?? []).map((o) => o.id));

    if (question.type === "SINGLE_CORRECT") {
      if (typeof response !== "string" || !optionIds.has(response)) {
        throw new BadRequestException(
          "A single-correct answer must be one option id",
        );
      }
      return;
    }

    if (question.type === "MULTIPLE_CORRECT") {
      if (
        !Array.isArray(response) ||
        !response.every(
          (entry) => typeof entry === "string" && optionIds.has(entry),
        )
      ) {
        throw new BadRequestException(
          "A multiple-correct answer must be a list of option ids",
        );
      }
      return;
    }

    if (question.type === "NUMERIC") {
      const numeric =
        typeof response === "number" ? response : Number(response);
      if (typeof response === "boolean" || !Number.isFinite(numeric)) {
        throw new BadRequestException("A numeric answer must be a number");
      }
      return;
    }

    if (question.type === "WRITTEN") {
      if (typeof response !== "string") {
        throw new BadRequestException("A written answer must be text");
      }
      return;
    }

    if (
      !Array.isArray(response) ||
      !response.every((entry) => typeof entry === "string")
    ) {
      throw new BadRequestException(
        "An image answer must be a list of uploaded file ids",
      );
    }
  }

  private async stimulusFor(
    groupIds: (string | null)[],
  ): Promise<Map<string, ContentBlock[]>> {
    const ids = [...new Set(groupIds.filter((id): id is string => id !== null))];
    if (ids.length === 0) return new Map();

    const rows = await this.db
      .select()
      .from(assessmentQuestionGroups)
      .where(inArray(assessmentQuestionGroups.groupId, ids));

    return new Map(rows.map((row) => [row.groupId, row.stimulus]));
  }

  private async attributeElapsed(
    tx: Queryable,
    attempt: AttemptRow,
    placementId: string,
    now: Date,
  ): Promise<number> {
    const since = Math.max(
      0,
      Math.floor((now.getTime() - attempt.updatedAt.getTime()) / 1000),
    );

    const [row] = await tx
      .update(assessmentAttemptAnswers)
      .set({
        elapsedSeconds: sql`${assessmentAttemptAnswers.elapsedSeconds} + ${since}`,
        updatedAt: now,
      })
      .where(
        and(
          eq(assessmentAttemptAnswers.attemptId, attempt.attemptId),
          eq(assessmentAttemptAnswers.placementId, placementId),
        ),
      )
      .returning();

    if (!row) {
      throw new NotFoundException("That question is not on this attempt");
    }

    await tx
      .update(assessmentAttempts)
      .set({ updatedAt: now })
      .where(eq(assessmentAttempts.attemptId, attempt.attemptId));

    return row.elapsedSeconds;
  }

  private async requireTest(testId: string): Promise<TestRow> {
    const [test] = await this.db
      .select()
      .from(assessmentTests)
      .where(
        and(
          eq(assessmentTests.testId, testId),
          eq(assessmentTests.isDeleted, false),
        ),
      )
      .limit(1);
    if (!test) throw new NotFoundException("Test not found");
    return test;
  }

  private async requireOpenTest(testId: string): Promise<TestRow> {
    const test = await this.requireTest(testId);
    const now = this.clock.now();

    if (!test.publishedAt) {
      throw new ConflictException("That test is not published");
    }
    if (test.opensAt && test.opensAt.getTime() > now.getTime()) {
      throw new ConflictException("That test has not opened yet");
    }
    if (test.closesAt && test.closesAt.getTime() <= now.getTime()) {
      throw new ConflictException("That test has closed");
    }
    return test;
  }

  private async requireBatchAccess(
    test: TestRow,
    userId: string,
  ): Promise<void> {
    if (test.batchId === null) return;

    const [enrolled] = await this.db
      .select({ enrollmentId: batchEnrollments.enrollmentId })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, test.batchId),
          eq(batchEnrollments.userId, userId),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      )
      .limit(1);
    if (enrolled) return;

    const [teaches] = await this.db
      .select({ batchInstructorId: batchInstructors.batchInstructorId })
      .from(batchInstructors)
      .where(
        and(
          eq(batchInstructors.batchId, test.batchId),
          eq(batchInstructors.instructorId, userId),
        ),
      )
      .limit(1);
    if (teaches) return;

    const [actor] = await this.db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);
    if (actor?.role === "PLATFORM_ADMIN") return;

    throw new NotFoundException("No such test");
  }

  private async placementsOf(testId: string): Promise<PlacementRow[]> {
    return this.db
      .select()
      .from(assessmentTestQuestions)
      .where(eq(assessmentTestQuestions.testId, testId))
      .orderBy(asc(assessmentTestQuestions.order));
  }

  private async questionsFor(questionIds: string[]) {
    if (questionIds.length === 0) {
      return new Map<string, typeof assessmentQuestions.$inferSelect>();
    }
    const rows = await this.db
      .select()
      .from(assessmentQuestions)
      .where(inArray(assessmentQuestions.questionId, questionIds));
    return new Map(rows.map((row) => [row.questionId, row]));
  }

  private async versionsFor(answers: AnswerRow[]) {
    const questionIds = [...new Set(answers.map((a) => a.questionId))];
    if (questionIds.length === 0) {
      return new Map<string, typeof assessmentQuestionVersions.$inferSelect>();
    }
    const rows = await this.db
      .select()
      .from(assessmentQuestionVersions)
      .where(inArray(assessmentQuestionVersions.questionId, questionIds));
    return new Map(rows.map((row) => [`${row.questionId}:${row.version}`, row]));
  }

  private async requireOwn(
    attemptId: string,
    userId: string,
  ): Promise<AttemptRow> {
    const [attempt] = await this.db
      .select()
      .from(assessmentAttempts)
      .where(eq(assessmentAttempts.attemptId, attemptId))
      .limit(1);

    if (!attempt) throw new NotFoundException("Attempt not found");
    if (attempt.userId !== userId) {
      throw new ForbiddenException("That attempt belongs to someone else");
    }
    return attempt;
  }

  private async requireLive(
    attemptId: string,
    userId: string,
  ): Promise<AttemptRow> {
    const attempt = await this.requireOwn(attemptId, userId);
    if (attempt.status !== "IN_PROGRESS") {
      throw new ConflictException("That attempt has already been submitted");
    }
    if (attempt.expiresAt.getTime() <= this.clock.now().getTime()) {
      throw new ConflictException("That attempt has expired");
    }
    return attempt;
  }

  private async view(attemptId: string, userId: string): Promise<AttemptView> {
    const attempt = await this.requireOwn(attemptId, userId);
    const placements = await this.placementsOf(attempt.testId);
    const byPlacement = new Map(placements.map((p) => [p.placementId, p]));

    const answers = await this.db
      .select()
      .from(assessmentAttemptAnswers)
      .where(eq(assessmentAttemptAnswers.attemptId, attemptId));

    const questions = await this.questionsFor(
      answers.map((answer) => answer.questionId),
    );
    const versions = await this.versionsFor(answers);

    const stimulus = await this.stimulusFor(
      [...questions.values()].map((question) => question.groupId),
    );

    const submitted = attempt.status !== "IN_PROGRESS";
    let autoScoredMaxMarks = 0;
    let pendingMarks = 0;

    const views: AttemptQuestionView[] = [];

    for (const answer of answers) {
      const placement = byPlacement.get(answer.placementId);
      const question = questions.get(answer.questionId);
      const version = versions.get(
        `${answer.questionId}:${answer.questionVersion}`,
      );
      if (!placement || !question || !version) continue;

      const marks = Number(placement.marks);
      const humanGraded = HUMAN_GRADED.includes(question.type);
      if (humanGraded) pendingMarks += marks;
      else autoScoredMaxMarks += marks;

      views.push({
        placementId: placement.placementId,
        questionId: answer.questionId,
        questionVersion: answer.questionVersion,
        type: question.type,
        order: placement.order,
        sectionName: placement.sectionName,
        groupId: question.groupId,
        groupStimulus: question.groupId
          ? (stimulus.get(question.groupId) ?? null)
          : null,
        marks,
        prompt: version.prompt,
        options: this.publicOptions(version.options),
        response: answer.response,
        elapsedSeconds: answer.elapsedSeconds,
        isSkipped: answer.isSkipped,
        isHumanGraded: humanGraded,
        awardedMarks:
          submitted && answer.awardedMarks !== null
            ? Number(answer.awardedMarks)
            : null,
        outcome: submitted ? this.outcomeOf(answer, marks) : null,
        status: answer.status,
      });
    }

    views.sort((left, right) => left.order - right.order);

    return {
      attemptId: attempt.attemptId,
      testId: attempt.testId,
      userId: attempt.userId,
      attemptNo: attempt.attemptNo,
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt,
      maxScore: attempt.maxScore === null ? 0 : Number(attempt.maxScore),
      autoScoredMaxMarks: Number(autoScoredMaxMarks.toFixed(2)),
      pendingMarks: Number(pendingMarks.toFixed(2)),
      provisionalScore:
        attempt.provisionalScore === null
          ? null
          : Number(attempt.provisionalScore),
      finalScore:
        attempt.finalScore === null ? null : Number(attempt.finalScore),
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      skippedCount: attempt.skippedCount,
      questions: views,
    };
  }

  private outcomeOf(answer: AnswerRow, marks: number): string {
    if (answer.status === "PENDING_GRADING") return "PENDING";
    if (answer.isSkipped) return "SKIPPED";
    if (answer.isCorrect) return "CORRECT";
    const awarded = answer.awardedMarks === null ? 0 : Number(answer.awardedMarks);
    if (awarded > 0 && awarded < marks) return "PARTIAL";
    return "WRONG";
  }

  private publicOptions(
    options: QuestionOption[],
  ): { id: string; content: ContentBlock[] }[] {
    return options.map((option) => ({
      id: option.id,
      content: option.content,
    }));
  }
}
