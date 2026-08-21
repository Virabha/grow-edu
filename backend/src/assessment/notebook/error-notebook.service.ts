import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  ContentBlock,
  QuestionAnswerKey,
  assessmentErrorNotebook,
} from "../../database/schema";
import { Queryable } from "../../database/transaction";

export interface NotebookDraft {
  userId: string;
  questionId: string;
  questionVersion: number;
  attemptId: string;
  answerId: string;
  topicId: string;
  givenAnswer: unknown;
  correctAnswer: QuestionAnswerKey | null;
  explanation: ContentBlock[];
}

export interface NotebookEntry {
  entryId: string;
  questionId: string;
  questionVersion: number;
  attemptId: string;
  topicId: string;
  givenAnswer: unknown;
  correctAnswer: QuestionAnswerKey | null;
  explanation: ContentBlock[];
  isResolved: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class ErrorNotebookService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async collect(drafts: NotebookDraft[], tx: Queryable): Promise<void> {
    if (drafts.length === 0) return;

    const now = this.clock.now();

    await tx
      .insert(assessmentErrorNotebook)
      .values(
        drafts.map((draft) => ({
          userId: draft.userId,
          questionId: draft.questionId,
          questionVersion: draft.questionVersion,
          attemptId: draft.attemptId,
          answerId: draft.answerId,
          topicId: draft.topicId,
          givenAnswer: draft.givenAnswer ?? null,
          correctAnswer: draft.correctAnswer,
          explanation: draft.explanation,
          createdAt: now,
        })),
      )
      .onConflictDoNothing();
  }

  async list(
    userId: string,
    options: { topicId?: string; includeResolved?: boolean } = {},
  ): Promise<NotebookEntry[]> {
    const filters = [eq(assessmentErrorNotebook.userId, userId)];
    if (options.topicId) {
      filters.push(eq(assessmentErrorNotebook.topicId, options.topicId));
    }
    if (!options.includeResolved) {
      filters.push(eq(assessmentErrorNotebook.isResolved, false));
    }

    const rows = await this.db
      .select()
      .from(assessmentErrorNotebook)
      .where(and(...filters))
      .orderBy(desc(assessmentErrorNotebook.createdAt));

    return rows.map((row) => this.present(row));
  }

  async resolve(entryId: string, userId: string): Promise<NotebookEntry> {
    const entry = await this.require(entryId, userId);
    if (entry.isResolved) return this.present(entry);

    const [updated] = await this.db
      .update(assessmentErrorNotebook)
      .set({ isResolved: true, resolvedAt: this.clock.now() })
      .where(eq(assessmentErrorNotebook.entryId, entryId))
      .returning();

    return this.present(updated);
  }

  async reopen(entryId: string, userId: string): Promise<NotebookEntry> {
    await this.require(entryId, userId);

    const [updated] = await this.db
      .update(assessmentErrorNotebook)
      .set({ isResolved: false, resolvedAt: null })
      .where(eq(assessmentErrorNotebook.entryId, entryId))
      .returning();

    return this.present(updated);
  }

  private async require(
    entryId: string,
    userId: string,
  ): Promise<typeof assessmentErrorNotebook.$inferSelect> {
    const [row] = await this.db
      .select()
      .from(assessmentErrorNotebook)
      .where(eq(assessmentErrorNotebook.entryId, entryId))
      .limit(1);

    if (!row) throw new NotFoundException("Notebook entry not found");
    if (row.userId !== userId) {
      throw new ForbiddenException("That entry belongs to someone else");
    }
    return row;
  }

  private present(
    row: typeof assessmentErrorNotebook.$inferSelect,
  ): NotebookEntry {
    return {
      entryId: row.entryId,
      questionId: row.questionId,
      questionVersion: row.questionVersion,
      attemptId: row.attemptId,
      topicId: row.topicId,
      givenAnswer: row.givenAnswer,
      correctAnswer: row.correctAnswer ?? null,
      explanation: row.explanation,
      isResolved: row.isResolved,
      resolvedAt: row.resolvedAt,
      createdAt: row.createdAt,
    };
  }
}
