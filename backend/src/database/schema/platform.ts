import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { badgeCriteriaEnum } from "./enums";
import { organizationId } from "./organizations";

export const instructorBadges = pgTable(
  "instructor_badges",
  {
    organizationId: organizationId(),
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description").notNull(),
    icon: text("icon"),
    colour: text("colour"),
    criteriaType: badgeCriteriaEnum("criteria_type").notNull().default("MANUAL"),
    criteriaValue: integer("criteria_value"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    activeIdx: index("instructor_badges_is_active_idx").on(table.isActive),
  }),
);
