import {
  pgTable,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import {
  bookStatusEnum,
  paymentGatewayEnum,
  paymentStatusEnum,
  applicationStatusEnum,
} from "./enums";

export const books = pgTable(
  "books",
  {
    bookId: text("book_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    author: text("author").notNull(),
    description: text("description"),
    shortDescription: text("short_description"),
    coverImage: text("cover_image"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
    compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
    currency: text("currency").notNull().default("INR"),
    categoryId: text("category_id"),
    isbn: text("isbn"),
    pages: integer("pages"),
    language: text("language").default("English"),
    publisher: text("publisher"),
    publishedYear: integer("published_year"),
    format: text("format").default("PHYSICAL"),
    downloadUrl: text("download_url"),
    status: bookStatusEnum("status").notNull().default("DRAFT"),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index("books_slug_idx").on(table.slug),
    categoryIdx: index("books_category_idx").on(table.categoryId),
    statusIdx: index("books_status_idx").on(table.status),
    isActiveIdx: index("books_is_active_idx").on(table.isActive),
    displayOrderIdx: index("books_display_order_idx").on(table.displayOrder),
  })
);

export const bookPurchases = pgTable(
  "book_purchases",
  {
    purchaseId: text("purchase_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull(),
    bookId: text("book_id").notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("INR"),
    gateway: paymentGatewayEnum("gateway").notNull(),
    gatewayId: text("gateway_id"),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("book_purchases_user_idx").on(table.userId),
    bookIdx: index("book_purchases_book_idx").on(table.bookId),
    statusIdx: index("book_purchases_status_idx").on(table.status),
    userBookUnique: unique("book_purchases_user_book_unique").on(
      table.userId,
      table.bookId
    ),
  })
);

export const services = pgTable(
  "services",
  {
    serviceId: text("service_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    imageUrl: text("image_url"),
    screenshots: jsonb("screenshots").$type<string[]>().default([]),
    iconName: text("icon_name"),
    formSchema: jsonb("form_schema"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index("services_slug_idx").on(table.slug),
    displayOrderIdx: index("services_display_order_idx").on(table.displayOrder),
    isActiveIdx: index("services_is_active_idx").on(table.isActive),
  })
);

export const serviceApplications = pgTable(
  "service_applications",
  {
    applicationId: text("application_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    serviceId: text("service_id").notNull(),
    formData: jsonb("form_data").notNull(),
    applicantName: text("applicant_name").notNull(),
    applicantEmail: text("applicant_email").notNull(),
    applicantPhone: text("applicant_phone"),
    status: applicationStatusEnum("status").notNull().default("NEW"),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    serviceIdx: index("service_applications_service_idx").on(table.serviceId),
    statusIdx: index("service_applications_status_idx").on(table.status),
    emailIdx: index("service_applications_email_idx").on(table.applicantEmail),
    createdAtIdx: index("service_applications_created_at_idx").on(table.createdAt),
  })
);
