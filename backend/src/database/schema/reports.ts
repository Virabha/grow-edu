import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organizationId } from "./organizations";

export const exportJobs = pgTable(
  "export_jobs",
  {
    organizationId: organizationId(),
    exportJobId: text("export_job_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contractId: text("contract_id").notNull(),
    requestedBy: text("requested_by").notNull(),
    reportType: text("report_type").notNull(),
    subGroupId: text("sub_group_id"),
    status: text("status").notNull().default("PENDING"),
    failureReason: text("failure_reason"),
    exportData: jsonb("export_data"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    contractIdx: index("export_jobs_contract_idx").on(table.contractId),
    requestedByIdx: index("export_jobs_requested_by_idx").on(table.requestedBy),
    statusIdx: index("export_jobs_status_idx").on(table.status),
  }),
);

export const reportSchedules = pgTable(
  "report_schedules",
  {
    organizationId: organizationId(),
    scheduleId: text("schedule_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    contractId: text("contract_id").notNull(),
    recipientId: text("recipient_id").notNull(),
    reportType: text("report_type").notNull(),
    subGroupId: text("sub_group_id"),
    cadence: text("cadence").notNull(),
    isPaused: boolean("is_paused").notNull().default(false),
    nextRunAt: timestamp("next_run_at").notNull(),
    lastRunAt: timestamp("last_run_at"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    dueIdx: index("report_schedules_due_idx").on(
      table.isPaused,
      table.nextRunAt,
    ),
    recipientIdx: index("report_schedules_recipient_idx").on(
      table.recipientId,
    ),
    contractIdx: index("report_schedules_contract_idx").on(table.contractId),
  }),
);
