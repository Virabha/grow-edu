import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { devEnvironmentStatusEnum } from "./enums";
import { organizationId } from "./organizations";

export const devEnvironments = pgTable(
  "dev_environments",
  {
    organizationId: organizationId(),
    environmentId: text("environment_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    pathId: text("path_id").notNull(),
    stageId: text("stage_id").notNull(),
    projectId: text("project_id").notNull(),
    providerRef: text("provider_ref"),
    workspaceRef: text("workspace_ref"),
    status: devEnvironmentStatusEnum("status").notNull().default("PROVISIONING"),
    cpuLimit: integer("cpu_limit").notNull(),
    memoryLimitMb: integer("memory_limit_mb").notNull(),
    egressPolicy: jsonb("egress_policy").$type<string[]>().notNull(),
    failureReason: text("failure_reason"),
    lastActiveAt: timestamp("last_active_at").notNull(),
    hibernatedAt: timestamp("hibernated_at"),
    reclaimedAt: timestamp("reclaimed_at"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerStage: unique("dev_environments_user_stage_unique").on(
      table.userId,
      table.stageId,
    ),
    liveIdx: index("dev_environments_live_idx").on(
      table.status,
      table.lastActiveAt,
    ),
    userIdx: index("dev_environments_user_idx").on(table.userId, table.status),
  }),
);

export const devEnvironmentUsage = pgTable(
  "dev_environment_usage",
  {
    organizationId: organizationId(),
    usageId: text("usage_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    environmentId: text("environment_id").notNull(),
    userId: text("user_id").notNull(),
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at"),
    runningSeconds: integer("running_seconds").notNull().default(0),
  },
  (table) => ({
    environmentIdx: index("dev_environment_usage_environment_idx").on(
      table.environmentId,
      table.startedAt,
    ),
    userIdx: index("dev_environment_usage_user_idx").on(
      table.userId,
      table.startedAt,
    ),
  }),
);
