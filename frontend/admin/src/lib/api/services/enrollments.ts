import { apiClient } from '../client';
export interface Enrollment {
    enrollmentId: string;
    userId: string;
    courseId: string;
    companyId?: string;
    status: 'ACTIVE' | 'COMPLETED' | 'REVOKED';
    enrolledAt: string;
    completedAt?: string;
    user?: { id: string; email: string; firstName?: string; lastName?: string };
    course?: { courseId: string; title: string; slug: string };
    company?: { id: string; name: string };
}
export interface CreateEnrollmentDto {
    courseId: string;
    userId?: string;
    companyId?: string;
}
export interface EnrollmentFilters {
    userId?: string;
    courseId?: string;
    companyId?: string;
    status?: string;
    page?: number;
    limit?: number;
}
export const enrollmentsApi = {
    getAll: async (filters?: EnrollmentFilters) => {
        const params = new URLSearchParams();
        if (filters?.userId)
            params.set('userId', filters.userId);
        if (filters?.courseId)
            params.set('courseId', filters.courseId);
        if (filters?.companyId)
            params.set('companyId', filters.companyId);
        if (filters?.status)
            params.set('status', filters.status);
        if (filters?.page)
            params.set('page', String(filters.page));
        if (filters?.limit)
            params.set('limit', String(filters.limit));
        const { data } = await apiClient.get(`/enrollments?${params.toString()}`);
        return data;
    },
    getById: async (id: string): Promise<Enrollment> => {
        const { data } = await apiClient.get(`/enrollments/${id}`);
        return data;
    },
    create: async (dto: CreateEnrollmentDto): Promise<Enrollment> => {
        const { data } = await apiClient.post('/enrollments', dto);
        return data;
    },
    updateStatus: async (id: string, status: 'ACTIVE' | 'COMPLETED' | 'REVOKED'): Promise<Enrollment> => {
        const { data } = await apiClient.put<Enrollment>(`/enrollments/${id}/status`, { status });
        return data;
    },
    delete: async (id: string) => {
        const { data } = await apiClient.delete(`/enrollments/${id}`);
        return data;
    },
    bulkCreate: async (courseId: string, userIds: string[]) => {
        const { data } = await apiClient.post('/enrollments/bulk', { courseId, userIds });
        return data;
    },
};
