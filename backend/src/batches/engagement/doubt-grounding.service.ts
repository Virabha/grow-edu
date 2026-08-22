import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchDoubtReplies,
  batchDoubts,
  batchEnrollments,
  batchSubjects,
  lessons,
  lessonTranscriptSegments,
  subjectLessons,
} from "../../database/schema";
import { GroundingSource } from "../../ai/prompt";

@Injectable()
export class DoubtGroundingService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async retrieve(
    batchId: string,
    askedBy: string,
  ): Promise<{ sources: GroundingSource[]; accessibleLessonIds: Set<string> }> {
    const [enrollment] = await this.db
      .select({ enrollmentId: batchEnrollments.enrollmentId })
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.userId, askedBy),
          eq(batchEnrollments.status, "ACTIVE"),
        ),
      )
      .limit(1);

    if (!enrollment) {
      return { sources: [], accessibleLessonIds: new Set() };
    }

    const lessonRows = await this.db
      .select({
        lessonId: lessons.lessonId,
        title: lessons.title,
        textContent: lessons.textContent,
      })
      .from(lessons)
      .innerJoin(subjectLessons, eq(subjectLessons.lessonId, lessons.lessonId))
      .innerJoin(
        batchSubjects,
        eq(batchSubjects.subjectId, subjectLessons.subjectId),
      )
      .where(
        and(
          eq(batchSubjects.batchId, batchId),
          eq(batchSubjects.isDeleted, false),
          eq(subjectLessons.isDeleted, false),
          eq(lessons.isDeleted, false),
          eq(lessons.status, "READY"),
        ),
      );

    const accessibleLessonIds = new Set(lessonRows.map((r) => r.lessonId));
    const sources: GroundingSource[] = [];

    for (const lesson of lessonRows) {
      if (lesson.textContent && lesson.textContent.length > 0) {
        sources.push({
          sourceId: lesson.lessonId,
          kind: "lesson",
          title: lesson.title,
          body: lesson.textContent,
        });
      }
    }

    if (lessonRows.length > 0) {
      const segments = await this.db
        .select({
          lessonId: lessonTranscriptSegments.lessonId,
          ordinal: lessonTranscriptSegments.ordinal,
          body: lessonTranscriptSegments.body,
        })
        .from(lessonTranscriptSegments)
        .where(
          inArray(
            lessonTranscriptSegments.lessonId,
            lessonRows.map((r) => r.lessonId),
          ),
        )
        .orderBy(
          asc(lessonTranscriptSegments.lessonId),
          asc(lessonTranscriptSegments.ordinal),
        );

      const segsByLesson = new Map<string, string[]>();
      for (const seg of segments) {
        const bodies = segsByLesson.get(seg.lessonId) ?? [];
        bodies.push(seg.body);
        segsByLesson.set(seg.lessonId, bodies);
      }

      for (const [lessonId, bodies] of segsByLesson) {
        const lesson = lessonRows.find((l) => l.lessonId === lessonId);
        sources.push({
          sourceId: `${lessonId}:transcript`,
          kind: "transcript",
          title: `Transcript: ${lesson?.title ?? lessonId}`,
          body: bodies.join(" "),
        });
      }
    }

    const publishedRows = await this.db
      .select({
        doubtId: batchDoubts.doubtId,
        title: batchDoubts.title,
        body: batchDoubts.body,
        replyBody: batchDoubtReplies.body,
      })
      .from(batchDoubts)
      .innerJoin(
        batchDoubtReplies,
        eq(batchDoubtReplies.replyId, batchDoubts.promotedReplyId),
      )
      .where(
        and(
          eq(batchDoubts.batchId, batchId),
          isNotNull(batchDoubts.promotedReplyId),
          eq(batchDoubts.isDeleted, false),
          eq(batchDoubtReplies.isDeleted, false),
        ),
      );

    for (const row of publishedRows) {
      sources.push({
        sourceId: row.doubtId,
        kind: "doubt",
        title: row.title,
        body: `Q: ${row.body}\nA: ${row.replyBody}`,
      });
    }

    return { sources, accessibleLessonIds };
  }
}
