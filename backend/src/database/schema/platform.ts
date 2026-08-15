import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { badgeCriteriaEnum } from "./enums";

export const locations = pgTable(
  "locations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    dialCode: text("dial_code"),
    currency: text("currency"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: index("locations_code_idx").on(table.code),
  }),
);

/** UI languages offered to visitors (the /languages screen). */
export const siteLanguages = pgTable(
  "site_languages",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: index("site_languages_code_idx").on(table.code),
  }),
);

export const instructorBadges = pgTable(
  "instructor_badges",
  {
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
