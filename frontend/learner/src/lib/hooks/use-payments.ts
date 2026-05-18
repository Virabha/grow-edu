"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";

interface CreatePaymentParams {
  courseId?: string;
  sectionId?: string;
  itemType: "COURSE" | "SECTION";
  gateway: string;
  billingInfo?: Record<string, string>;
  couponCode?: string;
  successUrl?: string;
  cancelUrl?: string;
}

interface PaymentResponse {
  paymentId: string;
  checkoutUrl?: string;
}

function createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
  return apiClient.post("/payments/create", params).then((r) => r.data as PaymentResponse);
}

interface VerifyPaymentParams {
  sessionId: string;
}

interface VerifyPaymentResponse {
  status: string;
  paymentId: string;
}

function verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResponse> {
  return apiClient.post("/payments/verify", params).then((r) => r.data as VerifyPaymentResponse);
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}

interface FreeEnrollParams {
  courseId?: string;
  sectionId?: string;
  itemType: "COURSE" | "SECTION";
  couponCode?: string;
}

export function useFreeEnroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: FreeEnrollParams) =>
      apiClient.post("/payments/enroll-free", params).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}
