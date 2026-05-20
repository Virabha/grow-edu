import { apiClient } from '@/lib/api/client';
import type { Coupon, CouponsResponse, CreateCouponDto, UpdateCouponDto, CouponFilters, CouponValidationResult, } from '../types';
export const couponsApi = {
    getAll: async (filters?: CouponFilters): Promise<CouponsResponse> => {
        const params = new URLSearchParams();
        if (filters?.search)
            params.set('search', filters.search);
        if (filters?.isActive !== undefined)
            params.set('isActive', String(filters.isActive));
        if (filters?.page)
            params.set('page', String(filters.page));
        if (filters?.limit)
            params.set('limit', String(filters.limit));
        const queryString = params.toString();
        const url = queryString ? `/admin/coupons?${queryString}` : '/admin/coupons';
        const { data } = await apiClient.get<CouponsResponse>(url);
        return data;
    },
    getById: async (couponId: string): Promise<Coupon> => {
        const { data } = await apiClient.get<Coupon>(`/admin/coupons/${couponId}`);
        return data;
    },
    create: async (dto: CreateCouponDto): Promise<Coupon> => {
        const { data } = await apiClient.post<Coupon>('/admin/coupons', dto);
        return data;
    },
    update: async (couponId: string, dto: UpdateCouponDto): Promise<Coupon> => {
        const { data } = await apiClient.put<Coupon>(`/admin/coupons/${couponId}`, dto);
        return data;
    },
    activate: async (couponId: string): Promise<{
        couponId: string;
        isActive: boolean;
    }> => {
        const { data } = await apiClient.patch<{
            couponId: string;
            isActive: boolean;
        }>(`/admin/coupons/${couponId}/activate`);
        return data;
    },
    deactivate: async (couponId: string): Promise<{
        couponId: string;
        isActive: boolean;
    }> => {
        const { data } = await apiClient.patch<{
            couponId: string;
            isActive: boolean;
        }>(`/admin/coupons/${couponId}/deactivate`);
        return data;
    },
    delete: async (couponId: string): Promise<{
        couponId: string;
        isDeleted: boolean;
    }> => {
        const { data } = await apiClient.delete<{
            couponId: string;
            isDeleted: boolean;
        }>(`/admin/coupons/${couponId}`);
        return data;
    },
    validate: async (payload: {
        couponCode: string;
        courseId: string;
        sectionId?: string;
        itemType: 'COURSE' | 'SECTION';
    }): Promise<CouponValidationResult> => {
        const { data } = await apiClient.post<CouponValidationResult>('/coupons/validate', payload);
        return data;
    },
};
