import {
  pgTable,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const companies = pgTable(
  "companies",
  {
    companyId: text("company_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("companies_name_idx").on(table.name),
  })
);
