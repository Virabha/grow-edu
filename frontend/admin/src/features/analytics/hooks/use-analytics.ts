"use client";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { axiosGet } from "@/lib/api/client";
import { DateFilters, TrendFilters, TopBatchesFilters, EnrollmentStats, RevenueStats, PlatformStats, TopBatch, BatchPerformance, TrendDataPoint, } from "@/lib/api/services/analytics";
interface UseEnrollmentStatsParams {
    enabled?: boolean;
    filters?: DateFilters;
}
export function useEnrollmentStats({ enabled, filters }: UseEnrollmentStatsParams = {}) {
    const fetchEnrollmentStats = async (): Promise<EnrollmentStats> => {
        const params: Record<string, string | number> = {};
        if (filters?.startDate)
            params.startDate = filters.startDate;
        if (filters?.endDate)
            params.endDate = filters.endDate;
        const res = await axiosGet<EnrollmentStats>("analytics/enrollments", params);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchEnrollmentStats,
        enabled: enabled !== false,
        queryKey: queryKeys.analytics.enrollmentStats(filters),
    });
}
interface UseRevenueStatsParams {
    enabled?: boolean;
    filters?: DateFilters;
}
export function useRevenueStats({ enabled, filters }: UseRevenueStatsParams = {}) {
    const fetchRevenueStats = async (): Promise<RevenueStats> => {
        const params: Record<string, string | number> = {};
        if (filters?.startDate)
            params.startDate = filters.startDate;
        if (filters?.endDate)
            params.endDate = filters.endDate;
        const res = await axiosGet<RevenueStats>("analytics/revenue", params);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchRevenueStats,
        enabled: enabled !== false,
        queryKey: queryKeys.analytics.revenueStats(filters),
    });
}
interface UseBatchPerformanceParams {
    enabled?: boolean;
    batchId?: string;
}
export function useBatchPerformance({ enabled, batchId }: UseBatchPerformanceParams = {}) {
    const fetchBatchPerformance = async (): Promise<BatchPerformance> => {
        const res = await axiosGet<BatchPerformance>(`analytics/batches/${batchId}`);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchBatchPerformance,
        enabled: !!batchId && enabled !== false,
        queryKey: queryKeys.analytics.batchPerformance(batchId),
    });
}
interface UsePlatformStatsParams {
    enabled?: boolean;
}
export function usePlatformStats({ enabled }: UsePlatformStatsParams = {}) {
    const fetchPlatformStats = async (): Promise<PlatformStats> => {
        const res = await axiosGet<PlatformStats>("analytics/platform");
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchPlatformStats,
        enabled: enabled !== false,
        queryKey: queryKeys.analytics.platformStats(),
    });
}
interface UseEnrollmentTrendParams {
    enabled?: boolean;
    filters?: TrendFilters;
}
export function useEnrollmentTrend({ enabled, filters }: UseEnrollmentTrendParams = {}) {
    const fetchEnrollmentTrend = async (): Promise<TrendDataPoint[]> => {
        const params: Record<string, string | number> = {};
        if (filters?.period)
            params.period = filters.period;
        if (filters?.days)
            params.days = filters.days;
        if (filters?.startDate)
            params.startDate = filters.startDate;
        if (filters?.endDate)
            params.endDate = filters.endDate;
        const res = await axiosGet<TrendDataPoint[]>("analytics/enrollment-trend", params);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchEnrollmentTrend,
        enabled: enabled !== false,
        queryKey: queryKeys.analytics.enrollmentTrend(filters),
    });
}
interface UseRevenueTrendParams {
    enabled?: boolean;
    filters?: TrendFilters;
}
export function useRevenueTrend({ enabled, filters }: UseRevenueTrendParams = {}) {
    const fetchRevenueTrend = async (): Promise<TrendDataPoint[]> => {
        const params: Record<string, string | number> = {};
        if (filters?.period)
            params.period = filters.period;
        if (filters?.days)
            params.days = filters.days;
        if (filters?.startDate)
            params.startDate = filters.startDate;
        if (filters?.endDate)
            params.endDate = filters.endDate;
        const res = await axiosGet<TrendDataPoint[]>("analytics/revenue-trend", params);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchRevenueTrend,
        enabled: enabled !== false,
        queryKey: queryKeys.analytics.revenueTrend(filters),
    });
}
interface UseTopBatchesParams {
    enabled?: boolean;
    filters?: TopBatchesFilters;
}
export function useTopBatches({ enabled, filters }: UseTopBatchesParams = {}) {
    const fetchTopBatches = async (): Promise<TopBatch[]> => {
        const params: Record<string, string | number> = {};
        if (filters?.limit)
            params.limit = filters.limit;
        if (filters?.startDate)
            params.startDate = filters.startDate;
        if (filters?.endDate)
            params.endDate = filters.endDate;
        const res = await axiosGet<TopBatch[]>("analytics/top-batches", params);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchTopBatches,
        enabled: enabled !== false,
        queryKey: queryKeys.analytics.topBatches(filters),
    });
}
