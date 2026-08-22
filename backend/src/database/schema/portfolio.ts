import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { portfolioItemKindEnum } from "./enums";
import { organizationId } from "./organizations";

export const portfolios = pgTable(
  "portfolios",
  {
    organizationId: organizationId(),
    portfolioId: text("portfolio_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    handle: text("handle").notNull(),
    displayName: text("display_name"),
    headline: text("headline"),
    bio: text("bio"),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerUser: unique("portfolios_user_unique").on(table.userId),
    handleUnique: unique("portfolios_handle_unique").on(table.handle),
  }),
);

export const portfolioItems = pgTable(
  "portfolio_items",
  {
    organizationId: organizationId(),
    itemId: text("item_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    portfolioId: text("portfolio_id").notNull(),
    userId: text("user_id").notNull(),
    kind: portfolioItemKindEnum("kind").notNull(),
    referenceId: text("reference_id").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    publishedAt: timestamp("published_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    oneItem: unique("portfolio_items_unique").on(
      table.portfolioId,
      table.kind,
      table.referenceId,
    ),
    portfolioIdx: index("portfolio_items_portfolio_idx").on(
      table.portfolioId,
      table.publishedAt,
    ),
  }),
);
