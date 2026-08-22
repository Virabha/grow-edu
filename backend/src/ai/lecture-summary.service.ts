import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleInit,
} from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  LessonChapter,
  lessonSummaries,
  lessonTranscriptSegments,
  lessonTranscripts,
} from "../database/schema";
import { AiBatchService } from "./batch.service";
import { HAIKU } from "./model-provider";
import { FieldSpec } from "./structured";
import { AiService } from "./ai.service";

const FEATURE = "lecture.summary";

interface SummaryOutput {
  summary: string;
  keyPoints: string[];
  chapters: { startSeconds: number; title: string }[];
}

const SUMMARY_SPEC: FieldSpec = {
  type: "object",
  fields: {
    summary: { type: "string", minLength: 20 },
    keyPoints: {
      type: "array",
      items: { type: "string", minLength: 5 },
    },
    chapters: {
      type: "array",
      items: {
        type: "object",
        fields: {
          startSeconds: { type: "integer", minimum: 0 },
          title: { type: "string", minLength: 3 },
        },
      },
    },
  },
};

const INSTRUCTIONS = `You are an expert educational content summariser.
Given a lecture transcript, produce:
1. A concise summary of the lecture (2-4 sentences)
2. A list of 3-8 key learning points
3. A list of timestamped chapter markers with descriptive titles

Chapters should correspond to major topic shifts in the content.
Chapter start times must be in ascending order.
Do not include a chapter at second 0 unless the lecture starts there naturally.
Return the output in the required structured format.`;

interface SummaryItemContext {
  summaryId: string;
  lessonId: string;
  durationSeconds: number;
}

@Injectable()
export class LectureSummaryService implements OnModuleInit {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly ai: AiService,
    private readonly batch: AiBatchService,
  ) {}

  onModuleInit(): void {
    this.batch.registerReconciler(FEATURE, async (item) => {
      const context = item.context as SummaryItemContext;
      const raw = item.structured as SummaryOutput | null;

      if (!raw || typeof raw.summary !== "string") {
        await this.db
          .update(lessonSummaries)
          .set({
            status: "FAILED",
            updatedAt: this.clock.now(),
          })
          .where(eq(lessonSummaries.summaryId, context.summaryId));
        return;
      }

      const validChapters = this.validateChapters(
        raw.chapters,
        context.durationSeconds,
      );

      await this.db
        .update(lessonSummaries)
        .set({
          status: "READY",
          summary: raw.summary,
          keyPoints: Array.isArray(raw.keyPoints) ? raw.keyPoints : [],
          chapters: validChapters,
          updatedAt: this.clock.now(),
        })
        .where(eq(lessonSummaries.summaryId, context.summaryId));
    });
  }

  async submitSummarize(
    lessonId: string,
    requestedBy: string,
    organizationId: string | null,
  ): Promise<{ summaryId: string }> {
    const transcriptData = await this.loadTranscript(lessonId);

    if (!transcriptData) {
      throw new BadRequestException(
        "This lesson has no completed transcript — summarisation requires a transcript",
      );
    }

    const { body, durationSeconds } = transcriptData;

    const now = this.clock.now();

    const [existing] = await this.db
      .select()
      .from(lessonSummaries)
      .where(eq(lessonSummaries.lessonId, lessonId))
      .limit(1);

    let summaryId: string;

    if (existing) {
      summaryId = existing.summaryId;
      await this.db
        .update(lessonSummaries)
        .set({ status: "PENDING", summary: null, keyPoints: [], chapters: [], updatedAt: now })
        .where(eq(lessonSummaries.summaryId, summaryId));
    } else {
      const [created] = await this.db
        .insert(lessonSummaries)
        .values({
          lessonId,
          status: "PENDING",
          requestedBy,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      summaryId = created.summaryId;
    }

    const request = this.ai.buildRequest(
      {
        feature: FEATURE,
        model: HAIKU,
        organizationId,
        instructions: INSTRUCTIONS,
        sources: [
          {
            sourceId: lessonId,
            kind: "transcript",
            title: `Lesson ${lessonId} transcript`,
            body,
          },
        ],
        question: "Summarise this lecture, extract key points, and identify chapter markers with timestamps.",
        maxTokens: 2048,
      },
      SUMMARY_SPEC,
    );

    await this.batch.submit({
      feature: FEATURE,
      model: HAIKU,
      organizationId,
      requestedBy,
      items: [
        {
          reference: summaryId,
          request,
          context: {
            summaryId,
            lessonId,
            durationSeconds,
          } satisfies SummaryItemContext,
        },
      ],
    });

    return { summaryId };
  }

  async getForLesson(lessonId: string): Promise<typeof lessonSummaries.$inferSelect | null> {
    const [row] = await this.db
      .select()
      .from(lessonSummaries)
      .where(eq(lessonSummaries.lessonId, lessonId))
      .limit(1);

    return row ?? null;
  }

  private validateChapters(
    chapters: { startSeconds: number; title: string }[],
    durationSeconds: number,
  ): LessonChapter[] {
    if (!Array.isArray(chapters) || chapters.length === 0) {
      return [];
    }

    const valid: LessonChapter[] = [];
    let lastStart = -1;

    for (const chapter of chapters) {
      if (
        typeof chapter.startSeconds !== "number" ||
        !Number.isInteger(chapter.startSeconds)
      ) {
        return [];
      }
      if (chapter.startSeconds <= lastStart) {
        return [];
      }
      if (chapter.startSeconds >= durationSeconds) {
        return [];
      }
      lastStart = chapter.startSeconds;
      valid.push({ startSeconds: chapter.startSeconds, title: chapter.title });
    }

    return valid;
  }

  private async loadTranscript(
    lessonId: string,
  ): Promise<{ body: string; durationSeconds: number } | null> {
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

    if (!transcript) return null;

    const segments = await this.db
      .select()
      .from(lessonTranscriptSegments)
      .where(eq(lessonTranscriptSegments.transcriptId, transcript.transcriptId))
      .orderBy(asc(lessonTranscriptSegments.ordinal));

    if (segments.length === 0) return null;

    const body = segments.map((s) => `[${s.startSeconds}s] ${s.body}`).join("\n");
    const durationSeconds = Math.max(...segments.map((s) => s.endSeconds));

    return { body, durationSeconds };
  }
}
