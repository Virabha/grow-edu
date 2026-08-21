import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import type { ContentBlock } from "./assessment";
import {
  curriculumItemKindEnum,
  documentAnnotationStateEnum,
  lessonTranscriptStatusEnum,
  mediaRenditionKindEnum,
} from "./enums";
import { organizationId } from "./organizations";

export const lessonTranscripts = pgTable(
  "lesson_transcripts",
  {
    organizationId: organizationId(),
    transcriptId: text("transcript_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    lessonId: text("lesson_id").notNull(),
    renditionKind: mediaRenditionKindEnum("rendition_kind")
      .notNull()
      .default("VIDEO"),
    status: lessonTranscriptStatusEnum("status").notNull().default("PENDING"),
    language: text("language").notNull().default("en"),
    sourceKey: text("source_key"),
    errorMessage: text("error_message"),
    requestedAt: timestamp("requested_at").notNull(),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerLesson: unique("lesson_transcripts_lesson_unique").on(table.lessonId),
    statusIdx: index("lesson_transcripts_status_idx").on(
      table.status,
      table.requestedAt,
    ),
  }),
);

export const lessonTranscriptSegments = pgTable(
  "lesson_transcript_segments",
  {
    organizationId: organizationId(),
    segmentId: text("segment_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    transcriptId: text("transcript_id").notNull(),
    lessonId: text("lesson_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    startSeconds: integer("start_seconds").notNull(),
    endSeconds: integer("end_seconds").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    transcriptOrdinal: unique("lesson_transcript_segments_ordinal_unique").on(
      table.transcriptId,
      table.ordinal,
    ),
    lessonIdx: index("lesson_transcript_segments_lesson_idx").on(
      table.lessonId,
      table.startSeconds,
    ),
  }),
);

export const lessonVideoBookmarks = pgTable(
  "lesson_video_bookmarks",
  {
    organizationId: organizationId(),
    bookmarkId: text("bookmark_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    lessonId: text("lesson_id").notNull(),
    batchId: text("batch_id").notNull(),
    timestampSeconds: integer("timestamp_seconds").notNull(),
    note: text("note"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    userLessonIdx: index("lesson_video_bookmarks_user_lesson_idx").on(
      table.userId,
      table.lessonId,
      table.timestampSeconds,
    ),
    userBatchIdx: index("lesson_video_bookmarks_user_batch_idx").on(
      table.userId,
      table.batchId,
      table.createdAt,
    ),
  }),
);

export const lessonBookmarks = pgTable(
  "lesson_bookmarks",
  {
    organizationId: organizationId(),
    bookmarkId: text("bookmark_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    lessonId: text("lesson_id").notNull(),
    batchId: text("batch_id").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    onePerLesson: unique("lesson_bookmarks_user_lesson_unique").on(
      table.userId,
      table.lessonId,
    ),
    userRecencyIdx: index("lesson_bookmarks_user_recency_idx").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const lessonNotes = pgTable(
  "lesson_notes",
  {
    organizationId: organizationId(),
    noteId: text("note_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    lessonId: text("lesson_id").notNull(),
    batchId: text("batch_id").notNull(),
    body: text("body").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerLesson: unique("lesson_notes_user_lesson_unique").on(
      table.userId,
      table.lessonId,
    ),
    userBatchIdx: index("lesson_notes_user_batch_idx").on(
      table.userId,
      table.batchId,
      table.updatedAt,
    ),
  }),
);

export const documentAnnotations = pgTable(
  "document_annotations",
  {
    organizationId: organizationId(),
    annotationId: text("annotation_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    lessonId: text("lesson_id").notNull(),
    batchId: text("batch_id").notNull(),
    documentVersion: integer("document_version").notNull(),
    page: integer("page").notNull(),
    startOffset: integer("start_offset").notNull(),
    endOffset: integer("end_offset").notNull(),
    quotedText: text("quoted_text").notNull(),
    note: text("note"),
    colour: text("colour"),
    state: documentAnnotationStateEnum("state").notNull().default("ANCHORED"),
    orphanedAt: timestamp("orphaned_at"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    userLessonIdx: index("document_annotations_user_lesson_idx").on(
      table.userId,
      table.lessonId,
      table.page,
    ),
    lessonVersionIdx: index("document_annotations_lesson_version_idx").on(
      table.lessonId,
      table.documentVersion,
    ),
  }),
);

export const lessonInlineAnswers = pgTable(
  "lesson_inline_answers",
  {
    organizationId: organizationId(),
    inlineAnswerId: text("inline_answer_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    lessonId: text("lesson_id").notNull(),
    batchId: text("batch_id").notNull(),
    questionId: text("question_id").notNull(),
    response: jsonb("response").$type<unknown>(),
    outcome: text("outcome").notNull(),
    attemptCount: integer("attempt_count").notNull().default(1),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerQuestion: unique("lesson_inline_answers_user_question_unique").on(
      table.userId,
      table.lessonId,
      table.questionId,
    ),
    lessonIdx: index("lesson_inline_answers_lesson_idx").on(table.lessonId),
  }),
);

export const curriculumTestPlacements = pgTable(
  "curriculum_test_placements",
  {
    organizationId: organizationId(),
    placementId: text("placement_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    subjectId: text("subject_id").notNull(),
    batchId: text("batch_id").notNull(),
    kind: curriculumItemKindEnum("kind").notNull().default("TEST"),
    testId: text("test_id").notNull(),
    order: integer("order").notNull(),
    unlockAt: timestamp("unlock_at"),
    unlockAfterDays: integer("unlock_after_days"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    testPerSubject: unique("curriculum_test_placements_subject_test_unique").on(
      table.subjectId,
      table.testId,
    ),
    subjectOrderIdx: index("curriculum_test_placements_subject_order_idx").on(
      table.subjectId,
      table.order,
    ),
    batchIdx: index("curriculum_test_placements_batch_idx").on(table.batchId),
  }),
);

export type RichLessonBlock =
  | ContentBlock
  | { type: "TABLE"; headers: string[]; rows: string[][] }
  | { type: "QUESTION"; questionId: string };

export const richLessonContent = pgTable(
  "rich_lesson_content",
  {
    organizationId: organizationId(),
    richContentId: text("rich_content_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    lessonId: text("lesson_id").notNull(),
    blocks: jsonb("blocks").$type<RichLessonBlock[]>().notNull(),
    inlineQuestionIds: jsonb("inline_question_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerLesson: unique("rich_lesson_content_lesson_unique").on(table.lessonId),
  }),
);
