import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";

import { organizationId } from "./organizations";

export interface StudyPlanItem {
  kind: string;
  title: string;
  durationMinutes: number;
  rationale: string;
}

export interface StudyPlanInputs {
  goalKey: string | null;
  levelKey: string | null;
  availableMinutesPerDay: number;
  weakTopicCount: number;
  reviewItemsDue: number;
  upcomingTestCount: number;
}

export const studentStudyPreferences = pgTable(
  "student_study_preferences",
  {
    organizationId: organizationId(),
    preferenceId: text("preference_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    availableMinutesPerDay: integer("available_minutes_per_day")
      .notNull()
      .default(60),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerUser: unique("student_study_preferences_user_unique").on(table.userId),
  }),
);

export const aiStudyPlans = pgTable(
  "ai_study_plans",
  {
    organizationId: organizationId(),
    planId: text("plan_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    summary: text("summary").notNull(),
    items: jsonb("items").$type<StudyPlanItem[]>().notNull().default([]),
    inputs: jsonb("inputs").$type<StudyPlanInputs>().notNull(),
    generatedAt: timestamp("generated_at").notNull(),
    supersededAt: timestamp("superseded_at"),
  },
  (table) => ({
    activeIdx: index("ai_study_plans_active_idx").on(
      table.userId,
      table.supersededAt,
    ),
  }),
);
