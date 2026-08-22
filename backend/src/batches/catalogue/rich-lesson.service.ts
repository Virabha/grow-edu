import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assessmentQuestionVersions,
  assessmentQuestions,
  lessonInlineAnswers,
  richLessonContent,
  RichLessonBlock,
} from "../../database/schema";
import { CLOCK, Clock } from "../../common/clock";
import {
  scoreAnswer,
  toleranceFrom,
} from "../../assessment/attempts/scoring";
import {
  BatchAccessService,
  SignedInViewer,
  Viewer,
} from "../access/batch-access.service";
import { inlineQuestionIds, parseRichBlocks } from "./rich-content";

@Injectable()
export class RichLessonService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly access: BatchAccessService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async put(
    batchId: string,
    lessonId: string,
    body: unknown,
    viewer: Viewer,
  ) {
    const lesson = await this.requireRichLesson(batchId, lessonId, viewer);
    const blocks = parseRichBlocks(body, "content");
    const questionIds = inlineQuestionIds(blocks);
    await this.assertQuestionsExist(questionIds);
    const now = this.clock.now();

    const [stored] = await this.db
      .insert(richLessonContent)
      .values({
        lessonId: lesson.lessonId,
        blocks,
        inlineQuestionIds: questionIds,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: richLessonContent.lessonId,
        set: { blocks, inlineQuestionIds: questionIds, updatedAt: now },
      })
      .returning();

    return stored;
  }

  async get(batchId: string, lessonId: string, viewer: Viewer) {
    const { lesson, isStaff } = await this.access.requireForLesson(
      lessonId,
      viewer,
      "READ",
      batchId,
    );
    if (lesson.type !== "RICH") {
      throw new NotFoundException("That lesson is not a rich lesson");
    }
    const [stored] = await this.db
      .select()
      .from(richLessonContent)
      .where(eq(richLessonContent.lessonId, lessonId));
    if (!stored) {
      return { lessonId, blocks: [], inlineQuestionIds: [] };
    }
    return {
      lessonId,
      blocks: await this.hydrate(stored.blocks, isStaff),
      inlineQuestionIds: stored.inlineQuestionIds,
    };
  }

  async answerInline(
    batchId: string,
    lessonId: string,
    questionId: string,
    response: unknown,
    viewer: SignedInViewer,
  ) {
    await this.access.requireForLesson(lessonId, viewer, "READ", batchId);
    const [stored] = await this.db
      .select()
      .from(richLessonContent)
      .where(eq(richLessonContent.lessonId, lessonId));
    if (!stored || !stored.inlineQuestionIds.includes(questionId)) {
      throw new NotFoundException("That question is not in this lesson");
    }

    const version = await this.currentVersion(questionId);
    const scored = scoreAnswer(
      {
        options: version.options,
        answerKey: version.answerKey,
        partialCreditRule: version.partialCreditRule,
        tolerance: toleranceFrom(version.toleranceKind, version.tolerance),
      },
      { marks: 1, negativeMarkPercent: 0 },
      response,
    );
    const now = this.clock.now();

    const [recorded] = await this.db
      .insert(lessonInlineAnswers)
      .values({
        userId: viewer.userId,
        lessonId,
        batchId,
        questionId,
        response,
        outcome: scored.outcome,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          lessonInlineAnswers.userId,
          lessonInlineAnswers.lessonId,
          lessonInlineAnswers.questionId,
        ],
        set: {
          response,
          outcome: scored.outcome,
          attemptCount: sql`${lessonInlineAnswers.attemptCount} + 1`,
          updatedAt: now,
        },
      })
      .returning();

    return { questionId, outcome: recorded.outcome };
  }

  async myInlineAnswers(
    batchId: string,
    lessonId: string,
    viewer: SignedInViewer,
  ) {
    await this.access.requireForLesson(lessonId, viewer, "READ", batchId);
    return this.db
      .select()
      .from(lessonInlineAnswers)
      .where(
        and(
          eq(lessonInlineAnswers.lessonId, lessonId),
          eq(lessonInlineAnswers.userId, viewer.userId),
        ),
      );
  }

  private async hydrate(blocks: RichLessonBlock[], isStaff: boolean) {
    const questionIds = inlineQuestionIds(blocks);
    if (questionIds.length === 0) return blocks;

    const versions = await this.db
      .select({
        questionId: assessmentQuestions.questionId,
        type: assessmentQuestions.type,
        prompt: assessmentQuestionVersions.prompt,
        options: assessmentQuestionVersions.options,
        answerKey: assessmentQuestionVersions.answerKey,
      })
      .from(assessmentQuestions)
      .innerJoin(
        assessmentQuestionVersions,
        and(
          eq(assessmentQuestionVersions.questionId, assessmentQuestions.questionId),
          eq(
            assessmentQuestionVersions.version,
            assessmentQuestions.currentVersion,
          ),
        ),
      )
      .where(inArray(assessmentQuestions.questionId, questionIds));

    const byId = new Map(versions.map((row) => [row.questionId, row]));

    return blocks.map((block) => {
      if (block.type !== "QUESTION") return block;
      const found = byId.get(block.questionId);
      if (!found) return block;
      return {
        ...block,
        question: {
          questionId: found.questionId,
          type: found.type,
          prompt: found.prompt,
          options: found.options,
          ...(isStaff ? { answerKey: found.answerKey } : {}),
        },
      };
    });
  }

  private async currentVersion(questionId: string) {
    const [version] = await this.db
      .select({
        options: assessmentQuestionVersions.options,
        answerKey: assessmentQuestionVersions.answerKey,
        partialCreditRule: assessmentQuestionVersions.partialCreditRule,
        toleranceKind: assessmentQuestionVersions.toleranceKind,
        tolerance: assessmentQuestionVersions.tolerance,
      })
      .from(assessmentQuestions)
      .innerJoin(
        assessmentQuestionVersions,
        and(
          eq(assessmentQuestionVersions.questionId, assessmentQuestions.questionId),
          eq(
            assessmentQuestionVersions.version,
            assessmentQuestions.currentVersion,
          ),
        ),
      )
      .where(eq(assessmentQuestions.questionId, questionId));
    if (!version) {
      throw new NotFoundException("That question is no longer in the bank");
    }
    return version;
  }

  private async assertQuestionsExist(questionIds: string[]): Promise<void> {
    if (questionIds.length === 0) return;
    const found = await this.db
      .select({ questionId: assessmentQuestions.questionId })
      .from(assessmentQuestions)
      .where(
        and(
          inArray(assessmentQuestions.questionId, questionIds),
          eq(assessmentQuestions.isRetired, false),
        ),
      );
    if (found.length !== questionIds.length) {
      throw new BadRequestException(
        "An inline question does not exist in the question bank",
      );
    }
  }

  private async requireRichLesson(
    batchId: string,
    lessonId: string,
    viewer: Viewer,
  ) {
    const { lesson } = await this.access.requireForLesson(
      lessonId,
      viewer,
      "MANAGE",
      batchId,
    );
    if (lesson.type !== "RICH") {
      throw new BadRequestException(
        "Only a rich lesson can carry structured content",
      );
    }
    return lesson;
  }
}
