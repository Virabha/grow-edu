import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";
import {
  communityAuthorKindEnum,
  contentReportStatusEnum,
  contentReportTargetEnum,
} from "./enums";
import { organizationId } from "./organizations";

export const batchFeedPosts = pgTable(
  "batch_feed_posts",
  {
    organizationId: organizationId(),
    postId: text("post_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull(),
    parentPostId: text("parent_post_id"),
    authorId: text("author_id").notNull(),
    authorKind: communityAuthorKindEnum("author_kind").notNull(),
    body: text("body").notNull(),
    replyCount: integer("reply_count").notNull().default(0),
    removedAt: timestamp("removed_at"),
    removedBy: text("removed_by"),
    removalReason: text("removal_reason"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    batchIdx: index("batch_feed_posts_batch_idx").on(
      table.batchId,
      table.createdAt,
    ),
    parentIdx: index("batch_feed_posts_parent_idx").on(
      table.parentPostId,
      table.createdAt,
    ),
    authorIdx: index("batch_feed_posts_author_idx").on(table.authorId),
  }),
);

export const studyGroups = pgTable(
  "study_groups",
  {
    organizationId: organizationId(),
    groupId: text("group_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    memberCap: integer("member_cap").notNull(),
    createdBy: text("created_by").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    batchIdx: index("study_groups_batch_idx").on(table.batchId, table.createdAt),
    namePerBatch: unique("study_groups_batch_name_unique").on(
      table.batchId,
      table.name,
    ),
  }),
);

export const studyGroupMembers = pgTable(
  "study_group_members",
  {
    organizationId: organizationId(),
    membershipId: text("membership_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    groupId: text("group_id").notNull(),
    batchId: text("batch_id").notNull(),
    userId: text("user_id").notNull(),
    joinedAt: timestamp("joined_at").notNull(),
  },
  (table) => ({
    oneMembership: unique("study_group_members_group_user_unique").on(
      table.groupId,
      table.userId,
    ),
    userIdx: index("study_group_members_user_idx").on(table.userId),
  }),
);

export const studyGroupMessages = pgTable(
  "study_group_messages",
  {
    organizationId: organizationId(),
    messageId: text("message_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    groupId: text("group_id").notNull(),
    batchId: text("batch_id").notNull(),
    authorId: text("author_id").notNull(),
    authorKind: communityAuthorKindEnum("author_kind").notNull(),
    body: text("body").notNull(),
    removedAt: timestamp("removed_at"),
    removedBy: text("removed_by"),
    removalReason: text("removal_reason"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    groupIdx: index("study_group_messages_group_idx").on(
      table.groupId,
      table.createdAt,
    ),
  }),
);

export const contentReports = pgTable(
  "content_reports",
  {
    organizationId: organizationId(),
    reportId: text("report_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    batchId: text("batch_id").notNull(),
    targetKind: contentReportTargetEnum("target_kind").notNull(),
    targetId: text("target_id").notNull(),
    reportedBy: text("reported_by").notNull(),
    reason: text("reason").notNull(),
    status: contentReportStatusEnum("status").notNull().default("OPEN"),
    outcome: text("outcome"),
    resolvedBy: text("resolved_by"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    oneReportPerReporter: unique("content_reports_reporter_target_unique").on(
      table.reportedBy,
      table.targetKind,
      table.targetId,
    ),
    queueIdx: index("content_reports_queue_idx").on(
      table.batchId,
      table.status,
      table.createdAt,
    ),
    targetIdx: index("content_reports_target_idx").on(
      table.targetKind,
      table.targetId,
    ),
  }),
);
