export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export interface Coupon {
    couponId: string;
    couponCode: string;
    discountType: DiscountType;
    discountValue: string;
    maxDiscountAmount: string | null;
    minPurchaseAmount: string | null;
    validFrom: string;
    validTill: string;
    usageLimit: number | null;
    usageLimitPerUser: number;
    isActive: boolean;
    usageCount: number;
    categories: Array<{
        categoryId: string;
        name: string;
        slug?: string;
    }>;
    courses: Array<{
        courseId: string;
        title: string;
    }>;
    createdAt: string;
    updatedAt?: string;
}
export interface CouponsResponse {
    data: Coupon[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface CreateCouponDto {
    couponCode: string;
    discountType: DiscountType;
    discountValue: number;
    maxDiscountAmount?: number;
    minPurchaseAmount?: number;
    validFrom: string;
    validTill: string;
    usageLimit?: number;
    usageLimitPerUser?: number;
    categoryIds?: string[];
    courseIds?: string[];
    isActive?: boolean;
}
export interface UpdateCouponDto extends Partial<CreateCouponDto> {
}
export interface CouponValidationResult {
    valid: boolean;
    couponId?: string;
    couponCode: string;
    discountType?: string;
    discountValue?: string;
    originalAmount?: string;
    discountAmount?: string;
    finalAmount?: string;
    reason?: string;
    message: string;
}
export interface CouponFilters {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
}
