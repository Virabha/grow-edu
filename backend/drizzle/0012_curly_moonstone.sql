DO $$ BEGIN
 CREATE TYPE "book_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "book_purchases" (
	"purchase_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"book_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"gateway" "payment_gateway" NOT NULL,
	"gateway_id" text,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "book_purchases_user_book_unique" UNIQUE("user_id","book_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "books" (
	"book_id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"author" text NOT NULL,
	"description" text,
	"short_description" text,
	"cover_image" text,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"compare_at_price" numeric(10, 2),
	"currency" text DEFAULT 'INR' NOT NULL,
	"category_id" text,
	"isbn" text,
	"pages" integer,
	"language" text DEFAULT 'English',
	"publisher" text,
	"published_year" integer,
	"format" text DEFAULT 'PHYSICAL',
	"download_url" text,
	"status" "book_status" DEFAULT 'DRAFT' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "books_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "screenshots" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "book_purchases_user_idx" ON "book_purchases" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "book_purchases_book_idx" ON "book_purchases" ("book_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "book_purchases_status_idx" ON "book_purchases" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "books_slug_idx" ON "books" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "books_category_idx" ON "books" ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "books_status_idx" ON "books" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "books_is_active_idx" ON "books" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "books_display_order_idx" ON "books" ("display_order");