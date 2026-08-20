import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

export const organizations = pgTable(
  "organizations",
  {
    organizationId: text("organization_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index("organizations_slug_idx").on(table.slug),
  }),
);

export const organizationId = () =>
  text("organization_id").notNull().default(DEFAULT_ORGANIZATION_ID);
