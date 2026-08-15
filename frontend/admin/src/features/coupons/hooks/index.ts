import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponsApi } from '../api';
import type { CouponFilters, CreateCouponDto, UpdateCouponDto } from '../types';
import { toast } from 'sonner';
import { getApiError } from '@/lib/api/errors';
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
        onError: (error: unknown) => {
            toast.error(getApiError(error, 'Failed to create coupon').message);
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
        onError: (error: unknown) => {
            toast.error(getApiError(error, 'Failed to update coupon').message);
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
        onError: (error: unknown) => {
            toast.error(getApiError(error, 'Failed to update coupon status').message);
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
        onError: (error: unknown) => {
            toast.error(getApiError(error, 'Failed to delete coupon').message);
        },
    });
}
export function useValidateCoupon() {
    return useMutation({
        mutationFn: couponsApi.validate,
    });
}
