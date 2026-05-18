"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface CouponValidationResult {
  valid: boolean;
  couponCode?: string;
  reason?: string;
  discountAmount?: number;
  discountPercent?: number;
  finalAmount?: number;
  currency?: string;
  message?: string;
}

interface ValidateCouponParams {
  couponCode: string;
  courseId: string;
  sectionId?: string;
  itemType: "COURSE" | "SECTION";
}

function validateCoupon(params: ValidateCouponParams) {
  return apiClient
    .post<CouponValidationResult>("/coupons/validate", params)
    .then((r) => r.data);
}

export function useValidateCoupon() {
  return useMutation({ mutationFn: validateCoupon });
}
