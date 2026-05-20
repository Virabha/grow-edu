"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

interface InitiatePhonePeParams {
  itemType: "COURSE" | "SECTION";
  courseId: string;
  sectionId?: string;
  couponCode?: string;
}

export interface InitiatePhonePeResponse {
  paymentId: string;
  paymentUrl: string;
  amount: number;
  currency: string;
}

export interface PhonePeStatusResponse {
  paymentId: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | string;
}

export function useInitiatePhonePe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: InitiatePhonePeParams) =>
      apiClient
        .post<InitiatePhonePeResponse>("/payments/phonepe/initiate", params)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}

export function usePhonePeStatus(paymentId: string | null) {
  return useQuery<PhonePeStatusResponse>({
    queryKey: ["payments", "phonepe", "status", paymentId],
    enabled: !!paymentId,
    queryFn: () =>
      apiClient
        .get<PhonePeStatusResponse>(`/payments/phonepe/status/${paymentId}`)
        .then((r) => r.data),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2_000;
      return data.status === "PENDING" ? 2_000 : false;
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

export function useMyPayment(paymentId: string | null) {
  return useQuery({
    queryKey: ["payments", "mine", paymentId],
    enabled: !!paymentId,
    queryFn: () =>
      apiClient.get(`/payments/my/${paymentId}`).then((r) => r.data),
  });
}
