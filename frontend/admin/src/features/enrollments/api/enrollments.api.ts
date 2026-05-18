import { Enrollment, EnrollmentsResponse, CreateEnrollmentDto, BulkEnrollmentDto } from '../types';
import { parseJsonResponse, parseErrorResponse } from '@/lib/types/api';
import { env } from '@/lib/env';
const API_URL = env.NEXT_PUBLIC_API_URL;
const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};
export const enrollmentsApi = {
    async getAll(filters?: {
        userId?: string;
        courseId?: string;
        companyId?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<EnrollmentsResponse> {
        const params = new URLSearchParams();
        if (filters?.userId)
            params.append('userId', filters.userId);
        if (filters?.courseId)
            params.append('courseId', filters.courseId);
        if (filters?.companyId)
            params.append('companyId', filters.companyId);
        if (filters?.status)
            params.append('status', filters.status);
        if (filters?.page)
            params.append('page', filters.page.toString());
        if (filters?.limit)
            params.append('limit', filters.limit.toString());
        const response = await fetch(`${API_URL}/enrollments?${params.toString()}`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to fetch enrollments');
        }
        return parseJsonResponse<EnrollmentsResponse>(response);
    },
    async getById(id: string): Promise<Enrollment> {
        const response = await fetch(`${API_URL}/enrollments/${id}`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to fetch enrollment');
        }
        return parseJsonResponse<Enrollment>(response);
    },
    async create(dto: CreateEnrollmentDto): Promise<Enrollment> {
        const response = await fetch(`${API_URL}/enrollments`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify(dto),
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to create enrollment');
        }
        return parseJsonResponse<Enrollment>(response);
    },
    async bulkCreate(dto: BulkEnrollmentDto): Promise<{
        success: number;
        failed: number;
        results: Enrollment[];
        errors: Array<{
            userId: string;
            error: string;
        }>;
    }> {
        const response = await fetch(`${API_URL}/enrollments/bulk`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify(dto),
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to create bulk enrollments');
        }
        return parseJsonResponse<{
            success: number;
            failed: number;
            results: Enrollment[];
            errors: Array<{
                userId: string;
                error: string;
            }>;
        }>(response);
    },
    async updateStatus(id: string, status: 'ACTIVE' | 'COMPLETED' | 'REVOKED'): Promise<Enrollment> {
        const response = await fetch(`${API_URL}/enrollments/${id}/status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify({ status }),
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to update enrollment status');
        }
        return parseJsonResponse<Enrollment>(response);
    },
    async delete(id: string): Promise<{
        message: string;
    }> {
        const response = await fetch(`${API_URL}/enrollments/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to delete enrollment');
        }
        return parseJsonResponse<{
            message: string;
        }>(response);
    },
};
