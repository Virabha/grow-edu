DO $$ BEGIN
  CREATE TYPE assignment_submission_type AS ENUM ('FILE', 'TEXT', 'LINK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE assignment_submission_status AS ENUM ('SUBMITTED', 'GRADED', 'RETURNED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS assignments (
  id                 text PRIMARY KEY,
  course_id          text NOT NULL,
  instructor_id      text NOT NULL,
  title              text NOT NULL,
  instructions       text,
  submission_type    assignment_submission_type NOT NULL DEFAULT 'FILE',
  max_marks          integer NOT NULL DEFAULT 100,
  pass_marks         integer NOT NULL DEFAULT 40,
  due_at             timestamp,
  allow_resubmission boolean NOT NULL DEFAULT false,
  is_published       boolean NOT NULL DEFAULT false,
  is_deleted         boolean NOT NULL DEFAULT false,
  created_at         timestamp NOT NULL DEFAULT now(),
  updated_at         timestamp NOT NULL DEFAULT now(),
  CONSTRAINT assignments_pass_marks_range CHECK (pass_marks >= 0 AND pass_marks <= max_marks)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS assignments_course_idx ON assignments (course_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS assignments_instructor_idx ON assignments (instructor_id, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS assignments_published_idx ON assignments (is_published, due_at);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id            text PRIMARY KEY,
  assignment_id text NOT NULL,
  user_id       text NOT NULL,
  attempt_no    integer NOT NULL DEFAULT 1,
  file_key      text,
  text_answer   text,
  link_url      text,
  status        assignment_submission_status NOT NULL DEFAULT 'SUBMITTED',
  marks         integer,
  feedback      text,
  graded_by     text,
  graded_at     timestamp,
  submitted_at  timestamp NOT NULL DEFAULT now(),
  created_at    timestamp NOT NULL DEFAULT now(),
  updated_at    timestamp NOT NULL DEFAULT now(),
  CONSTRAINT assignment_submissions_assignment_user_attempt_unique UNIQUE (assignment_id, user_id, attempt_no)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS assignment_submissions_assignment_idx ON assignment_submissions (assignment_id, submitted_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS assignment_submissions_user_idx ON assignment_submissions (user_id, submitted_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS assignment_submissions_status_idx ON assignment_submissions (status);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS live_sessions (
  id               text PRIMARY KEY,
  course_id        text,
  instructor_id    text NOT NULL,
  title            text NOT NULL,
  description      text,
  provider         batch_live_provider NOT NULL DEFAULT 'ZOOM',
  join_url         text,
  meeting_id       text,
  meeting_passcode text,
  starts_at        timestamp NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  status           batch_session_status NOT NULL DEFAULT 'SCHEDULED',
  is_deleted       boolean NOT NULL DEFAULT false,
  created_at       timestamp NOT NULL DEFAULT now(),
  updated_at       timestamp NOT NULL DEFAULT now(),
  CONSTRAINT live_sessions_duration_positive CHECK (duration_minutes > 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS live_sessions_course_idx ON live_sessions (course_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS live_sessions_instructor_idx ON live_sessions (instructor_id, starts_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS live_sessions_starts_at_idx ON live_sessions (starts_at);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS live_session_registrations (
  id            text PRIMARY KEY,
  session_id    text NOT NULL,
  user_id       text NOT NULL,
  attended      boolean NOT NULL DEFAULT false,
  registered_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT live_session_registrations_session_user_unique UNIQUE (session_id, user_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS live_session_registrations_session_idx ON live_session_registrations (session_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS live_session_registrations_user_idx ON live_session_registrations (user_id);
