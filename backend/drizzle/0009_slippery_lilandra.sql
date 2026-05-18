CREATE TABLE IF NOT EXISTS "contact_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_name_unique";--> statement-breakpoint
ALTER TABLE "cart_items" ALTER COLUMN "currency" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "currency" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "subtitle" text;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "overlay_color" text DEFAULT 'rgba(0,0,0,0.4)';--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "overlay_opacity" integer DEFAULT 40;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "text_color" text DEFAULT '#ffffff';--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "text_align" text DEFAULT 'left';--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "cta_style" text DEFAULT 'primary';--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "secondary_cta_text" text;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "secondary_cta_link" text;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "badge_color" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "parent_category_id" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_image" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_submissions_email_idx" ON "contact_submissions" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_submissions_created_at_idx" ON "contact_submissions" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "newsletter_subscribers_email_idx" ON "newsletter_subscribers" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "newsletter_subscribers_is_active_idx" ON "newsletter_subscribers" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_parent_idx" ON "categories" ("parent_category_id");