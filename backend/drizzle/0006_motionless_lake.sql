DO $$ BEGIN
 CREATE TYPE "coupon_usage_status" AS ENUM('RESERVED', 'CONSUMED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "discount_type" AS ENUM('PERCENTAGE', 'FIXED_AMOUNT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "teacher_application_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "banners" (
	"banner_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text NOT NULL,
	"cta_text" text,
	"cta_link" text,
	"badge_text" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_categories" (
	"coupon_category_id" text PRIMARY KEY NOT NULL,
	"coupon_id" text NOT NULL,
	"category_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_categories_unique" UNIQUE("coupon_id","category_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_courses" (
	"coupon_course_id" text PRIMARY KEY NOT NULL,
	"coupon_id" text NOT NULL,
	"course_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_courses_unique" UNIQUE("coupon_id","course_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon_usages" (
	"usage_id" text PRIMARY KEY NOT NULL,
	"coupon_id" text NOT NULL,
	"user_id" text NOT NULL,
	"payment_id" text,
	"course_id" text,
	"status" "coupon_usage_status" DEFAULT 'CONSUMED' NOT NULL,
	"reserved_expires_at" timestamp,
	"consumed_at" timestamp,
	"cancelled_at" timestamp,
	"discount_applied" numeric(10, 2) NOT NULL,
	"original_amount" numeric(10, 2) NOT NULL,
	"final_amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupons" (
	"coupon_id" text PRIMARY KEY NOT NULL,
	"coupon_code" text NOT NULL,
	"discount_type" "discount_type" DEFAULT 'PERCENTAGE' NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"max_discount_amount" numeric(10, 2),
	"min_purchase_amount" numeric(10, 2),
	"valid_from" timestamp DEFAULT now() NOT NULL,
	"valid_till" timestamp NOT NULL,
	"usage_limit" integer,
	"usage_limit_per_user" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faqs" (
	"faq_id" text PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "instructor_profiles" (
	"profile_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bio" text,
	"expertise" jsonb,
	"experience" text,
	"education" text,
	"avatar_url" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "instructor_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "services" (
	"service_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_url" text,
	"icon_name" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_settings" (
	"setting_id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teacher_applications" (
	"application_id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"experience_years" integer,
	"skills" jsonb,
	"categories" jsonb,
	"cv_url" text,
	"why_join" text,
	"status" "teacher_application_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "testimonials" (
	"testimonial_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"company" text,
	"rating" integer DEFAULT 5 NOT NULL,
	"text" text NOT NULL,
	"course" text,
	"avatar_url" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "why_choose_us" (
	"id" text PRIMARY KEY NOT NULL,
	"icon_name" text NOT NULL,
	"icon_color" text,
	"icon_bg" text,
	"title" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "currency" SET DEFAULT 'AED';--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "compare_at_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "original_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "discount_amount" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "coupon_id" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "banners_display_order_idx" ON "banners" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "banners_is_active_idx" ON "banners" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_categories_coupon_idx" ON "coupon_categories" ("coupon_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_categories_category_idx" ON "coupon_categories" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_courses_coupon_idx" ON "coupon_courses" ("coupon_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_courses_course_idx" ON "coupon_courses" ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_usages_coupon_idx" ON "coupon_usages" ("coupon_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_usages_user_idx" ON "coupon_usages" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_usages_coupon_user_idx" ON "coupon_usages" ("coupon_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_usages_payment_idx" ON "coupon_usages" ("payment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_usages_coupon_status_idx" ON "coupon_usages" ("coupon_id","status","reserved_expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_usages_coupon_user_status_idx" ON "coupon_usages" ("coupon_id","user_id","status","reserved_expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupons_code_lookup_idx" ON "coupons" ("coupon_code","is_active","is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupons_is_active_idx" ON "coupons" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupons_valid_till_idx" ON "coupons" ("valid_till");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faqs_display_order_idx" ON "faqs" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faqs_is_active_idx" ON "faqs" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instructor_profiles_user_id_idx" ON "instructor_profiles" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instructor_profiles_display_order_idx" ON "instructor_profiles" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instructor_profiles_is_active_idx" ON "instructor_profiles" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_slug_idx" ON "services" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_display_order_idx" ON "services" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_is_active_idx" ON "services" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_settings_key_idx" ON "site_settings" ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_applications_status_idx" ON "teacher_applications" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_applications_email_idx" ON "teacher_applications" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teacher_applications_created_at_idx" ON "teacher_applications" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testimonials_display_order_idx" ON "testimonials" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testimonials_is_active_idx" ON "testimonials" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "why_choose_us_display_order_idx" ON "why_choose_us" ("display_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "why_choose_us_is_active_idx" ON "why_choose_us" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_is_active_idx" ON "categories" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_coupon_idx" ON "payments" ("coupon_id");