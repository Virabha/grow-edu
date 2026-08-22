import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AiBatchService } from "../../ai/batch.service";
import { OPUS } from "../../ai/model-provider";
import { FieldSpec } from "../../ai/structured";
import { AiService } from "../../ai/ai.service";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assessmentQuestionVersions,
  assessmentQuestions,
} from "../../database/schema";

const FEATURE = "assessment.bulk-generation";

interface BulkGeneratedQuestion {
  statement: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctIndex: number;
  explanation: string;
}

const SINGLE_QUESTION_SPEC: FieldSpec = {
  type: "object",
  fields: {
    statement: { type: "string", minLength: 10 },
    optionA: { type: "string", minLength: 1 },
    optionB: { type: "string", minLength: 1 },
    optionC: { type: "string", minLength: 1 },
    optionD: { type: "string", minLength: 1 },
    correctIndex: { type: "integer", minimum: 0, maximum: 3 },
    explanation: { type: "string", minLength: 5 },
  },
};

const INSTRUCTIONS = `You are an expert question author for an e-learning platform.
Generate a single multiple-choice question for the specified topic and difficulty.
The question must have exactly four options (A, B, C, D) and one correct answer.
Questions must be clear, unambiguous, and test genuine understanding.
Return the question in the required structured format.`;

interface BulkItemContext extends Record<string, unknown> {
  subjectId: string;
  topicId: string;
  difficulty: number;
  actorId: string;
  batchIndex: number;
}

@Injectable()
export class BulkGenerationService implements OnModuleInit {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly ai: AiService,
    private readonly batch: AiBatchService,
  ) {}

  onModuleInit(): void {
    this.batch.registerReconciler(FEATURE, async (item) => {
      const context = item.context as BulkItemContext;
      const raw = item.structured as BulkGeneratedQuestion | null;

      if (!raw || typeof raw.statement !== "string") {
        return;
      }

      const options = [
        { id: "a", content: [{ type: "TEXT" as const, text: raw.optionA }] },
        { id: "b", content: [{ type: "TEXT" as const, text: raw.optionB }] },
        { id: "c", content: [{ type: "TEXT" as const, text: raw.optionC }] },
        { id: "d", content: [{ type: "TEXT" as const, text: raw.optionD }] },
      ];
      const optionIds = ["a", "b", "c", "d"];
      const correctOptionId = optionIds[raw.correctIndex] ?? "a";

      const now = this.clock.now();

      const [question] = await this.db
        .insert(assessmentQuestions)
        .values({
          type: "SINGLE_CORRECT",
          subjectId: context.subjectId,
          topicId: context.topicId,
          authoredDifficulty: context.difficulty,
          reviewStatus: "UNREVIEWED",
          createdBy: context.actorId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await this.db.insert(assessmentQuestionVersions).values({
        questionId: question.questionId,
        version: 1,
        prompt: [{ type: "TEXT", text: raw.statement }],
        options,
        answerKey: { kind: "SINGLE", optionId: correctOptionId },
        explanation: [{ type: "TEXT", text: raw.explanation }],
        searchText: raw.statement,
        createdBy: context.actorId,
        createdAt: now,
      });
    });
  }

  async submitBulkGeneration(
    subjectId: string,
    topicId: string,
    difficulty: number,
    count: number,
    actorId: string,
    organizationId: string | null,
  ): Promise<{ batchId: string }> {
    const request = this.ai.buildRequest(
      {
        feature: FEATURE,
        model: OPUS,
        organizationId,
        instructions: INSTRUCTIONS,
        sources: [],
        question: `Generate a single multiple-choice question for topic "${topicId}" at difficulty level ${difficulty}.`,
        maxTokens: 1024,
      },
      SINGLE_QUESTION_SPEC,
    );

    const items = Array.from({ length: count }, (_, i) => ({
      reference: `${topicId}-${difficulty}-${i}`,
      request,
      context: {
        subjectId,
        topicId,
        difficulty,
        actorId,
        batchIndex: i,
      } satisfies BulkItemContext,
    }));

    const batchId = await this.batch.submit({
      feature: FEATURE,
      model: OPUS,
      organizationId,
      requestedBy: actorId,
      items,
    });

    return { batchId };
  }
}
