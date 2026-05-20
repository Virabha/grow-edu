"use client";
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { axiosGet } from '@/lib/api/client';
import { paymentsApi, type PaymentsResponse } from '../api/payments.api';

interface UsePaymentsFilters {
    search?: string;
    page?: number;
    limit?: number;
    status?: string;
    gateway?: string;
    dateFrom?: string;
    dateTo?: string;
}

interface UsePaymentsParams {
    enabled?: boolean;
    filters?: UsePaymentsFilters;
}

export function usePayments({ enabled, filters }: UsePaymentsParams = {}) {
    const fetchPayments = async (): Promise<PaymentsResponse> => {
        const params: Record<string, string | number> = {};
        if (filters?.search) params.search = filters.search;
        if (filters?.page) params.page = filters.page;
        if (filters?.limit) params.limit = filters.limit;
        if (filters?.status) params.status = filters.status;
        if (filters?.gateway) params.gateway = filters.gateway;
        if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
        if (filters?.dateTo) params.dateTo = filters.dateTo;
        const res = await axiosGet<PaymentsResponse>("payments", params);
        return res.data;
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchPayments,
        enabled: enabled !== false,
        queryKey: queryKeys.payments.list(filters),
    });
}

export function usePaymentById(id: string | null, enabled = true) {
    return useQuery({
        queryKey: queryKeys.payments.detail(id ?? undefined),
        queryFn: () => paymentsApi.getById(id!),
        enabled: !!id && enabled,
    });
}
