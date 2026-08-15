DO $$ BEGIN
  CREATE TYPE student_review_status AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE blog_post_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS course_reviews (
  review_id             text PRIMARY KEY,
  course_id             text NOT NULL,
  user_id               text NOT NULL,
  rating                integer NOT NULL,
  title                 text,
  body                  text NOT NULL,
  status                student_review_status NOT NULL DEFAULT 'PENDING',
  moderated_by          text,
  moderated_at          timestamp,
  instructor_reply      text,
  instructor_replied_at timestamp,
  is_deleted            boolean NOT NULL DEFAULT false,
  created_at            timestamp NOT NULL DEFAULT now(),
  updated_at            timestamp NOT NULL DEFAULT now(),
  CONSTRAINT course_reviews_rating_range CHECK (rating BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS course_reviews_course_status_idx ON course_reviews (course_id, status, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS course_reviews_user_idx ON course_reviews (user_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS course_reviews_status_idx ON course_reviews (status, created_at);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS course_reviews_course_user_key ON course_reviews (course_id, user_id);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS blog_categories (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  slug          text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  is_deleted    boolean NOT NULL DEFAULT false,
  created_at    timestamp NOT NULL DEFAULT now(),
  updated_at    timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS blog_categories_slug_key ON blog_categories (slug);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS blog_posts (
  id              text PRIMARY KEY,
  category_id     text,
  title           text NOT NULL,
  slug            text NOT NULL,
  excerpt         text,
  content         text NOT NULL,
  cover_image_url text,
  author_name     text,
  author_user_id  text,
  status          blog_post_status NOT NULL DEFAULT 'DRAFT',
  tags            jsonb DEFAULT '[]'::jsonb,
  view_count      integer NOT NULL DEFAULT 0,
  published_at    timestamp,
  is_deleted      boolean NOT NULL DEFAULT false,
  created_at      timestamp NOT NULL DEFAULT now(),
  updated_at      timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS blog_posts_category_idx ON blog_posts (category_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS blog_posts_status_idx ON blog_posts (status, published_at);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_slug_key ON blog_posts (slug);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS certificate_templates (
  id                  text PRIMARY KEY,
  scope               text NOT NULL DEFAULT 'default',
  background_url      text NOT NULL DEFAULT '',
  signature_url       text NOT NULL DEFAULT '',
  signatory_name      text NOT NULL DEFAULT '',
  signatory_title     text NOT NULL DEFAULT '',
  body_text           text NOT NULL DEFAULT '',
  show_qr_code        boolean NOT NULL DEFAULT true,
  show_certificate_id boolean NOT NULL DEFAULT true,
  accent_colour       text NOT NULL DEFAULT '#2563eb',
  created_at          timestamp NOT NULL DEFAULT now(),
  updated_at          timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS certificate_templates_scope_key ON certificate_templates (scope);
