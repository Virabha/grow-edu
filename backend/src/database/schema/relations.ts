import { relations } from "drizzle-orm";
import { users, emailTokens, instructorProfiles } from "./users";
import { companies } from "./companies";
import { categories, courses, courseSections, lessons, quizQuestions } from "./catalog";
import { enrollments, courseProgress, lessonProgress, sectionAccess } from "./learning";
import { payments, coupons, couponCategories, couponCourses, couponUsages } from "./commerce";
import {
  batches,
  batchSubjects,
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
import { books, bookPurchases, services, serviceApplications } from "./store";
import { notifications, videoEncodingJobs } from "./system";

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.companyId],
  }),
  enrollments: many(enrollments),
  createdCourses: many(courses),
  payments: many(payments),
  progress: many(courseProgress),
  sectionAccess: many(sectionAccess),
  emailTokens: many(emailTokens),
  couponUsages: many(couponUsages),
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
  enrollments: many(enrollments),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentCategoryId],
    references: [categories.categoryId],
    relationName: "categoryChildren",
  }),
  children: many(categories, { relationName: "categoryChildren" }),
  courses: many(courses),
  couponCategories: many(couponCategories),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  category: one(categories, {
    fields: [courses.categoryId],
    references: [categories.categoryId],
  }),
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.userId],
  }),
  sections: many(courseSections),
  enrollments: many(enrollments),
  progress: many(courseProgress),
  sectionAccess: many(sectionAccess),
  payments: many(payments),
  encodingJobs: many(videoEncodingJobs),
  couponCourses: many(couponCourses),
}));

export const courseSectionsRelations = relations(
  courseSections,
  ({ one, many }) => ({
    course: one(courses, {
      fields: [courseSections.courseId],
      references: [courses.courseId],
    }),
    lessons: many(lessons),
    sectionAccess: many(sectionAccess),
  })
);

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  section: one(courseSections, {
    fields: [lessons.sectionId],
    references: [courseSections.sectionId],
  }),
  progress: many(lessonProgress),
  questions: many(quizQuestions),
  encodingJobs: many(videoEncodingJobs),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  lesson: one(lessons, {
    fields: [quizQuestions.lessonId],
    references: [lessons.lessonId],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.userId],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.courseId],
  }),
  company: one(companies, {
    fields: [enrollments.companyId],
    references: [companies.companyId],
  }),
  payment: one(payments, {
    fields: [enrollments.enrollmentId],
    references: [payments.enrollmentId],
  }),
}));

export const courseProgressRelations = relations(
  courseProgress,
  ({ one, many }) => ({
    user: one(users, {
      fields: [courseProgress.userId],
      references: [users.userId],
    }),
    course: one(courses, {
      fields: [courseProgress.courseId],
      references: [courses.courseId],
    }),
    lessonProgress: many(lessonProgress),
  })
);

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  progress: one(courseProgress, {
    fields: [lessonProgress.progressId],
    references: [courseProgress.courseProgressId],
  }),
  lesson: one(lessons, {
    fields: [lessonProgress.lessonId],
    references: [lessons.lessonId],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.userId],
  }),
  enrollment: one(enrollments, {
    fields: [payments.enrollmentId],
    references: [enrollments.enrollmentId],
  }),
  course: one(courses, {
    fields: [payments.courseId],
    references: [courses.courseId],
  }),
  section: one(courseSections, {
    fields: [payments.sectionId],
    references: [courseSections.sectionId],
  }),
  coupon: one(coupons, {
    fields: [payments.couponId],
    references: [coupons.couponId],
  }),
}));

export const sectionAccessRelations = relations(sectionAccess, ({ one }) => ({
  user: one(users, {
    fields: [sectionAccess.userId],
    references: [users.userId],
  }),
  course: one(courses, {
    fields: [sectionAccess.courseId],
    references: [courses.courseId],
  }),
  section: one(courseSections, {
    fields: [sectionAccess.sectionId],
    references: [courseSections.sectionId],
  }),
  payment: one(payments, {
    fields: [sectionAccess.paymentId],
    references: [payments.paymentId],
  }),
}));

export const videoEncodingJobsRelations = relations(videoEncodingJobs, ({ one }) => ({
  lesson: one(lessons, {
    fields: [videoEncodingJobs.lessonId],
    references: [lessons.lessonId],
  }),
  course: one(courses, {
    fields: [videoEncodingJobs.courseId],
    references: [courses.courseId],
  }),
}));

// =============================================
// COUPON SYSTEM RELATIONS
// =============================================

export const couponsRelations = relations(coupons, ({ many }) => ({
  categories: many(couponCategories),
  courses: many(couponCourses),
  usages: many(couponUsages),
  payments: many(payments),
}));

export const couponCategoriesRelations = relations(couponCategories, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponCategories.couponId],
    references: [coupons.couponId],
  }),
  category: one(categories, {
    fields: [couponCategories.categoryId],
    references: [categories.categoryId],
  }),
}));

export const couponCoursesRelations = relations(couponCourses, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponCourses.couponId],
    references: [coupons.couponId],
  }),
  course: one(courses, {
    fields: [couponCourses.courseId],
    references: [courses.courseId],
  }),
}));

export const couponUsagesRelations = relations(couponUsages, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponUsages.couponId],
    references: [coupons.couponId],
  }),
  user: one(users, {
    fields: [couponUsages.userId],
    references: [users.userId],
  }),
  payment: one(payments, {
    fields: [couponUsages.paymentId],
    references: [payments.paymentId],
  }),
  course: one(courses, {
    fields: [couponUsages.courseId],
    references: [courses.courseId],
  }),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  category: one(categories, {
    fields: [books.categoryId],
    references: [categories.categoryId],
  }),
  purchases: many(bookPurchases),
}));

export const bookPurchasesRelations = relations(bookPurchases, ({ one }) => ({
  user: one(users, {
    fields: [bookPurchases.userId],
    references: [users.userId],
  }),
  book: one(books, {
    fields: [bookPurchases.bookId],
    references: [books.bookId],
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

export const batchSubjectsRelations = relations(batchSubjects, ({ one, many }) => ({
  batch: one(batches, {
    fields: [batchSubjects.batchId],
    references: [batches.batchId],
  }),
  sessions: many(batchSessions),
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
