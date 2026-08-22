import { relations } from "drizzle-orm";
import { users, emailTokens, instructorProfiles } from "./users";
import { companies } from "./companies";
import { categories } from "./catalog";
import { payments } from "./commerce";
import {
  batches,
  batchInstructors,
  batchSubjects,
  lessons,
  lessonProgress,
  batchEnrollments,
  batchSessions,
  batchAnnouncements,
  batchResources,
  batchDoubts,
  batchDoubtReplies,
  batchAttendance,
  batchQuizzes,
  batchQuizQuestions,
  batchQuizAttempts,
  batchCertificates,
} from "./batches";
import { services, serviceApplications } from "./store";
import { notifications, videoEncodingJobs } from "./system";

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.companyId],
  }),
  enrollments: many(batchEnrollments),
  taughtBatches: many(batchInstructors),
  payments: many(payments),
  progress: many(lessonProgress),
  emailTokens: many(emailTokens),
  instructorProfile: one(instructorProfiles),
}));

export const instructorProfilesRelations = relations(instructorProfiles, ({ one }) => ({
  user: one(users, {
    fields: [instructorProfiles.userId],
    references: [users.userId],
  }),
}));

export const emailTokensRelations = relations(emailTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailTokens.userId],
    references: [users.userId],
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  admins: many(users),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentCategoryId],
    references: [categories.categoryId],
    relationName: "categoryChildren",
  }),
  children: many(categories, { relationName: "categoryChildren" }),
  batches: many(batches),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.userId],
  }),
  batch: one(batches, {
    fields: [payments.batchId],
    references: [batches.batchId],
  }),
}));

export const videoEncodingJobsRelations = relations(videoEncodingJobs, ({ one }) => ({
  lesson: one(lessons, {
    fields: [videoEncodingJobs.lessonId],
    references: [lessons.lessonId],
  }),
  batch: one(batches, {
    fields: [videoEncodingJobs.batchId],
    references: [batches.batchId],
  }),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  applications: many(serviceApplications),
}));

export const serviceApplicationsRelations = relations(serviceApplications, ({ one }) => ({
  service: one(services, {
    fields: [serviceApplications.serviceId],
    references: [services.serviceId],
  }),
}));

export const batchesRelations = relations(batches, ({ many, one }) => ({
  subjects: many(batchSubjects),
  instructors: many(batchInstructors),
  enrollments: many(batchEnrollments),
  sessions: many(batchSessions),
  announcements: many(batchAnnouncements),
  creator: one(users, {
    fields: [batches.createdBy],
    references: [users.userId],
  }),
  category: one(categories, {
    fields: [batches.categoryId],
    references: [categories.categoryId],
  }),
}));

export const batchInstructorsRelations = relations(batchInstructors, ({ one }) => ({
  batch: one(batches, {
    fields: [batchInstructors.batchId],
    references: [batches.batchId],
  }),
  instructor: one(users, {
    fields: [batchInstructors.instructorId],
    references: [users.userId],
  }),
}));

export const batchSubjectsRelations = relations(batchSubjects, ({ one, many }) => ({
  batch: one(batches, {
    fields: [batchSubjects.batchId],
    references: [batches.batchId],
  }),
  sessions: many(batchSessions),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  subject: one(batchSubjects, {
    fields: [lessons.subjectId],
    references: [batchSubjects.subjectId],
  }),
  progress: many(lessonProgress),
  encodingJobs: many(videoEncodingJobs),
}));

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  user: one(users, {
    fields: [lessonProgress.userId],
    references: [users.userId],
  }),
  lesson: one(lessons, {
    fields: [lessonProgress.lessonId],
    references: [lessons.lessonId],
  }),
  batch: one(batches, {
    fields: [lessonProgress.batchId],
    references: [batches.batchId],
  }),
}));

export const batchEnrollmentsRelations = relations(batchEnrollments, ({ one }) => ({
  batch: one(batches, {
    fields: [batchEnrollments.batchId],
    references: [batches.batchId],
  }),
  user: one(users, {
    fields: [batchEnrollments.userId],
    references: [users.userId],
  }),
  payment: one(payments, {
    fields: [batchEnrollments.paymentId],
    references: [payments.paymentId],
  }),
}));

export const batchSessionsRelations = relations(batchSessions, ({ one }) => ({
  batch: one(batches, {
    fields: [batchSessions.batchId],
    references: [batches.batchId],
  }),
  subject: one(batchSubjects, {
    fields: [batchSessions.subjectId],
    references: [batchSubjects.subjectId],
  }),
  teacher: one(users, {
    fields: [batchSessions.teacherId],
    references: [users.userId],
  }),
}));

export const batchAnnouncementsRelations = relations(batchAnnouncements, ({ one }) => ({
  batch: one(batches, {
    fields: [batchAnnouncements.batchId],
    references: [batches.batchId],
  }),
  author: one(users, {
    fields: [batchAnnouncements.authorId],
    references: [users.userId],
  }),
}));

export const batchResourcesRelations = relations(batchResources, ({ one }) => ({
  batch: one(batches, {
    fields: [batchResources.batchId],
    references: [batches.batchId],
  }),
  subject: one(batchSubjects, {
    fields: [batchResources.subjectId],
    references: [batchSubjects.subjectId],
  }),
  uploader: one(users, {
    fields: [batchResources.uploadedBy],
    references: [users.userId],
  }),
}));

export const batchDoubtsRelations = relations(batchDoubts, ({ one, many }) => ({
  batch: one(batches, {
    fields: [batchDoubts.batchId],
    references: [batches.batchId],
  }),
  subject: one(batchSubjects, {
    fields: [batchDoubts.subjectId],
    references: [batchSubjects.subjectId],
  }),
  author: one(users, {
    fields: [batchDoubts.askedBy],
    references: [users.userId],
  }),
  replies: many(batchDoubtReplies),
}));

export const batchDoubtRepliesRelations = relations(batchDoubtReplies, ({ one }) => ({
  doubt: one(batchDoubts, {
    fields: [batchDoubtReplies.doubtId],
    references: [batchDoubts.doubtId],
  }),
  author: one(users, {
    fields: [batchDoubtReplies.authorId],
    references: [users.userId],
  }),
}));

export const batchAttendanceRelations = relations(batchAttendance, ({ one }) => ({
  session: one(batchSessions, {
    fields: [batchAttendance.sessionId],
    references: [batchSessions.sessionId],
  }),
  user: one(users, {
    fields: [batchAttendance.userId],
    references: [users.userId],
  }),
}));

export const batchQuizzesRelations = relations(batchQuizzes, ({ one, many }) => ({
  batch: one(batches, {
    fields: [batchQuizzes.batchId],
    references: [batches.batchId],
  }),
  subject: one(batchSubjects, {
    fields: [batchQuizzes.subjectId],
    references: [batchSubjects.subjectId],
  }),
  questions: many(batchQuizQuestions),
  attempts: many(batchQuizAttempts),
}));

export const batchQuizQuestionsRelations = relations(
  batchQuizQuestions,
  ({ one }) => ({
    quiz: one(batchQuizzes, {
      fields: [batchQuizQuestions.quizId],
      references: [batchQuizzes.quizId],
    }),
  })
);

export const batchQuizAttemptsRelations = relations(
  batchQuizAttempts,
  ({ one }) => ({
    quiz: one(batchQuizzes, {
      fields: [batchQuizAttempts.quizId],
      references: [batchQuizzes.quizId],
    }),
    user: one(users, {
      fields: [batchQuizAttempts.userId],
      references: [users.userId],
    }),
  })
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.userId],
  }),
}));

export const batchCertificatesRelations = relations(batchCertificates, ({ one }) => ({
  batch: one(batches, {
    fields: [batchCertificates.batchId],
    references: [batches.batchId],
  }),
  user: one(users, {
    fields: [batchCertificates.userId],
    references: [users.userId],
  }),
}));
