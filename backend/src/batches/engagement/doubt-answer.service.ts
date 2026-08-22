import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { and, asc, eq, isNotNull, isNull, inArray, or } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AiService } from "../../ai/ai.service";
import { OPUS } from "../../ai/model-provider";
import { FieldSpec } from "../../ai/structured";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  aiDoubtAnswers,
  aiDoubtDrafts,
  batchDoubtReplies,
  batchDoubts,
  batchInstructors,
  DoubtCitation,
} from "../../database/schema";
import { JOB_QUEUE, JobQueue, registerAndRepeat } from "../../jobs/job-queue";
import { NotificationsService } from "../../notifications/notifications.service";
import { DoubtGroundingService } from "./doubt-grounding.service";

export const DOUBT_DRAIN_JOB = "ai.doubts.drain";
const DRAIN_INTERVAL_MS = 10_000;
const BATCH_LIMIT = 10;

const ANSWER_INSTRUCTIONS = `You are a teaching assistant answering student doubts based only on the provided course materials.

Answer the student question using only the information from the sources provided. Every factual claim must come from the sources. Do not use outside knowledge.

Return a structured response with:
- "answer": A clear explanation for the student (minimum 20 characters)
- "citations": An array of objects, each with "lessonId" (the UUID from the source label [lesson:UUID] or [transcript:UUID:transcript]) and "title" (lesson title). Only cite sources you actually used.

If the sources do not contain enough information, say so honestly.`;

const DRAFT_INSTRUCTIONS = `You are helping an instructor prepare a reply to a student doubt that the automated answer did not resolve.

Below is the student question and the automated answer that was marked unhelpful. Write a clear, empathetic instructor reply that directly addresses the need. The instructor will review and edit before sending.

Return a structured response with:
- "draft": The draft reply text (minimum 20 characters)`;

interface AnswerShape {
  answer: string;
  citations: DoubtCitation[];
}

interface DraftShape {
  draft: string;
}

const ANSWER_SPEC: FieldSpec = {
  type: "object",
  fields: {
    answer: { type: "string", minLength: 20 },
    citations: {
      type: "array",
      items: {
        type: "object",
        fields: {
          lessonId: { type: "string", minLength: 1 },
          title: { type: "string", minLength: 1 },
        },
      },
    },
  },
};

const DRAFT_SPEC: FieldSpec = {
  type: "object",
  fields: {
    draft: { type: "string", minLength: 20 },
  },
};

@Injectable()
export class DoubtAnswerService implements OnModuleInit {
  private readonly logger = new Logger(DoubtAnswerService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly grounding: DoubtGroundingService,
    private readonly ai: AiService,
    private readonly notifications: NotificationsService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
  ) {}

  onModuleInit(): void {
    registerAndRepeat(
      this.jobs,
      DOUBT_DRAIN_JOB,
      async () => {
        await this.drain();
      },
      DRAIN_INTERVAL_MS,
      (err) =>
        this.logger.error("Could not schedule the doubt answer drain", err),
    );
  }

  async escalate(
    batchId: string,
    doubtId: string,
    requesterId: string,
  ): Promise<{ escalated: boolean }> {
    const [aiAnswer] = await this.db
      .select()
      .from(aiDoubtAnswers)
      .where(eq(aiDoubtAnswers.doubtId, doubtId))
      .limit(1);

    if (!aiAnswer) {
      throw new NotFoundException("No AI answer found for this doubt");
    }

    if (aiAnswer.askedBy !== requesterId) {
      throw new ForbiddenException("Only the student who asked can escalate");
    }

    if (aiAnswer.status !== "ANSWERED") {
      throw new BadRequestException(
        "Escalation is only available on a completed AI answer",
      );
    }

    if (aiAnswer.markedUnhelpfulAt !== null) {
      throw new BadRequestException("Already escalated");
    }

    const now = this.clock.now();
    await this.db
      .update(aiDoubtAnswers)
      .set({
        status: "ESCALATED",
        markedUnhelpfulAt: now,
        updatedAt: now,
      })
      .where(eq(aiDoubtAnswers.answerId, aiAnswer.answerId));

    await this.db
      .update(batchDoubts)
      .set({ status: "OPEN", updatedAt: now })
      .where(eq(batchDoubts.doubtId, doubtId));

    const [doubt] = await this.db
      .select({ title: batchDoubts.title, askedBy: batchDoubts.askedBy })
      .from(batchDoubts)
      .where(eq(batchDoubts.doubtId, doubtId))
      .limit(1);

    const instructorId = await this.findInstructor(batchId);
    if (instructorId) {
      await this.notifications.create({
        userId: instructorId,
        type: "BATCH_DOUBT_REPLY",
        title: `Student needs human help: ${doubt?.title ?? ""}`,
        body: "An automated answer was marked unhelpful",
        link: `/instructor/doubts`,
        batchId,
      });
    }

    await this.notifications.create({
      userId: requesterId,
      type: "BATCH_DOUBT_REPLY",
      title: "Your doubt has been sent to an instructor",
      body: "An instructor will respond soon",
      batchId,
    });

    return { escalated: true };
  }

  async getDraft(
    batchId: string,
    doubtId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<typeof aiDoubtDrafts.$inferSelect | null> {
    const isStaff =
      requesterRole === "PLATFORM_ADMIN" || requesterRole === "INSTRUCTOR";
    if (!isStaff) {
      throw new ForbiddenException(
        "Draft replies are only visible to instructors",
      );
    }

    const [draft] = await this.db
      .select()
      .from(aiDoubtDrafts)
      .where(
        and(
          eq(aiDoubtDrafts.doubtId, doubtId),
          eq(aiDoubtDrafts.batchId, batchId),
          eq(aiDoubtDrafts.isDiscarded, false),
        ),
      )
      .limit(1);

    return draft ?? null;
  }

  async commitDraft(
    batchId: string,
    doubtId: string,
    requesterId: string,
  ): Promise<{ committed: boolean }> {
    const [draft] = await this.db
      .select()
      .from(aiDoubtDrafts)
      .where(
        and(
          eq(aiDoubtDrafts.doubtId, doubtId),
          eq(aiDoubtDrafts.batchId, batchId),
          eq(aiDoubtDrafts.isDiscarded, false),
          eq(aiDoubtDrafts.status, "PENDING"),
        ),
      )
      .limit(1);

    if (!draft) {
      throw new NotFoundException("No pending draft found for this doubt");
    }

    const now = this.clock.now();
    const [reply] = await this.db
      .insert(batchDoubtReplies)
      .values({
        doubtId,
        authorId: requesterId,
        body: draft.draftText,
        attachments: [],
        isOfficial: true,
      })
      .returning();

    await this.db
      .update(aiDoubtDrafts)
      .set({
        status: "COMMITTED",
        committedAt: now,
        committedReplyId: reply.replyId,
        updatedAt: now,
      })
      .where(eq(aiDoubtDrafts.draftId, draft.draftId));

    await this.db
      .update(batchDoubts)
      .set({ status: "ANSWERED", updatedAt: now })
      .where(eq(batchDoubts.doubtId, doubtId));

    const [doubt] = await this.db
      .select({ askedBy: batchDoubts.askedBy, title: batchDoubts.title })
      .from(batchDoubts)
      .where(eq(batchDoubts.doubtId, doubtId))
      .limit(1);

    if (doubt) {
      await this.notifications.create({
        userId: doubt.askedBy,
        type: "BATCH_DOUBT_REPLY",
        title: `Your doubt was answered: ${doubt.title}`,
        body: draft.draftText.slice(0, 200),
        batchId,
      });
    }

    return { committed: true };
  }

  async discardDraft(
    batchId: string,
    doubtId: string,
  ): Promise<{ discarded: boolean }> {
    const [draft] = await this.db
      .select()
      .from(aiDoubtDrafts)
      .where(
        and(
          eq(aiDoubtDrafts.doubtId, doubtId),
          eq(aiDoubtDrafts.batchId, batchId),
          eq(aiDoubtDrafts.isDiscarded, false),
          eq(aiDoubtDrafts.status, "PENDING"),
        ),
      )
      .limit(1);

    if (!draft) {
      throw new NotFoundException("No pending draft found for this doubt");
    }

    const now = this.clock.now();
    await this.db
      .update(aiDoubtDrafts)
      .set({ isDiscarded: true, status: "DISCARDED", updatedAt: now })
      .where(eq(aiDoubtDrafts.draftId, draft.draftId));

    return { discarded: true };
  }

  async getAiAnswer(doubtId: string): Promise<{
    status: string;
    answerText: string | null;
    citations: DoubtCitation[];
    markedUnhelpfulAt: Date | null;
    source: "AI";
  } | null> {
    const [answer] = await this.db
      .select()
      .from(aiDoubtAnswers)
      .where(eq(aiDoubtAnswers.doubtId, doubtId))
      .limit(1);

    if (!answer) return null;

    return {
      status: answer.status,
      answerText: answer.answerText,
      citations: answer.citations,
      markedUnhelpfulAt: answer.markedUnhelpfulAt,
      source: "AI",
    };
  }

  async unhelpfulReport(instructorBatchIds?: string[]): Promise<
    Array<{
      batchId: string;
      subjectId: string | null;
      topicId: string | null;
      doubtId: string;
      question: string;
      questionTitle: string;
      aiAnswer: string | null;
      markedUnhelpfulAt: Date | null;
      category: "UNHELPFUL" | "FAILED";
    }>
  > {
    const scopeCondition =
      instructorBatchIds && instructorBatchIds.length > 0
        ? inArray(aiDoubtAnswers.batchId, instructorBatchIds)
        : undefined;

    const signalCondition = or(
      isNotNull(aiDoubtAnswers.markedUnhelpfulAt),
      eq(aiDoubtAnswers.status, "FAILED"),
    );

    const where = scopeCondition
      ? and(signalCondition, scopeCondition)
      : signalCondition;

    const rows = await this.db
      .select({
        batchId: aiDoubtAnswers.batchId,
        subjectId: aiDoubtAnswers.subjectId,
        topicId: aiDoubtAnswers.topicId,
        doubtId: aiDoubtAnswers.doubtId,
        question: batchDoubts.body,
        questionTitle: batchDoubts.title,
        aiAnswer: aiDoubtAnswers.answerText,
        markedUnhelpfulAt: aiDoubtAnswers.markedUnhelpfulAt,
        status: aiDoubtAnswers.status,
      })
      .from(aiDoubtAnswers)
      .innerJoin(batchDoubts, eq(batchDoubts.doubtId, aiDoubtAnswers.doubtId))
      .where(where)
      .orderBy(
        asc(aiDoubtAnswers.batchId),
        asc(aiDoubtAnswers.subjectId),
        asc(aiDoubtAnswers.topicId),
        asc(aiDoubtAnswers.markedUnhelpfulAt),
      );

    return rows.map((r) => ({
      batchId: r.batchId,
      subjectId: r.subjectId,
      topicId: r.topicId,
      doubtId: r.doubtId,
      question: r.question,
      questionTitle: r.questionTitle,
      aiAnswer: r.aiAnswer,
      markedUnhelpfulAt: r.markedUnhelpfulAt,
      category: r.markedUnhelpfulAt !== null ? "UNHELPFUL" : "FAILED",
    }));
  }

  async instructorUnhelpfulReport(instructorId: string): Promise<
    Array<{
      batchId: string;
      subjectId: string | null;
      topicId: string | null;
      doubtId: string;
      question: string;
      questionTitle: string;
      aiAnswer: string | null;
      markedUnhelpfulAt: Date | null;
      category: "UNHELPFUL" | "FAILED";
    }>
  > {
    const instructorBatches = await this.db
      .select({ batchId: batchInstructors.batchId })
      .from(batchInstructors)
      .where(eq(batchInstructors.instructorId, instructorId));

    const batchIds = instructorBatches.map((r) => r.batchId);
    if (batchIds.length === 0) return [];
    return this.unhelpfulReport(batchIds);
  }

  async drain(): Promise<void> {
    await this.drainUnprocessedDoubts();
    await this.drainEscalatedDrafts();
  }

  private async drainUnprocessedDoubts(): Promise<void> {
    const unprocessed = await this.db
      .select({ doubt: batchDoubts })
      .from(batchDoubts)
      .leftJoin(aiDoubtAnswers, eq(aiDoubtAnswers.doubtId, batchDoubts.doubtId))
      .where(
        and(
          eq(batchDoubts.isDeleted, false),
          eq(batchDoubts.status, "OPEN"),
          isNull(aiDoubtAnswers.answerId),
        ),
      )
      .orderBy(asc(batchDoubts.createdAt))
      .limit(BATCH_LIMIT);

    for (const { doubt } of unprocessed) {
      const now = this.clock.now();
      const inserted = await this.db
        .insert(aiDoubtAnswers)
        .values({
          doubtId: doubt.doubtId,
          batchId: doubt.batchId,
          askedBy: doubt.askedBy,
          subjectId: doubt.subjectId,
          status: "PENDING",
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning();

      if (inserted.length > 0) {
        await this.processAnswer(inserted[0]);
      }
    }
  }

  private async drainEscalatedDrafts(): Promise<void> {
    const escalated = await this.db
      .select()
      .from(aiDoubtAnswers)
      .where(eq(aiDoubtAnswers.status, "ESCALATED"))
      .orderBy(asc(aiDoubtAnswers.markedUnhelpfulAt))
      .limit(BATCH_LIMIT);

    for (const answer of escalated) {
      const [existing] = await this.db
        .select({ draftId: aiDoubtDrafts.draftId })
        .from(aiDoubtDrafts)
        .where(eq(aiDoubtDrafts.answerId, answer.answerId))
        .limit(1);

      if (!existing) {
        await this.processDraft(answer);
      }
    }
  }

  private async processAnswer(
    answer: typeof aiDoubtAnswers.$inferSelect,
  ): Promise<void> {
    const [doubt] = await this.db
      .select()
      .from(batchDoubts)
      .where(
        and(
          eq(batchDoubts.doubtId, answer.doubtId),
          eq(batchDoubts.isDeleted, false),
        ),
      )
      .limit(1);

    if (!doubt) {
      await this.markFailed(answer.answerId);
      return;
    }

    const { sources, accessibleLessonIds } = await this.grounding.retrieve(
      answer.batchId,
      answer.askedBy,
    );

    if (sources.length === 0) {
      await this.failToHuman(answer, doubt);
      return;
    }

    const question = `${doubt.title}\n\n${doubt.body}`;
    const outcome = await this.ai.completeStructured<AnswerShape>(
      {
        feature: "doubt.answer",
        model: OPUS,
        organizationId: null,
        instructions: ANSWER_INSTRUCTIONS,
        sources,
        question,
        maxTokens: 1500,
      },
      ANSWER_SPEC,
    );

    if (!outcome.ok) {
      await this.failToHuman(answer, doubt);
      return;
    }

    const invalidCitations = outcome.value.citations.filter(
      (c) => !accessibleLessonIds.has(c.lessonId),
    );

    if (invalidCitations.length > 0) {
      await this.rejectToHuman(answer, doubt);
      return;
    }

    const now = this.clock.now();
    await this.db
      .update(aiDoubtAnswers)
      .set({
        status: "ANSWERED",
        answerText: outcome.value.answer,
        citations: outcome.value.citations,
        updatedAt: now,
      })
      .where(eq(aiDoubtAnswers.answerId, answer.answerId));

    await this.db
      .update(batchDoubts)
      .set({ status: "ANSWERED", updatedAt: now })
      .where(eq(batchDoubts.doubtId, doubt.doubtId));

    await this.notifications.create({
      userId: doubt.askedBy,
      type: "BATCH_DOUBT_REPLY",
      title: `Your doubt was answered: ${doubt.title}`,
      body: outcome.value.answer.slice(0, 200),
      batchId: answer.batchId,
    });
  }

  private async processDraft(
    answer: typeof aiDoubtAnswers.$inferSelect,
  ): Promise<void> {
    const [doubt] = await this.db
      .select()
      .from(batchDoubts)
      .where(eq(batchDoubts.doubtId, answer.doubtId))
      .limit(1);

    if (!doubt) return;

    const { sources } = await this.grounding.retrieve(
      answer.batchId,
      answer.askedBy,
    );

    const automatedContext = answer.answerText
      ? `The automated answer that was marked unhelpful:\n${answer.answerText}`
      : "No automated answer was generated.";

    const question = `Student question: ${doubt.title}\n\n${doubt.body}\n\n${automatedContext}`;

    const outcome = await this.ai.completeStructured<DraftShape>(
      {
        feature: "doubt.draft",
        model: OPUS,
        organizationId: null,
        instructions: DRAFT_INSTRUCTIONS,
        sources,
        question,
        maxTokens: 1000,
      },
      DRAFT_SPEC,
    );

    if (!outcome.ok) {
      this.logger.warn(
        `Failed to generate draft for doubt ${answer.doubtId}: ${outcome.reason}`,
      );
      return;
    }

    const now = this.clock.now();
    await this.db
      .insert(aiDoubtDrafts)
      .values({
        doubtId: answer.doubtId,
        batchId: answer.batchId,
        answerId: answer.answerId,
        draftText: outcome.value.draft,
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  }

  private async failToHuman(
    answer: typeof aiDoubtAnswers.$inferSelect,
    doubt: typeof batchDoubts.$inferSelect,
  ): Promise<void> {
    const now = this.clock.now();
    await this.db
      .update(aiDoubtAnswers)
      .set({ status: "FAILED", updatedAt: now })
      .where(eq(aiDoubtAnswers.answerId, answer.answerId));

    await this.notifyInstructor(answer.batchId, doubt.title);
    await this.notifications.create({
      userId: answer.askedBy,
      type: "BATCH_DOUBT_REPLY",
      title: "Your doubt could not be answered automatically",
      body: "An instructor has been notified and will help you soon",
      batchId: answer.batchId,
    });
  }

  private async rejectToHuman(
    answer: typeof aiDoubtAnswers.$inferSelect,
    doubt: typeof batchDoubts.$inferSelect,
  ): Promise<void> {
    const now = this.clock.now();
    await this.db
      .update(aiDoubtAnswers)
      .set({ status: "REJECTED", updatedAt: now })
      .where(eq(aiDoubtAnswers.answerId, answer.answerId));

    await this.notifyInstructor(answer.batchId, doubt.title);
    await this.notifications.create({
      userId: answer.askedBy,
      type: "BATCH_DOUBT_REPLY",
      title: "Your doubt could not be answered automatically",
      body: "An instructor has been notified and will help you soon",
      batchId: answer.batchId,
    });
  }

  private async markFailed(answerId: string): Promise<void> {
    const now = this.clock.now();
    await this.db
      .update(aiDoubtAnswers)
      .set({ status: "FAILED", updatedAt: now })
      .where(eq(aiDoubtAnswers.answerId, answerId));
  }

  private async notifyInstructor(
    batchId: string,
    doubtTitle: string,
  ): Promise<void> {
    const instructorId = await this.findInstructor(batchId);
    if (!instructorId) return;

    await this.notifications.create({
      userId: instructorId,
      type: "BATCH_DOUBT_REPLY",
      title: `Doubt needs instructor: ${doubtTitle}`,
      body: "AI could not answer this doubt",
      link: `/instructor/doubts`,
      batchId,
    });
  }

  private async findInstructor(batchId: string): Promise<string | null> {
    const [instructor] = await this.db
      .select({ instructorId: batchInstructors.instructorId })
      .from(batchInstructors)
      .where(eq(batchInstructors.batchId, batchId))
      .limit(1);

    return instructor?.instructorId ?? null;
  }
}
