DO $$ BEGIN
  CREATE TYPE enrollment_source AS ENUM ('SELF_PURCHASE', 'ADMIN_GRANT', 'COMPANY_ASSIGNMENT', 'FREE_COURSE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

ALTER TABLE users ADD COLUMN IF NOT EXISTS headline text;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line text;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS city text;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS state text;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS country text;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code text;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS social jsonb DEFAULT '{}'::jsonb;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS user_devices (
  device_id    text PRIMARY KEY,
  user_id      text NOT NULL,
  label        text,
  user_agent   text,
  ip_address   text,
  last_seen_at timestamp NOT NULL DEFAULT now(),
  revoked_at   timestamp,
  created_at   timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS user_devices_user_idx ON user_devices (user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS user_devices_user_last_seen_idx ON user_devices (user_id, last_seen_at);
--> statement-breakpoint

-- `enrollments` belongs to the application schema in backend/drizzle, not to
-- the tenancy schema. It is absent on the tenancy CI job, where these columns
-- have nothing to attach to and the run must continue regardless.
DO $$
BEGIN
  IF to_regclass('public.enrollments') IS NULL THEN
    RAISE NOTICE 'skipping enrollments columns in 0006: table "enrollments" is absent (application schema not applied)';
    RETURN;
  END IF;

  ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS source enrollment_source NOT NULL DEFAULT 'SELF_PURCHASE';
  ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS granted_by text;
  CREATE INDEX IF NOT EXISTS enrollments_source_idx ON enrollments (source, enrolled_at);
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS lesson_quiz_attempts (
  attempt_id       text PRIMARY KEY,
  user_id          text NOT NULL,
  course_id        text NOT NULL,
  lesson_id        text NOT NULL,
  quiz_version     integer NOT NULL DEFAULT 1,
  attempt_no       integer NOT NULL DEFAULT 1,
  total_questions  integer NOT NULL DEFAULT 0,
  correct_count    integer NOT NULL DEFAULT 0,
  score_percent    numeric(5, 2) NOT NULL DEFAULT '0',
  pass_mark        integer NOT NULL DEFAULT 0,
  passed           boolean NOT NULL DEFAULT false,
  duration_seconds integer NOT NULL DEFAULT 0,
  answers          jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at       timestamp NOT NULL DEFAULT now(),
  submitted_at     timestamp,
  created_at       timestamp NOT NULL DEFAULT now(),
  updated_at       timestamp NOT NULL DEFAULT now(),
  CONSTRAINT lesson_quiz_attempts_user_lesson_no_unique UNIQUE (user_id, lesson_id, attempt_no)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS lesson_quiz_attempts_user_submitted_idx ON lesson_quiz_attempts (user_id, submitted_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS lesson_quiz_attempts_user_lesson_idx ON lesson_quiz_attempts (user_id, lesson_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS lesson_quiz_attempts_lesson_idx ON lesson_quiz_attempts (lesson_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS lesson_quiz_attempts_course_idx ON lesson_quiz_attempts (course_id);
