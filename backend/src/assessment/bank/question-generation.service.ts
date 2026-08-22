import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AiService } from "../../ai/ai.service";
import { OPUS } from "../../ai/model-provider";
import { GroundingSource } from "../../ai/prompt";
import { FieldSpec } from "../../ai/structured";
import { CLOCK, Clock } from "../../common/clock";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  assessmentQuestionVersions,
  assessmentQuestions,
  lessonTranscriptSegments,
  lessonTranscripts,
} from "../../database/schema";
import { QuestionBankService } from "./question-bank.service";

const FEATURE = "assessment.question-generation";

interface GeneratedQuestionRaw {
  statement: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctIndex: number;
  explanation: string;
}

interface GeneratedQuestionsOutput {
  questions: GeneratedQuestionRaw[];
}

const QUESTION_SPEC: FieldSpec = {
  type: "object",
  fields: {
    questions: {
      type: "array",
      items: {
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
      },
    },
  },
};

const INSTRUCTIONS = `You are an expert question author for an e-learning platform.
Generate multiple-choice questions based on the provided lesson transcript.
Each question must have exactly four options (A, B, C, D) and one correct answer.
Questions must be clear, unambiguous, and test genuine understanding of the lesson content.
Do not reference "the lesson" or "the transcript" in the question text.
Return questions in the required structured format.`;

@Injectable()
export class QuestionGenerationService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly ai: AiService,
    private readonly bank: QuestionBankService,
  ) {}

  async generateFromLesson(
    lessonId: string,
    subjectId: string,
    topicId: string,
    difficulty: number,
    count: number,
    actorId: string,
    organizationId: string | null,
  ): Promise<{ questionIds: string[] }> {
    const sources = await this.buildSources(lessonId);

    const outcome = await this.ai.completeStructured<GeneratedQuestionsOutput>(
      {
        feature: FEATURE,
        model: OPUS,
        organizationId,
        instructions: INSTRUCTIONS,
        sources,
        question: `Generate exactly ${count} multiple-choice questions for the topic with difficulty level ${difficulty}.`,
        maxTokens: 4096,
      },
      QUESTION_SPEC,
    );

    if (!outcome.ok) {
      throw new UnprocessableEntityException(
        `Question generation failed: ${outcome.reason}`,
      );
    }

    const { questions } = outcome.value;

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new UnprocessableEntityException(
        "Generation produced no questions",
      );
    }

    const now = this.clock.now();
    const questionIds: string[] = [];

    await this.db.transaction(async (tx) => {
      for (const raw of questions) {
        const options = [
          { id: "a", content: [{ type: "TEXT" as const, text: raw.optionA }] },
          { id: "b", content: [{ type: "TEXT" as const, text: raw.optionB }] },
          { id: "c", content: [{ type: "TEXT" as const, text: raw.optionC }] },
          { id: "d", content: [{ type: "TEXT" as const, text: raw.optionD }] },
        ];
        const optionIds = ["a", "b", "c", "d"];
        const correctOptionId = optionIds[raw.correctIndex];

        const [question] = await tx
          .insert(assessmentQuestions)
          .values({
            type: "SINGLE_CORRECT",
            subjectId,
            topicId,
            authoredDifficulty: difficulty,
            reviewStatus: "UNREVIEWED",
            createdBy: actorId,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        await tx.insert(assessmentQuestionVersions).values({
          questionId: question.questionId,
          version: 1,
          prompt: [{ type: "TEXT", text: raw.statement }],
          options,
          answerKey: { kind: "SINGLE", optionId: correctOptionId },
          explanation: [{ type: "TEXT", text: raw.explanation }],
          searchText: raw.statement,
          createdBy: actorId,
          createdAt: now,
        });

        questionIds.push(question.questionId);
      }
    });

    return { questionIds };
  }

  private async buildSources(lessonId: string): Promise<GroundingSource[]> {
    const [transcript] = await this.db
      .select()
      .from(lessonTranscripts)
      .where(
        and(
          eq(lessonTranscripts.lessonId, lessonId),
          eq(lessonTranscripts.status, "READY"),
        ),
      )
      .limit(1);

    if (!transcript) {
      return [];
    }

    const segments = await this.db
      .select()
      .from(lessonTranscriptSegments)
      .where(eq(lessonTranscriptSegments.transcriptId, transcript.transcriptId))
      .orderBy(asc(lessonTranscriptSegments.ordinal));

    if (segments.length === 0) {
      return [];
    }

    const body = segments.map((s) => s.body).join(" ");

    return [
      {
        sourceId: lessonId,
        kind: "transcript",
        title: `Lesson ${lessonId}`,
        body,
      },
    ];
  }
}
