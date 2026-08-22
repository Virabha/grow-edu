import { index, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { lessonSummaryStatusEnum } from "./enums";
import { organizationId } from "./organizations";

export interface LessonChapter {
  startSeconds: number;
  title: string;
}

export const lessonSummaries = pgTable(
  "lesson_summaries",
  {
    organizationId: organizationId(),
    summaryId: text("summary_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    lessonId: text("lesson_id").notNull(),
    status: lessonSummaryStatusEnum("status").notNull().default("PENDING"),
    summary: text("summary"),
    keyPoints: jsonb("key_points").$type<string[]>().default([]),
    chapters: jsonb("chapters").$type<LessonChapter[]>().default([]),
    requestedBy: text("requested_by"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    lessonUnique: unique("lesson_summaries_lesson_unique").on(table.lessonId),
    statusIdx: index("lesson_summaries_status_idx").on(table.status),
  }),
);
