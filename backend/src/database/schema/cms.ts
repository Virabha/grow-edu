import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// =============================================
// CMS / LANDING PAGE TABLES
// =============================================

export const banners = pgTable(
  "banners",
  {
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
    settingId: text("setting_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    key: text("key").notNull().unique(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    keyIdx: index("site_settings_key_idx").on(table.key),
  })
);

export const brands = pgTable(
  "brands",
  {
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
