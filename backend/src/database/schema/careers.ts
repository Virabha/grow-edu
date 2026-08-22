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
import {
  applicationStatusEnum,
  jobOpeningStatusEnum,
  mockInterviewStatusEnum,
} from "./enums";
import { organizationId } from "./organizations";

export const pathMentorAssignments = pgTable(
  "path_mentor_assignments",
  {
    organizationId: organizationId(),
    assignmentId: text("assignment_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pathId: text("path_id").notNull(),
    mentorId: text("mentor_id").notNull(),
    studentId: text("student_id").notNull(),
    assignedBy: text("assigned_by").notNull(),
    assignedAt: timestamp("assigned_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    revokedBy: text("revoked_by"),
  },
  (table) => ({
    pathStudentIdx: index("path_mentor_assignments_path_student_idx").on(
      table.pathId,
      table.studentId,
    ),
    mentorIdx: index("path_mentor_assignments_mentor_idx").on(table.mentorId),
    activeUnique: unique("path_mentor_assignments_active_unique").on(
      table.pathId,
      table.mentorId,
      table.studentId,
    ),
  }),
);

export const mentorSessionLinks = pgTable(
  "mentor_session_links",
  {
    organizationId: organizationId(),
    linkId: text("link_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id").notNull(),
    assignmentId: text("assignment_id").notNull(),
    mentorId: text("mentor_id").notNull(),
    studentId: text("student_id").notNull(),
    pathId: text("path_id").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => ({
    onePerSession: unique("mentor_session_links_session_unique").on(
      table.sessionId,
    ),
    assignmentIdx: index("mentor_session_links_assignment_idx").on(
      table.assignmentId,
    ),
    studentIdx: index("mentor_session_links_student_idx").on(table.studentId),
  }),
);

export const mentorSessionFeedback = pgTable(
  "mentor_session_feedback",
  {
    organizationId: organizationId(),
    feedbackId: text("feedback_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id").notNull(),
    mentorId: text("mentor_id").notNull(),
    studentId: text("student_id").notNull(),
    notes: text("notes").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerSession: unique("mentor_session_feedback_session_unique").on(
      table.sessionId,
    ),
    mentorIdx: index("mentor_session_feedback_mentor_idx").on(table.mentorId),
  }),
);

export const mockInterviews = pgTable(
  "mock_interviews",
  {
    organizationId: organizationId(),
    mockInterviewId: text("mock_interview_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id"),
    pathId: text("path_id").notNull(),
    mentorId: text("mentor_id").notNull(),
    studentId: text("student_id").notNull(),
    status: mockInterviewStatusEnum("status").notNull().default("SCHEDULED"),
    scheduledAt: timestamp("scheduled_at").notNull(),
    completedAt: timestamp("completed_at"),
    studentFirstViewedAt: timestamp("student_first_viewed_at"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    pathStudentIdx: index("mock_interviews_path_student_idx").on(
      table.pathId,
      table.studentId,
    ),
    mentorIdx: index("mock_interviews_mentor_idx").on(table.mentorId),
  }),
);

export const mockInterviewScores = pgTable(
  "mock_interview_scores",
  {
    organizationId: organizationId(),
    scoreId: text("score_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    mockInterviewId: text("mock_interview_id").notNull(),
    skillId: text("skill_id").notNull(),
    score: integer("score").notNull(),
    notes: text("notes"),
    editedAfterStudentViewed: boolean("edited_after_student_viewed")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    onePerSkill: unique("mock_interview_scores_interview_skill_unique").on(
      table.mockInterviewId,
      table.skillId,
    ),
    interviewIdx: index("mock_interview_scores_interview_idx").on(
      table.mockInterviewId,
    ),
  }),
);

export const jobOpenings = pgTable(
  "job_openings",
  {
    organizationId: organizationId(),
    openingId: text("opening_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description").notNull(),
    location: text("location"),
    tags: jsonb("tags").$type<string[]>().default([]),
    status: jobOpeningStatusEnum("status").notNull().default("OPEN"),
    postedBy: text("posted_by").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    closedAt: timestamp("closed_at"),
  },
  (table) => ({
    statusIdx: index("job_openings_status_idx").on(table.status),
  }),
);

export const jobApplications = pgTable(
  "job_applications",
  {
    organizationId: organizationId(),
    applicationId: text("application_id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    openingId: text("opening_id").notNull(),
    studentId: text("student_id").notNull(),
    portfolioId: text("portfolio_id").notNull(),
    status: applicationStatusEnum("status").notNull().default("NEW"),
    appliedAt: timestamp("applied_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    notes: text("notes"),
  },
  (table) => ({
    onePerOpening: unique("job_applications_opening_student_unique").on(
      table.openingId,
      table.studentId,
    ),
    studentIdx: index("job_applications_student_idx").on(table.studentId),
    openingIdx: index("job_applications_opening_idx").on(table.openingId),
  }),
);
