import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { blogPostStatusEnum } from "./enums";
import { organizationId } from "./organizations";

// =============================================
// CMS / LANDING PAGE TABLES
// =============================================

export const banners = pgTable(
  "banners",
  {
    organizationId: organizationId(),
    bannerId: text("banner_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    description: text("description"),
    imageUrl: text("image_url").notNull(),
    overlayColor: text("overlay_color").default("rgba(0,0,0,0.4)"),
    overlayOpacity: integer("overlay_opacity").default(40),
    textColor: text("text_color").default("#ffffff"),
    textAlign: text("text_align").default("left"),
    ctaText: text("cta_text"),
    ctaLink: text("cta_link"),
    ctaStyle: text("cta_style").default("primary"),
    secondaryCtaText: text("secondary_cta_text"),
    secondaryCtaLink: text("secondary_cta_link"),
    badgeText: text("badge_text"),
    badgeColor: text("badge_color"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    displayOrderIdx: index("banners_display_order_idx").on(table.displayOrder),
    isActiveIdx: index("banners_is_active_idx").on(table.isActive),
  })
);

export const faqs = pgTable(
  "faqs",
  {
    organizationId: organizationId(),
    faqId: text("faq_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    displayOrderIdx: index("faqs_display_order_idx").on(table.displayOrder),
    isActiveIdx: index("faqs_is_active_idx").on(table.isActive),
  })
);

export const whyChooseUs = pgTable(
  "why_choose_us",
  {
    organizationId: organizationId(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    iconName: text("icon_name").notNull(),
    iconColor: text("icon_color"),
    iconBg: text("icon_bg"),
    title: text("title").notNull(),
    description: text("description"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    displayOrderIdx: index("why_choose_us_display_order_idx").on(table.displayOrder),
    isActiveIdx: index("why_choose_us_is_active_idx").on(table.isActive),
  })
);

export const testimonials = pgTable(
  "testimonials",
  {
    organizationId: organizationId(),
    testimonialId: text("testimonial_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    role: text("role"),
    company: text("company"),
    rating: integer("rating").notNull().default(5),
    text: text("text").notNull(),
    course: text("course"),
    avatarUrl: text("avatar_url"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    displayOrderIdx: index("testimonials_display_order_idx").on(table.displayOrder),
    isActiveIdx: index("testimonials_is_active_idx").on(table.isActive),
  })
);

export const siteSettings = pgTable(
  "site_settings",
  {
    organizationId: organizationId(),
    settingId: text("setting_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    keyIdx: index("site_settings_key_idx").on(table.key),
    keyPerOrg: unique("site_settings_organization_key_unique").on(
      table.organizationId,
      table.key
    ),
  })
);

export const brands = pgTable(
  "brands",
  {
    organizationId: organizationId(),
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    logoUrl: text("logo_url"),
    websiteUrl: text("website_url"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index("brands_display_order_idx").on(table.displayOrder),
    activeIdx: index("brands_is_active_idx").on(table.isActive),
  }),
);

export const socialLinks = pgTable(
  "social_links",
  {
    organizationId: organizationId(),
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    platform: text("platform").notNull(),
    url: text("url"),
    icon: text("icon"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index("social_links_display_order_idx").on(table.displayOrder),
  }),
);

export const blogCategories = pgTable(
  "blog_categories",
  {
    organizationId: organizationId(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    slugKey: uniqueIndex("blog_categories_slug_key").on(
      table.organizationId,
      table.slug,
    ),
  }),
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    organizationId: organizationId(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    categoryId: text("category_id"),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt"),
    content: text("content").notNull(),
    coverImageUrl: text("cover_image_url"),
    authorName: text("author_name"),
    authorUserId: text("author_user_id"),
    status: blogPostStatusEnum("status").notNull().default("DRAFT"),
    tags: jsonb("tags").$type<string[]>().default([]),
    viewCount: integer("view_count").notNull().default(0),
    publishedAt: timestamp("published_at"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    categoryIdx: index("blog_posts_category_idx").on(table.categoryId),
    statusIdx: index("blog_posts_status_idx").on(table.status, table.publishedAt),
    slugKey: uniqueIndex("blog_posts_slug_key").on(
      table.organizationId,
      table.slug,
    ),
  }),
);

export const certificateTemplates = pgTable(
  "certificate_templates",
  {
    organizationId: organizationId(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    scope: text("scope").notNull().default("default"),
    backgroundUrl: text("background_url").notNull().default(""),
    signatureUrl: text("signature_url").notNull().default(""),
    signatoryName: text("signatory_name").notNull().default(""),
    signatoryTitle: text("signatory_title").notNull().default(""),
    bodyText: text("body_text").notNull().default(""),
    showQrCode: boolean("show_qr_code").notNull().default(true),
    showCertificateId: boolean("show_certificate_id").notNull().default(true),
    accentColour: text("accent_colour").notNull().default("#2563eb"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    scopeKey: uniqueIndex("certificate_templates_scope_key").on(
      table.organizationId,
      table.scope,
    ),
  }),
);
