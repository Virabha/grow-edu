import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { organizationId } from "./organizations";

export const categories = pgTable(
  "categories",
  {
    organizationId: organizationId(),
    categoryId: text("category_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    parentCategoryId: text("parent_category_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    isDeleted: boolean("is_deleted").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index("categories_slug_idx").on(table.slug),
    slugPerOrg: unique("categories_organization_slug_unique").on(
      table.organizationId,
      table.slug,
    ),
    isActiveIdx: index("categories_is_active_idx").on(table.isActive),
    parentIdx: index("categories_parent_idx").on(table.parentCategoryId),
  }),
);
