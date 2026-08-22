import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organizationId } from "./organizations";

export const auditLog = pgTable(
  "audit_log",
  {
    organizationId: organizationId(),
    auditId: text("audit_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    actorId: text("actor_id"),
    actorRole: text("actor_role"),
    impersonatorId: text("impersonator_id"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    before: jsonb("before").$type<Record<string, unknown>>(),
    after: jsonb("after").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    actorIdx: index("audit_log_actor_idx").on(table.actorId, table.createdAt),
    targetIdx: index("audit_log_target_idx").on(
      table.targetType,
      table.targetId,
      table.createdAt,
    ),
    actionIdx: index("audit_log_action_idx").on(table.action, table.createdAt),
    createdAtIdx: index("audit_log_created_at_idx").on(table.createdAt),
  }),
);
