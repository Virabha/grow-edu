import { EnrollmentStats, RevenueStats, CoursePerformance, PlatformStats } from '../types';
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
export const analyticsApi = {
    async getEnrollmentStats(filters?: {
        startDate?: string;
        endDate?: string;
    }): Promise<EnrollmentStats> {
        const params = new URLSearchParams();
        if (filters?.startDate)
            params.append('startDate', filters.startDate);
        if (filters?.endDate)
            params.append('endDate', filters.endDate);
        const response = await fetch(`${API_URL}/analytics/enrollments?${params.toString()}`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to fetch enrollment stats');
        }
        return parseJsonResponse<EnrollmentStats>(response);
    },
    async getRevenueStats(filters?: {
        startDate?: string;
        endDate?: string;
    }): Promise<RevenueStats> {
        const params = new URLSearchParams();
        if (filters?.startDate)
            params.append('startDate', filters.startDate);
        if (filters?.endDate)
            params.append('endDate', filters.endDate);
        const response = await fetch(`${API_URL}/analytics/revenue?${params.toString()}`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to fetch revenue stats');
        }
        return parseJsonResponse<RevenueStats>(response);
    },
    async getCoursePerformance(courseId: string): Promise<CoursePerformance> {
        const response = await fetch(`${API_URL}/analytics/courses/${courseId}`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to fetch course performance');
        }
        return parseJsonResponse<CoursePerformance>(response);
    },
    async getPlatformStats(): Promise<PlatformStats> {
        const response = await fetch(`${API_URL}/analytics/platform`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const error = await parseErrorResponse(response);
            throw new Error(error.message || error.error || 'Failed to fetch platform stats');
        }
        return parseJsonResponse<PlatformStats>(response);
    },
};
