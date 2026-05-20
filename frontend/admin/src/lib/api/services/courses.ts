import { apiClient } from "../client";
import type { QuizQuestionEntity } from "./lessons";
export interface Course {
    courseId: string;
    title: string;
    slug: string;
    description: string;
    thumbnail?: string;
    price: string;
    compareAtPrice?: string | null;
    currency: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    instructorId: string;
    categoryId: string;
    createdAt: string;
    updatedAt: string;
    reviewStatus?: "PENDING_REVIEW" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
    submittedAt?: string;
    reviewedAt?: string;
    reviewNotes?: string;
    rejectionReason?: string;
    sections?: SectionWithLessons[];
    instructor?: {
        firstName?: string;
        lastName?: string;
        email: string;
    };
    category?: {
        name: string;
        slug: string;
    };
    accessibleSectionIds?: string[];
    learningOutcomes?: string[];
    requirements?: string[];
    targetAudience?: string[];
    level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL_LEVELS";
    language?: string;
}
export interface SectionWithLessons {
    sectionId: string;
    title: string;
    description?: string;
    order: number;
    priceType?: "INCLUDED" | "INDIVIDUAL" | "BOTH";
    sectionPrice?: string | null;
    lessons: LessonInCourse[];
}
export interface LessonInCourse {
    lessonId: string;
    title: string;
    type: "VIDEO" | "TEXT" | "QUIZ";
    duration?: number;
    url?: string;
    videoUrl?: string;
    textContent?: string;
    description?: string;
    questions?: QuizQuestionEntity[];
    order: number;
    status?: "DRAFT" | "PENDING_APPROVAL" | "PROCESSING" | "READY";
    isFreePreview?: boolean;
}
export interface CreateCourseDto {
    title: string;
    description: string;
    shortDescription?: string;
    thumbnail?: string;
    slug: string;
    categoryId: string;
    price?: number;
    compareAtPrice?: number;
    currency?: string;
    level?: string;
    language?: string;
    learningOutcomes?: string[];
    requirements?: string[];
    targetAudience?: string[];
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}
export interface UpdateCourseDto extends Partial<CreateCourseDto> {
    thumbnail?: string;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}
export interface CourseFilters {
    search?: string;
    categoryId?: string;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    instructorId?: string;
    page?: number;
    limit?: number;
}
export interface CoursesResponse {
    data: Course[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export const coursesApi = {
    getAll: async (filters?: CourseFilters) => {
        const params = new URLSearchParams();
        if (filters?.search)
            params.set("search", filters.search);
        if (filters?.categoryId)
            params.set("categoryId", filters.categoryId);
        if (filters?.status)
            params.set("status", filters.status);
        if (filters?.instructorId)
            params.set("instructorId", filters.instructorId);
        if (filters?.page)
            params.set("page", String(filters.page));
        if (filters?.limit)
            params.set("limit", String(filters.limit));
        const { data } = await apiClient.get(`/courses?${params.toString()}`);
        return data;
    },
    getById: async (id: string): Promise<Course> => {
        const { data } = await apiClient.get(`/courses/${id}`);
        return data;
    },
    getBySlug: async (slug: string): Promise<Course> => {
        const { data } = await apiClient.get(`/courses/slug/${slug}`);
        return data;
    },
    create: async (dto: CreateCourseDto): Promise<Course> => {
        const { data } = await apiClient.post("/courses", dto);
        return data;
    },
    update: async (id: string, dto: UpdateCourseDto): Promise<Course> => {
        const { data } = await apiClient.put(`/courses/${id}`, dto);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await apiClient.delete(`/courses/${id}`);
        return data;
    },
    submitForReview: async (id: string) => {
        const { data } = await apiClient.post(`/courses/${id}/submit-review`);
        return data;
    },
    approve: async (id: string, notes?: string, publish?: boolean) => {
        const { data } = await apiClient.post(`/courses/${id}/approve`, {
            notes,
            publish,
        });
        return data;
    },
    requestChanges: async (id: string, notes?: string) => {
        const { data } = await apiClient.post(`/courses/${id}/request-changes`, {
            notes,
        });
        return data;
    },
    reject: async (id: string, reason: string) => {
        const { data } = await apiClient.post(`/courses/${id}/reject`, { reason });
        return data;
    },
    unpublish: async (id: string) => {
        const { data } = await apiClient.post(`/courses/${id}/unpublish`);
        return data;
    },
};
