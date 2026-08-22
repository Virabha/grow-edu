import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { funnelEventKindEnum } from "./enums";
import { organizationId } from "./organizations";

export const funnelEvents = pgTable(
  "funnel_events",
  {
    organizationId: organizationId(),
    eventId: text("event_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    kind: funnelEventKindEnum("kind").notNull(),
    batchId: text("batch_id"),
    source: text("source"),
    sessionKey: text("session_key"),
    userId: text("user_id"),
    capturedAt: timestamp("captured_at").notNull(),
  },
  (table) => ({
    kindIdx: index("funnel_events_kind_idx").on(table.kind),
    capturedAtIdx: index("funnel_events_captured_at_idx").on(table.capturedAt),
    sourceIdx: index("funnel_events_source_idx").on(table.source),
    batchIdx: index("funnel_events_batch_idx").on(table.batchId),
  }),
);

export const savedReports = pgTable(
  "saved_reports",
  {
    organizationId: organizationId(),
    reportId: text("report_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    createdBy: text("created_by").notNull(),
    definition: jsonb("definition").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    createdByIdx: index("saved_reports_created_by_idx").on(table.createdBy),
  }),
);

export const reportShares = pgTable(
  "report_shares",
  {
    organizationId: organizationId(),
    shareId: text("share_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    reportId: text("report_id").notNull(),
    grantedTo: text("granted_to").notNull(),
    grantedBy: text("granted_by").notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    reportIdx: index("report_shares_report_idx").on(table.reportId),
    grantedToIdx: index("report_shares_granted_to_idx").on(table.grantedTo),
  }),
);

export const retentionCohortRows = pgTable(
  "retention_cohort_rows",
  {
    organizationId: organizationId(),
    rowId: text("row_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    cohortMonth: text("cohort_month").notNull(),
    source: text("source"),
    companyId: text("company_id"),
    periodOffset: integer("period_offset").notNull(),
    activeCount: integer("active_count").notNull(),
    computedAt: timestamp("computed_at").notNull(),
  },
  (table) => ({
    cohortIdx: index("retention_cohort_rows_cohort_idx").on(table.cohortMonth),
    computedAtIdx: index("retention_cohort_rows_computed_at_idx").on(
      table.computedAt,
    ),
  }),
);
