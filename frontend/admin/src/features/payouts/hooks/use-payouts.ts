"use client";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { payoutsApi } from '../api/payouts.api';
import type { CreatePayoutRequest } from '../types';

// ── query key factory ─────────────────────────────────────────────────────────
const PAYOUTS_KEY = ['payouts'] as const;

export const payoutKeys = {
  all: () => PAYOUTS_KEY,
  earnings: () => [...PAYOUTS_KEY, 'earnings'] as const,
  history: (page: number, limit: number) =>
    [...PAYOUTS_KEY, 'history', page, limit] as const,
  sales: (page: number, limit: number) =>
    [...PAYOUTS_KEY, 'sales', page, limit] as const,
};

// ── query hooks ───────────────────────────────────────────────────────────────

export function usePayoutEarnings() {
  return useQuery({
    queryKey: payoutKeys.earnings(),
    queryFn: () => payoutsApi.getEarnings(),
    staleTime: 60_000,
  });
}

export function usePayoutHistory(page = 1, limit = 20) {
  return useQuery({
    queryKey: payoutKeys.history(page, limit),
    queryFn: () => payoutsApi.getHistory(page, limit),
    staleTime: 30_000,
  });
}

export function usePayoutSales(page = 1, limit = 20) {
  return useQuery({
    queryKey: payoutKeys.sales(page, limit),
    queryFn: () => payoutsApi.getSales(page, limit),
    staleTime: 30_000,
  });
}

// ── mutation hooks ────────────────────────────────────────────────────────────

export function useCreatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePayoutRequest) => payoutsApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payoutKeys.all() });
    },
  });
}

export function useCancelPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payoutId: string) => payoutsApi.cancel(payoutId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: payoutKeys.all() });
    },
  });
}
