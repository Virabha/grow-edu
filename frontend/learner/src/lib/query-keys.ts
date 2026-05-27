import type { CoursesParams } from "@/lib/api/services/courses";
import type { BooksParams } from "@/lib/api/services/books";
import type { BatchesListParams, BatchSessionType } from "@/lib/api/services/batches";

export const queryKeys = {
  cms: {
    banners: () => ["cms", "banners"] as const,
    faqs: () => ["cms", "faqs"] as const,
    whyChooseUs: () => ["cms", "whyChooseUs"] as const,
    instructors: () => ["cms", "instructors"] as const,
    siteSettings: () => ["cms", "siteSettings"] as const,
  },
  categories: {
    all: () => ["categories"] as const,
    bySlug: (slug: string) => ["categories", "slug", slug] as const,
  },
  courses: {
    list: (params?: CoursesParams) => ["courses", "list", params] as const,
    byId: (id: string) => ["courses", "detail", id] as const,
    bySlug: (slug: string) => ["courses", "slug", slug] as const,
  },
  enrollments: {
    list: (params?: Record<string, unknown>) =>
      ["enrollments", params] as const,
  },
  profile: {
    me: () => ["profile"] as const,
  },
  payments: {
    create: () => ["payments", "create"] as const,
  },
  books: {
    list: (params?: BooksParams) => ["books", "list", params] as const,
    byId: (id: string) => ["books", "detail", id] as const,
    bySlug: (slug: string) => ["books", "slug", slug] as const,
    purchases: () => ["books", "purchases"] as const,
  },
  batches: {
    list: (params?: BatchesListParams) => ["batches", "list", params] as const,
    bySlug: (slug: string) => ["batches", "slug", slug] as const,
    mine: () => ["batches", "mine"] as const,
    sessions: (batchId: string, type?: BatchSessionType) =>
      ["batches", "sessions", batchId, type] as const,
    session: (batchId: string, sessionId: string) =>
      ["batches", "session", batchId, sessionId] as const,
    announcements: (batchId: string) =>
      ["batches", "announcements", batchId] as const,
    resources: (batchId: string, params?: { type?: string }) =>
      ["batches", "resources", batchId, params] as const,
    doubts: (batchId: string, params?: { mine?: boolean; status?: string }) =>
      ["batches", "doubts", batchId, params] as const,
    doubt: (batchId: string, doubtId: string) =>
      ["batches", "doubt", batchId, doubtId] as const,
    quizzes: (batchId: string) => ["batches", "quizzes", batchId] as const,
    quiz: (batchId: string, quizId: string) =>
      ["batches", "quiz", batchId, quizId] as const,
    attempt: (batchId: string, quizId: string, attemptId: string) =>
      ["batches", "attempt", batchId, quizId, attemptId] as const,
    leaderboard: (batchId: string, quizId: string) =>
      ["batches", "leaderboard", batchId, quizId] as const,
  },
} as const;
