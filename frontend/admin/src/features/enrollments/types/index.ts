export interface AccessedSection {
    sectionId: string;
    title: string;
}
export interface Enrollment {
    enrollmentId: string;
    userId: string;
    courseId: string;
    companyId?: string | null;
    status: 'ACTIVE' | 'COMPLETED' | 'REVOKED';
    enrolledAt: string;
    completedAt?: string | null;
    accessType?: 'FULL' | 'SECTION';
    accessedSections?: AccessedSection[] | null;
    user?: {
        id: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
    };
    course?: {
        id: string;
        title: string;
        slug: string;
        description?: string | null;
        thumbnail?: string | null;
        price?: string | null;
        currency?: string | null;
        categoryId?: string | null;
        category?: {
            id: string;
            name: string;
            slug: string;
            description?: string | null;
        } | null;
    };
    company?: {
        id: string;
        name: string;
    };
}
export interface EnrollmentsResponse {
    data: Enrollment[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages?: number;
    };
}
export interface CreateEnrollmentDto {
    courseId: string;
    userId?: string;
    companyId?: string;
}
export interface BulkEnrollmentDto {
    courseId: string;
    userIds: string[];
}
