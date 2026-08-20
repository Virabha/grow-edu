import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { applicationStatusEnum } from "./enums";
import { organizationId } from "./organizations";

export const services = pgTable(
  "services",
  {
    organizationId: organizationId(),
    serviceId: text("service_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
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
    slugPerOrg: unique("services_organization_slug_unique").on(
      table.organizationId,
      table.slug,
    ),
    displayOrderIdx: index("services_display_order_idx").on(table.displayOrder),
    isActiveIdx: index("services_is_active_idx").on(table.isActive),
  })
);

export const serviceApplications = pgTable(
  "service_applications",
  {
    organizationId: organizationId(),
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
