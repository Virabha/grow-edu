import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { couponsApi } from '../api';
import type { CouponFilters, CreateCouponDto, UpdateCouponDto } from '../types';
import { toast } from 'sonner';

function getErrorMessage(error: Error, fallback: string): string {
    const axiosErr = error as AxiosError<{ message?: string }>;
    return axiosErr?.response?.data?.message || fallback;
}
export const couponKeys = {
    all: ['coupons'] as const,
    list: (filters?: CouponFilters) => [...couponKeys.all, 'list', filters] as const,
    detail: (id: string) => [...couponKeys.all, 'detail', id] as const,
};
export function useCoupons(filters?: CouponFilters) {
    return useQuery({
        queryKey: couponKeys.list(filters),
        queryFn: () => couponsApi.getAll(filters),
    });
}
export function useCoupon(couponId: string | undefined) {
    return useQuery({
        queryKey: couponKeys.detail(couponId!),
        queryFn: () => couponsApi.getById(couponId!),
        enabled: !!couponId,
    });
}
export function useCreateCoupon() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateCouponDto) => couponsApi.create(dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: couponKeys.all });
            toast.success('Coupon created successfully');
        },
        onError: (error: Error) => {
            toast.error(getErrorMessage(error, 'Failed to create coupon'));
        },
    });
}
export function useUpdateCoupon() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ couponId, dto }: {
            couponId: string;
            dto: UpdateCouponDto;
        }) => couponsApi.update(couponId, dto),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: couponKeys.all });
            queryClient.setQueryData(couponKeys.detail(data.couponId), data);
            toast.success('Coupon updated successfully');
        },
        onError: (error: Error) => {
            toast.error(getErrorMessage(error, 'Failed to update coupon'));
        },
    });
}
export function useToggleCouponStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ couponId, activate }: {
            couponId: string;
            activate: boolean;
        }) => activate ? couponsApi.activate(couponId) : couponsApi.deactivate(couponId),
        onSuccess: (_, { activate }) => {
            queryClient.invalidateQueries({ queryKey: couponKeys.all });
            toast.success(`Coupon ${activate ? 'activated' : 'deactivated'}`);
        },
        onError: (error: Error) => {
            toast.error(getErrorMessage(error, 'Failed to update coupon status'));
        },
    });
}
export function useDeleteCoupon() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (couponId: string) => couponsApi.delete(couponId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: couponKeys.all });
            toast.success('Coupon deleted');
        },
        onError: (error: Error) => {
            toast.error(getErrorMessage(error, 'Failed to delete coupon'));
        },
    });
}
export function useValidateCoupon() {
    return useMutation({
        mutationFn: couponsApi.validate,
    });
}
export function useValidateBulkCoupon() {
    return useMutation({
        mutationFn: couponsApi.validateBulk,
    });
}
