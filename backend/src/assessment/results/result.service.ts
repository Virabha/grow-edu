import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  ContentBlock,
  QuestionAnswerKey,
  assessmentAttemptAnswers,
  assessmentAttempts,
  assessmentQuestions,
  assessmentTaxonomyNodes,
  assessmentTestQuestions,
  assessmentTests,
  assessmentQuestionVersions,
} from "../../database/schema";
import { CohortStatsService } from "./cohort-stats.service";

type AttemptRow = typeof assessmentAttempts.$inferSelect;
type AnswerRow = typeof assessmentAttemptAnswers.$inferSelect;

export interface ResultQuestionView {
  placementId: string;
  questionId: string;
  questionVersion: number;
  type: string;
  order: number;
  sectionName: string | null;
  marks: number;
  awardedMarks: number | null;
  outcome: string | null;
  response: unknown;
  correctAnswer: QuestionAnswerKey | null;
  explanation: ContentBlock[] | null;
  elapsedSeconds: number;
  cohortMeanSeconds: number | null;
}

export interface SectionBreakdown {
  sectionName: string | null;
  earned: number;
  available: number;
  pending: number;
}

export interface TopicBreakdown {
  topicId: string;
  topicName: string;
  earned: number;
  available: number;
  pending: number;
}

export interface ResultView {
  attemptId: string;
  testId: string;
  status: string;
  provisionalScore: number | null;
  finalScore: number | null;
  maxScore: number;
  questions: ResultQuestionView[];
  sections: SectionBreakdown[];
  topics: TopicBreakdown[];
}

export interface TopicDelta {
  topicId: string;
  topicName: string;
  myEarned: number;
  topEarned: number;
  delta: number;
}

export interface QuestionDelta {
  placementId: string;
  questionId: string;
  myAwardedMarks: number | null;
  topAwardedMarks: number | null;
  topResponse: unknown;
  delta: number | null;
}

export interface TopperComparisonView {
  available: boolean;
  myScore: number | null;
  topScore: number | null;
  topics: TopicDelta[];
  questions: QuestionDelta[];
}

@Injectable()
export class ResultService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly cohortStats: CohortStatsService,
  ) {}

  async getResult(attemptId: string, userId: string): Promise<ResultView> {
    const attempt = await this.requireSubmitted(attemptId, userId);
    const test = await this.requireTest(attempt.testId);
    const placements = await this.placementsOf(attempt.testId);
    const byPlacementId = new Map(placements.map((p) => [p.placementId, p]));

    const answers = await this.answersFor(attemptId);
    const versions = await this.versionsFor(answers);
    const questions = await this.questionsFor(
      answers.map((a) => a.questionId),
    );

    const nodes = await this.db.select().from(assessmentTaxonomyNodes);
    const parentOf = new Map<string, string | null>();
    const nameOf = new Map<string, string>();
    for (const node of nodes) {
      parentOf.set(node.nodeId, node.parentId);
      nameOf.set(node.nodeId, node.name);
    }

    const cohortFigures = await this.cohortStats.getStats(attempt.testId);

    const questionViews: ResultQuestionView[] = [];

    for (const answer of answers) {
      const placement = byPlacementId.get(answer.placementId);
      const question = questions.get(answer.questionId);
      const version = versions.get(
        `${answer.questionId}:${answer.questionVersion}`,
      );
      if (!placement || !question || !version) continue;

      const marks = Number(placement.marks);
      const isGraded = answer.status !== "PENDING_GRADING";
      const showAnswer = test.showSolutions && isGraded;

      const cohortStat = cohortFigures.perQuestion[answer.placementId];

      questionViews.push({
        placementId: answer.placementId,
        questionId: answer.questionId,
        questionVersion: answer.questionVersion,
        type: question.type,
        order: placement.order,
        sectionName: placement.sectionName,
        marks,
        awardedMarks:
          answer.awardedMarks !== null ? Number(answer.awardedMarks) : null,
        outcome: this.outcomeOf(answer, marks),
        response: answer.response,
        correctAnswer: showAnswer ? (version.answerKey ?? null) : null,
        explanation: showAnswer ? version.explanation : null,
        elapsedSeconds: answer.elapsedSeconds,
        cohortMeanSeconds: cohortStat ? cohortStat.meanSeconds : null,
      });
    }

    questionViews.sort((a, b) => a.order - b.order);

    const sections = this.buildSectionBreakdown(questionViews);
    const topics = this.buildTopicBreakdown(
      questionViews,
      answers,
      questions,
      parentOf,
      nameOf,
    );

    return {
      attemptId: attempt.attemptId,
      testId: attempt.testId,
      status: attempt.status,
      provisionalScore:
        attempt.provisionalScore !== null
          ? Number(attempt.provisionalScore)
          : null,
      finalScore:
        attempt.finalScore !== null ? Number(attempt.finalScore) : null,
      maxScore: attempt.maxScore !== null ? Number(attempt.maxScore) : 0,
      questions: questionViews,
      sections,
      topics,
    };
  }

  async getTopperComparison(
    attemptId: string,
    userId: string,
  ): Promise<TopperComparisonView> {
    const attempt = await this.requireSubmitted(attemptId, userId);
    const test = await this.requireTest(attempt.testId);

    if (test.closesAt && this.clock.now() < test.closesAt) {
      throw new ConflictException(
        "Comparison is not available until the test closes",
      );
    }

    const cohortFigures = await this.cohortStats.getStats(attempt.testId);

    const myScore =
      attempt.finalScore !== null
        ? Number(attempt.finalScore)
        : attempt.provisionalScore !== null
          ? Number(attempt.provisionalScore)
          : null;

    if (cohortFigures.topAttemptId === null) {
      return {
        available: true,
        myScore,
        topScore: null,
        topics: [],
        questions: [],
      };
    }

    if (cohortFigures.topAttemptId === attemptId) {
      return {
        available: true,
        myScore,
        topScore: cohortFigures.topScore,
        topics: [],
        questions: [],
      };
    }

    const placements = await this.placementsOf(attempt.testId);
    const myAnswers = await this.answersFor(attemptId);
    const topAnswers = await this.answersFor(cohortFigures.topAttemptId);

    const myByPlacement = new Map(
      myAnswers.map((a) => [a.placementId, a]),
    );
    const topByPlacement = new Map(
      topAnswers.map((a) => [a.placementId, a]),
    );

    const questions = await this.questionsFor([
      ...myAnswers.map((a) => a.questionId),
      ...topAnswers.map((a) => a.questionId),
    ]);

    const nodes = await this.db.select().from(assessmentTaxonomyNodes);
    const parentOf = new Map<string, string | null>();
    const nameOf = new Map<string, string>();
    for (const node of nodes) {
      parentOf.set(node.nodeId, node.parentId);
      nameOf.set(node.nodeId, node.name);
    }

    const questionDeltas: QuestionDelta[] = [];
    const topicEarned = new Map<
      string,
      { my: number; top: number; name: string }
    >();

    for (const placement of placements) {
      const myAnswer = myByPlacement.get(placement.placementId);
      const topAnswer = topByPlacement.get(placement.placementId);
      const question = questions.get(placement.questionId);

      const myAwarded =
        myAnswer?.awardedMarks !== null && myAnswer?.awardedMarks !== undefined
          ? Number(myAnswer.awardedMarks)
          : null;
      const topAwarded =
        topAnswer?.awardedMarks !== null &&
        topAnswer?.awardedMarks !== undefined
          ? Number(topAnswer.awardedMarks)
          : null;

      questionDeltas.push({
        placementId: placement.placementId,
        questionId: placement.questionId,
        myAwardedMarks: myAwarded,
        topAwardedMarks: topAwarded,
        topResponse:
          test.showSolutions && topAnswer ? topAnswer.response : null,
        delta:
          myAwarded !== null && topAwarded !== null
            ? myAwarded - topAwarded
            : null,
      });

      if (question) {
        const topicId = this.resolveTopicId(
          question.topicId,
          question.subTopicId,
          parentOf,
        );
        if (topicId) {
          const entry = topicEarned.get(topicId) ?? {
            my: 0,
            top: 0,
            name: nameOf.get(topicId) ?? topicId,
          };
          entry.my += myAwarded ?? 0;
          entry.top += topAwarded ?? 0;
          topicEarned.set(topicId, entry);
        }
      }
    }

    const topicDeltas: TopicDelta[] = [];
    for (const [topicId, earned] of topicEarned) {
      topicDeltas.push({
        topicId,
        topicName: earned.name,
        myEarned: earned.my,
        topEarned: earned.top,
        delta: earned.my - earned.top,
      });
    }

    return {
      available: true,
      myScore,
      topScore: cohortFigures.topScore,
      topics: topicDeltas,
      questions: questionDeltas,
    };
  }

  private buildSectionBreakdown(
    questionViews: ResultQuestionView[],
  ): SectionBreakdown[] {
    const sectionMap = new Map<
      string,
      { earned: number; available: number; pending: number }
    >();

    for (const q of questionViews) {
      const key = q.sectionName ?? "";
      const entry = sectionMap.get(key) ?? {
        earned: 0,
        available: 0,
        pending: 0,
      };

      entry.available += q.marks;

      if (q.outcome === "PENDING") {
        entry.pending += q.marks;
      } else {
        entry.earned += q.awardedMarks ?? 0;
      }

      sectionMap.set(key, entry);
    }

    return [...sectionMap.entries()].map(([key, value]) => ({
      sectionName: key === "" ? null : key,
      earned: Number(value.earned.toFixed(2)),
      available: Number(value.available.toFixed(2)),
      pending: Number(value.pending.toFixed(2)),
    }));
  }

  private buildTopicBreakdown(
    questionViews: ResultQuestionView[],
    answers: AnswerRow[],
    questions: Map<string, typeof assessmentQuestions.$inferSelect>,
    parentOf: Map<string, string | null>,
    nameOf: Map<string, string>,
  ): TopicBreakdown[] {
    const topicMap = new Map<
      string,
      { name: string; earned: number; available: number; pending: number }
    >();

    for (const qv of questionViews) {
      const answer = answers.find((a) => a.placementId === qv.placementId);
      if (!answer) continue;

      const question = questions.get(answer.questionId);
      if (!question) continue;

      const topicId = this.resolveTopicId(
        question.topicId,
        question.subTopicId,
        parentOf,
      );
      if (!topicId) continue;

      const entry = topicMap.get(topicId) ?? {
        name: nameOf.get(topicId) ?? topicId,
        earned: 0,
        available: 0,
        pending: 0,
      };

      entry.available += qv.marks;

      if (qv.outcome === "PENDING") {
        entry.pending += qv.marks;
      } else {
        entry.earned += qv.awardedMarks ?? 0;
      }

      topicMap.set(topicId, entry);
    }

    return [...topicMap.entries()].map(([topicId, value]) => ({
      topicId,
      topicName: value.name,
      earned: Number(value.earned.toFixed(2)),
      available: Number(value.available.toFixed(2)),
      pending: Number(value.pending.toFixed(2)),
    }));
  }

  private resolveTopicId(
    topicId: string,
    subTopicId: string | null,
    parentOf: Map<string, string | null>,
  ): string | null {
    if (subTopicId) {
      const parent = parentOf.get(subTopicId);
      if (parent) return parent;
    }
    return topicId;
  }

  private outcomeOf(answer: AnswerRow, marks: number): string {
    if (answer.status === "PENDING_GRADING") return "PENDING";
    if (answer.isSkipped) return "SKIPPED";
    if (answer.isCorrect) return "CORRECT";
    const awarded =
      answer.awardedMarks === null ? 0 : Number(answer.awardedMarks);
    if (awarded > 0 && awarded < marks) return "PARTIAL";
    return "WRONG";
  }

  private async requireSubmitted(
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
    if (attempt.status === "IN_PROGRESS") {
      throw new ConflictException(
        "Result not available yet — attempt is still in progress",
      );
    }
    return attempt;
  }

  private async requireTest(
    testId: string,
  ): Promise<typeof assessmentTests.$inferSelect> {
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

  private async placementsOf(testId: string) {
    return this.db
      .select()
      .from(assessmentTestQuestions)
      .where(eq(assessmentTestQuestions.testId, testId));
  }

  private async answersFor(attemptId: string): Promise<AnswerRow[]> {
    return this.db
      .select()
      .from(assessmentAttemptAnswers)
      .where(eq(assessmentAttemptAnswers.attemptId, attemptId));
  }

  private async questionsFor(questionIds: string[]) {
    const uniqueIds = [...new Set(questionIds)];
    if (uniqueIds.length === 0) {
      return new Map<string, typeof assessmentQuestions.$inferSelect>();
    }
    const rows = await this.db
      .select()
      .from(assessmentQuestions)
      .where(inArray(assessmentQuestions.questionId, uniqueIds));
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
}
