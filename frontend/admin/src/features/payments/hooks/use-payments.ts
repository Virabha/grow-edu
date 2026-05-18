"use client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { axiosGet, axiosPost } from '@/lib/api/client';
import { paymentsApi, type PaymentsResponse, type PaymentDetail } from '../api/payments.api';
import { CreatePaymentDto, CreateBulkPaymentDto, PaymentResponse, VerifyPaymentDto, VerifyPaymentResponse } from '../types';

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

export const useCreatePayment = () => {
    const queryClient = useQueryClient();
    const fetchCreatePaymentMutationFunction = async (data: CreatePaymentDto): Promise<PaymentResponse> => {
        const res = await axiosPost<PaymentResponse>("payments", data);
        return res.data;
    };
    return useMutation({
        mutationKey: ["createPayment"],
        mutationFn: fetchCreatePaymentMutationFunction,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.payments.all(),
            });
        },
    });
};

export const useCreateBulkPayment = () => {
    const queryClient = useQueryClient();
    const fetchCreateBulkPaymentMutationFunction = async (data: CreateBulkPaymentDto): Promise<PaymentResponse> => {
        const res = await axiosPost<PaymentResponse>("payments/bulk", data);
        return res.data;
    };
    return useMutation({
        mutationKey: ["createBulkPayment"],
        mutationFn: fetchCreateBulkPaymentMutationFunction,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.payments.all(),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.cart.all(),
            });
        },
    });
};

export const useVerifyPayment = () => {
    const queryClient = useQueryClient();
    const fetchVerifyPaymentMutationFunction = async (data: VerifyPaymentDto): Promise<VerifyPaymentResponse> => {
        const res = await axiosPost<VerifyPaymentResponse>("payments/verify", data);
        return res.data;
    };
    return useMutation({
        mutationKey: ["verifyPayment"],
        mutationFn: fetchVerifyPaymentMutationFunction,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.payments.all(),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.cart.all(),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.enrollments.all(),
            });
        },
    });
};
