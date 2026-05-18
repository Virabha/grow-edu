export interface Course {
    courseId: string;
    title: string;
    slug: string;
    description: string;
    thumbnail?: string | null;
    price: string;
    compareAtPrice?: string | null;
    currency: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    reviewStatus?: "DRAFT" | "PENDING_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED";
    reviewNotes?: string | null;
    rejectionReason?: string | null;
    categoryId: string;
    instructorId: string;
    createdAt: string;
    updatedAt?: string;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    publishedAt?: string | null;
    category?: {
        id: string;
        name: string;
        slug: string;
        description?: string | null;
    };
    instructor?: {
        id: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
    };
    sections?: CourseSection[];
    accessibleSectionIds?: string[];
    learningOutcomes?: string[] | null;
    requirements?: string[] | null;
    targetAudience?: string[] | null;
}
export interface CourseSection {
    id: string;
    sectionId: string;
    courseId: string;
    title: string;
    description?: string | null;
    order: number;
    priceType?: "INCLUDED" | "INDIVIDUAL" | "BOTH";
    sectionPrice?: string | null;
    lessons?: Lesson[];
}
export interface Lesson {
    id: string;
    lessonId: string;
    sectionId: string;
    title: string;
    description?: string | null;
    type?: "VIDEO" | "TEXT" | "QUIZ";
    videoUrl?: string | null;
    resources?: {
        label: string;
        url: string;
    }[];
    duration?: number | null;
    order: number;
    isFreePreview?: boolean;
    status?: string;
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
export interface CourseFilters {
    categoryId?: string;
    instructorId?: string;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    search?: string;
    page?: number;
    limit?: number;
}
export interface CreateCourseDto {
    title: string;
    slug: string;
    description: string;
    thumbnail?: string;
    price: number;
    compareAtPrice?: number;
    currency?: string;
    categoryId: string;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}
export interface UpdateCourseDto extends Partial<CreateCourseDto> {
}
