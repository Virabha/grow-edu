import { apiClient } from '../client';
export interface DateFilters {
    startDate?: string;
    endDate?: string;
}
export interface TrendFilters extends DateFilters {
    period?: 'day' | 'week' | 'month';
    days?: number;
}
export interface TopBatchesFilters extends DateFilters {
    limit?: number;
}
export interface EnrollmentStats {
    b2c: number;
    b2b: number;
    total: number;
}
export interface RevenueStats {
    total: number;
    breakdown?: Record<string, number>;
}
export interface PlatformStats {
    totalUsers: number;
    totalBatches: number;
    totalEnrollments: number;
    activeUsers?: number;
}
export interface TopBatch {
    batchId: string;
    batchTitle: string;
    enrollments: number;
    revenue?: number;
}
export interface BatchPerformance {
    enrollments: number;
    completed: number;
    completionRate: number;
    averageProgress: number;
}
export interface TrendDataPoint {
    date: string;
    value?: number;
    revenue?: number;
    transactions?: number;
}
export const analyticsApi = {
    getEnrollmentStats: async (filters?: DateFilters): Promise<EnrollmentStats> => {
        const params = new URLSearchParams();
        if (filters?.startDate)
            params.set('startDate', filters.startDate);
        if (filters?.endDate)
            params.set('endDate', filters.endDate);
        const { data } = await apiClient.get<EnrollmentStats>(`/analytics/enrollments?${params.toString()}`);
        return data;
    },
    getRevenueStats: async (filters?: DateFilters): Promise<RevenueStats> => {
        const params = new URLSearchParams();
        if (filters?.startDate)
            params.set('startDate', filters.startDate);
        if (filters?.endDate)
            params.set('endDate', filters.endDate);
        const { data } = await apiClient.get<RevenueStats>(`/analytics/revenue?${params.toString()}`);
        return data;
    },
    getInstructorRevenueStats: async (filters?: DateFilters) => {
        const params = new URLSearchParams();
        if (filters?.startDate)
            params.set('startDate', filters.startDate);
        if (filters?.endDate)
            params.set('endDate', filters.endDate);
        const { data } = await apiClient.get(`/analytics/instructor-revenue?${params.toString()}`);
        return data;
    },
    getBatchPerformance: async (batchId: string): Promise<BatchPerformance> => {
        const { data } = await apiClient.get<BatchPerformance>(`/analytics/batches/${batchId}`);
        return data;
    },
    getPlatformStats: async (): Promise<PlatformStats> => {
        const { data } = await apiClient.get<PlatformStats>('/analytics/platform');
        return data;
    },
    getEnrollmentTrend: async (filters?: TrendFilters): Promise<TrendDataPoint[]> => {
        const params = new URLSearchParams();
        if (filters?.period)
            params.set('period', filters.period);
        if (filters?.days)
            params.set('days', String(filters.days));
        if (filters?.startDate)
            params.set('startDate', filters.startDate);
        if (filters?.endDate)
            params.set('endDate', filters.endDate);
        const { data } = await apiClient.get<TrendDataPoint[]>(`/analytics/enrollment-trend?${params.toString()}`);
        return data;
    },
    getRevenueTrend: async (filters?: TrendFilters) => {
        const params = new URLSearchParams();
        if (filters?.period)
            params.set('period', filters.period);
        if (filters?.days)
            params.set('days', String(filters.days));
        if (filters?.startDate)
            params.set('startDate', filters.startDate);
        if (filters?.endDate)
            params.set('endDate', filters.endDate);
        const { data } = await apiClient.get(`/analytics/revenue-trend?${params.toString()}`);
        return data;
    },
    getTopBatches: async (filters?: TopBatchesFilters): Promise<TopBatch[]> => {
        const params = new URLSearchParams();
        if (filters?.limit)
            params.set('limit', String(filters.limit));
        if (filters?.startDate)
            params.set('startDate', filters.startDate);
        if (filters?.endDate)
            params.set('endDate', filters.endDate);
        const { data } = await apiClient.get<TopBatch[]>(`/analytics/top-batches?${params.toString()}`);
        return data;
    },
};
