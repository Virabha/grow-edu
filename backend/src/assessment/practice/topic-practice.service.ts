import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNotNull, not, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { CLOCK, Clock } from '../../common/clock';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '../../database/schema';
import {
  ContentBlock,
  QuestionOption,
  assessmentDifficultyLevels,
  assessmentQuestionVersions,
  assessmentQuestions,
  assessmentQuestionsServed,
} from '../../database/schema';
import {
  effectiveDifficultyExpr,
  effectiveDifficultyOf,
} from '../shared/difficulty';

export interface QuestionServeView {
  servedId: string;
  questionId: string;
  type: string;
  difficulty: number;
  prompt: ContentBlock[];
  options: QuestionOption[];
}

type QuestionRow = typeof assessmentQuestions.$inferSelect;
type ServedRow = typeof assessmentQuestionsServed.$inferSelect;

@Injectable()
export class TopicPracticeService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async nextQuestion(
    userId: string,
    topicId: string,
  ): Promise<QuestionServeView> {
    const ordinals = await this.difficultyOrdinals();
    if (ordinals.length === 0) {
      throw new NotFoundException('No difficulty levels configured');
    }

    const recentAnswered = await this.db
      .select()
      .from(assessmentQuestionsServed)
      .where(
        and(
          eq(assessmentQuestionsServed.userId, userId),
          eq(assessmentQuestionsServed.topicId, topicId),
          isNotNull(assessmentQuestionsServed.wasCorrect),
        ),
      )
      .orderBy(desc(assessmentQuestionsServed.servedAt))
      .limit(5);

    const targetOrdinal = this.computeTargetOrdinal(
      recentAnswered,
      ordinals,
    );

    const allServed = await this.db
      .selectDistinct({ questionId: assessmentQuestionsServed.questionId })
      .from(assessmentQuestionsServed)
      .where(
        and(
          eq(assessmentQuestionsServed.userId, userId),
          eq(assessmentQuestionsServed.topicId, topicId),
        ),
      );

    const servedIds = allServed.map((s) => s.questionId);

    let question = await this.findUnseen(topicId, targetOrdinal, servedIds);

    if (!question) {
      question = await this.findUnseenAnyDifficulty(topicId, servedIds);
    }

    if (!question) {
      question = await this.findRepeat(userId, topicId);
    }

    if (!question) {
      throw new NotFoundException('No questions available for this topic');
    }

    const difficulty = effectiveDifficultyOf(question);
    const now = this.clock.now();

    const [served] = await this.db
      .insert(assessmentQuestionsServed)
      .values({
        userId,
        questionId: question.questionId,
        topicId,
        difficulty,
        servedAt: now,
      })
      .returning();

    const version = await this.versionOf(
      question.questionId,
      question.currentVersion,
    );

    return {
      servedId: served.servedId,
      questionId: question.questionId,
      type: question.type,
      difficulty,
      prompt: version.prompt,
      options: version.options,
    };
  }

  async recordOutcome(
    servedId: string,
    userId: string,
    wasCorrect: boolean,
  ): Promise<void> {
    const [row] = await this.db
      .select()
      .from(assessmentQuestionsServed)
      .where(eq(assessmentQuestionsServed.servedId, servedId))
      .limit(1);

    if (!row || row.userId !== userId) {
      throw new NotFoundException('Served record not found');
    }

    await this.db
      .update(assessmentQuestionsServed)
      .set({ wasCorrect })
      .where(eq(assessmentQuestionsServed.servedId, servedId));
  }

  private computeTargetOrdinal(
    recent: ServedRow[],
    ordinals: number[],
  ): number {
    const minOrdinal = ordinals[0];
    const maxOrdinal = ordinals[ordinals.length - 1];

    if (recent.length < 3) {
      return minOrdinal;
    }

    const lastThree = recent.slice(0, 3);
    const correctCount = lastThree.filter((s) => s.wasCorrect === true).length;
    const currentDifficulty = recent[0].difficulty;
    const idx = ordinals.indexOf(currentDifficulty);
    const safeIdx = idx === -1 ? 0 : idx;

    if (correctCount >= 3) {
      return safeIdx < ordinals.length - 1
        ? ordinals[safeIdx + 1]
        : maxOrdinal;
    }

    if (correctCount === 0) {
      return safeIdx > 0 ? ordinals[safeIdx - 1] : minOrdinal;
    }

    return currentDifficulty;
  }



  private async findUnseen(
    topicId: string,
    targetOrdinal: number,
    servedIds: string[],
  ): Promise<QuestionRow | null> {
    const expr = effectiveDifficultyExpr();
    const conditions = [
      eq(assessmentQuestions.topicId, topicId),
      eq(assessmentQuestions.isRetired, false),
      sql`(${expr}) = ${targetOrdinal}`,
    ];

    if (servedIds.length > 0) {
      conditions.push(
        not(inArray(assessmentQuestions.questionId, servedIds)),
      );
    }

    const rows = await this.db
      .select()
      .from(assessmentQuestions)
      .where(and(...conditions))
      .orderBy(asc(assessmentQuestions.questionId))
      .limit(1);

    return rows[0] ?? null;
  }

  private async findUnseenAnyDifficulty(
    topicId: string,
    servedIds: string[],
  ): Promise<QuestionRow | null> {
    const conditions = [
      eq(assessmentQuestions.topicId, topicId),
      eq(assessmentQuestions.isRetired, false),
    ];

    if (servedIds.length > 0) {
      conditions.push(
        not(inArray(assessmentQuestions.questionId, servedIds)),
      );
    }

    const rows = await this.db
      .select()
      .from(assessmentQuestions)
      .where(and(...conditions))
      .orderBy(asc(assessmentQuestions.questionId))
      .limit(1);

    return rows[0] ?? null;
  }

  private async findRepeat(
    userId: string,
    topicId: string,
  ): Promise<QuestionRow | null> {
    const oldest = await this.db
      .select({ questionId: assessmentQuestionsServed.questionId })
      .from(assessmentQuestionsServed)
      .where(
        and(
          eq(assessmentQuestionsServed.userId, userId),
          eq(assessmentQuestionsServed.topicId, topicId),
        ),
      )
      .orderBy(asc(assessmentQuestionsServed.servedAt))
      .limit(1);

    if (oldest.length === 0) return null;

    const rows = await this.db
      .select()
      .from(assessmentQuestions)
      .where(
        and(
          eq(assessmentQuestions.questionId, oldest[0].questionId),
          eq(assessmentQuestions.isRetired, false),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  private async difficultyOrdinals(): Promise<number[]> {
    const levels = await this.db
      .select({ ordinal: assessmentDifficultyLevels.ordinal })
      .from(assessmentDifficultyLevels)
      .orderBy(asc(assessmentDifficultyLevels.ordinal));

    return levels.map((l) => l.ordinal);
  }

  private async versionOf(questionId: string, version: number) {
    const [row] = await this.db
      .select()
      .from(assessmentQuestionVersions)
      .where(
        and(
          eq(assessmentQuestionVersions.questionId, questionId),
          eq(assessmentQuestionVersions.version, version),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Question version not found');
    return row;
  }
}
