export const queryKeys = {
    analytics: {
        all: () => ["analytics"] as const,
        enrollmentStats: (filters?: {
            startDate?: string | Date;
            endDate?: string | Date;
        }) => [...queryKeys.analytics.all(), "getEnrollmentStats", filters] as const,
        revenueStats: (filters?: {
            startDate?: string | Date;
            endDate?: string | Date;
        }) => [...queryKeys.analytics.all(), "getRevenueStats", filters] as const,
        instructorRevenueStats: (filters?: {
            startDate?: string | Date;
            endDate?: string | Date;
        }) => [...queryKeys.analytics.all(), "getInstructorRevenueStats", filters] as const,
        batchPerformance: (batchId?: string) => [...queryKeys.analytics.all(), "getBatchPerformance", batchId] as const,
        platformStats: () => [...queryKeys.analytics.all(), "getPlatformStats"] as const,
        enrollmentTrend: (filters?: {
            period?: "day" | "week" | "month";
            days?: number;
            startDate?: string | Date;
            endDate?: string | Date;
        }) => [...queryKeys.analytics.all(), "getEnrollmentTrend", filters] as const,
        revenueTrend: (filters?: {
            period?: "day" | "week" | "month";
            days?: number;
            startDate?: string | Date;
            endDate?: string | Date;
        }) => [...queryKeys.analytics.all(), "getRevenueTrend", filters] as const,
        topBatches: (filters?: {
            limit?: number;
            startDate?: string | Date;
            endDate?: string | Date;
        }) => [...queryKeys.analytics.all(), "getTopBatches", filters] as const,
    },
    categories: {
        all: () => ["categories"] as const,
        list: () => [...queryKeys.categories.all(), "getAll"] as const,
        detail: (id?: string) => [...queryKeys.categories.all(), "getById", id] as const,
        bySlug: (slug?: string) => [...queryKeys.categories.all(), "getBySlug", slug] as const,
    },
    companies: {
        all: () => ["companies"] as const,
        list: (filters?: {
            search?: string;
            page?: number;
            limit?: number;
        }) => [...queryKeys.companies.all(), "getAll", filters] as const,
        detail: (id?: string) => [...queryKeys.companies.all(), "getById", id] as const,
    },
    courses: {
        all: () => ["courses"] as const,
        list: (filters?: {
            search?: string;
            categoryId?: string;
            status?: string;
            instructorId?: string;
            page?: number;
            limit?: number;
        }) => [...queryKeys.courses.all(), "getAll", filters] as const,
        detail: (id?: string) => [...queryKeys.courses.all(), "getById", id] as const,
        bySlug: (slug?: string) => [...queryKeys.courses.all(), "getBySlug", slug] as const,
    },
    dashboard: {
        all: () => ["dashboard"] as const,
        stats: (userId?: string) => [...queryKeys.dashboard.all(), "stats", userId] as const,
    },
    enrollments: {
        all: () => ["enrollments"] as const,
        list: (filters?: {
            userId?: string;
            courseId?: string;
            companyId?: string;
            status?: string;
            page?: number;
            limit?: number;
        }) => [...queryKeys.enrollments.all(), "getAll", filters] as const,
        detail: (id?: string) => [...queryKeys.enrollments.all(), "getById", id] as const,
    },
    payments: {
        all: () => ["payments"] as const,
        list: (filters?: {
            search?: string;
            status?: string;
            gateway?: string;
            dateFrom?: string;
            dateTo?: string;
            page?: number;
            limit?: number;
        }) => [...queryKeys.payments.all(), filters] as const,
        detail: (id?: string) => [...queryKeys.payments.all(), "getById", id] as const,
    },
    cart: {
        all: () => ["cart"] as const,
        list: () => [...queryKeys.cart.all(), "list"] as const,
    },
    progress: {
        all: () => ["progress"] as const,
        courseProgress: (courseId?: string) => [...queryKeys.progress.all(), "getCourseProgress", courseId] as const,
    },
    users: {
        all: () => ["users"] as const,
        list: (filters?: {
            search?: string;
            role?: string;
            companyId?: string;
            page?: number;
            limit?: number;
        }) => [...queryKeys.users.all(), "getAll", filters] as const,
        detail: (id?: string) => [...queryKeys.users.all(), "getById", id] as const,
    },
    lessons: {
        all: () => ["lessons"] as const,
        detail: (id?: string) => [...queryKeys.lessons.all(), "getById", id] as const,
    },
    sections: {
        all: () => ["sections"] as const,
        list: (courseId?: string) => [...queryKeys.sections.all(), "getAll", courseId] as const,
        detail: (id?: string) => [...queryKeys.sections.all(), "getById", id] as const,
    },
    auth: {
        all: () => ["auth"] as const,
        profile: () => [...queryKeys.auth.all(), "profile"] as const,
    },
    storage: {
        all: () => ["storage"] as const,
    },
    instructor: {
        all: () => ["instructor"] as const,
        courses: (instructorId?: string) => [...queryKeys.instructor.all(), "courses", instructorId] as const,
        meetingCredentials: () => [...queryKeys.instructor.all(), "meeting-credentials"] as const,
    },
    cms: {
        all: () => ["cms"] as const,
        banners: () => [...queryKeys.cms.all(), "banners"] as const,
        faqs: () => [...queryKeys.cms.all(), "faqs"] as const,
        whyChooseUs: () => [...queryKeys.cms.all(), "whyChooseUs"] as const,
        testimonials: () => [...queryKeys.cms.all(), "testimonials"] as const,
        services: () => [...queryKeys.cms.all(), "services"] as const,
        siteSettings: () => [...queryKeys.cms.all(), "siteSettings"] as const,
        instructors: () => [...queryKeys.cms.all(), "instructors"] as const,
        serviceApplications: (filters?: { serviceId?: string; status?: string; search?: string; page?: number }) =>
            [...queryKeys.cms.all(), "serviceApplications", filters] as const,
        serviceApplication: (id?: string) => [...queryKeys.cms.all(), "serviceApplication", id] as const,
    },
    books: {
        all: () => ["books"] as const,
        list: (filters?: { search?: string; status?: string; page?: number; limit?: number }) =>
            [...queryKeys.books.all(), "list", filters] as const,
        detail: (id?: string) => [...queryKeys.books.all(), "detail", id] as const,
    },
    teacherApplications: {
        all: () => ["teacherApplications"] as const,
        list: (filters?: { status?: string; search?: string; page?: number; limit?: number }) =>
            [...queryKeys.teacherApplications.all(), "list", filters] as const,
        detail: (id?: string) => [...queryKeys.teacherApplications.all(), "detail", id] as const,
    },
    batches: {
        all: () => ["batches"] as const,
        list: (filters?: { search?: string; status?: string; targetExam?: string; categoryId?: string; page?: number; limit?: number }) =>
            [...queryKeys.batches.all(), "list", filters] as const,
        detail: (idOrSlug?: string) => [...queryKeys.batches.all(), "detail", idOrSlug] as const,
        subjects: (batchId?: string) => [...queryKeys.batches.all(), "subjects", batchId] as const,
        sessions: (batchId?: string, type?: string) =>
            [...queryKeys.batches.all(), "sessions", batchId, type] as const,
        session: (batchId?: string, sessionId?: string) =>
            [...queryKeys.batches.all(), "session", batchId, sessionId] as const,
        enrollments: (batchId?: string, params?: { page?: number; limit?: number; search?: string }) =>
            [...queryKeys.batches.all(), "enrollments", batchId, params] as const,
        announcements: (batchId?: string) =>
            [...queryKeys.batches.all(), "announcements", batchId] as const,
        mine: () => [...queryKeys.batches.all(), "mine"] as const,
        resources: (batchId?: string, params?: { type?: string; subjectId?: string }) =>
            [...queryKeys.batches.all(), "resources", batchId, params] as const,
        doubts: (batchId?: string, params?: { mine?: boolean; status?: string }) =>
            [...queryKeys.batches.all(), "doubts", batchId, params] as const,
        doubt: (batchId?: string, doubtId?: string) =>
            [...queryKeys.batches.all(), "doubt", batchId, doubtId] as const,
        attendance: (batchId?: string, sessionId?: string) =>
            [...queryKeys.batches.all(), "attendance", batchId, sessionId] as const,
        quizzes: (batchId?: string) =>
            [...queryKeys.batches.all(), "quizzes", batchId] as const,
        quiz: (batchId?: string, quizId?: string) =>
            [...queryKeys.batches.all(), "quiz", batchId, quizId] as const,
        attempts: (batchId?: string, quizId?: string) =>
            [...queryKeys.batches.all(), "attempts", batchId, quizId] as const,
        attempt: (batchId?: string, quizId?: string, attemptId?: string) =>
            [...queryKeys.batches.all(), "attempt", batchId, quizId, attemptId] as const,
        leaderboard: (batchId?: string, quizId?: string) =>
            [...queryKeys.batches.all(), "leaderboard", batchId, quizId] as const,
    },
    payouts: {
        all: () => ["payouts"] as const,
        earnings: () => ["payouts", "earnings"] as const,
        history: (page?: number, limit?: number) =>
            ["payouts", "history", page, limit] as const,
        sales: (page?: number, limit?: number) =>
            ["payouts", "sales", page, limit] as const,
    },
} as const;
