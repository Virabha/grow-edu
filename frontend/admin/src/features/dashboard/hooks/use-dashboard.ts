"use client";
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { dashboardApi } from '../api/dashboard.api';
import { useAuthStore } from '@/lib/store/auth-store';
import { DashboardStats } from '../types';
interface UseDashboardStatsParams {
    enabled?: boolean;
}
export function useDashboardStats({ enabled }: UseDashboardStatsParams = {}) {
    const { user } = useAuthStore();
    const fetchDashboardStats = async (): Promise<DashboardStats> => {
        return dashboardApi.getStats(user?.id || '');
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchDashboardStats,
        enabled: !!user?.id && enabled !== false,
        queryKey: queryKeys.dashboard.stats(user?.id),
    });
}
