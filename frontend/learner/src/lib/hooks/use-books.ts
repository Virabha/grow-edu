"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { booksApi, type BooksParams } from "@/lib/api/services/books";
import { queryKeys } from "@/lib/query-keys";

export function useBooks(params?: BooksParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.books.list(params),
    queryFn: () => booksApi.getBooks(params),
    enabled,
  });
}

export function useBookBySlug(slug: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.books.bySlug(slug ?? ""),
    queryFn: () => booksApi.getBySlug(slug!),
    enabled: !!slug && enabled,
  });
}

export function useBookById(bookId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.books.byId(bookId ?? ""),
    queryFn: () => booksApi.getById(bookId!),
    enabled: !!bookId && enabled,
  });
}

export function usePurchaseBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { bookId: string; successUrl?: string; cancelUrl?: string }) =>
      booksApi.purchase(params.bookId, {
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.books.purchases() });
    },
  });
}

export function useVerifyBookPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (purchaseId: string) => booksApi.verifyPurchase(purchaseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.books.purchases() });
    },
  });
}

export function useMyBookPurchases(enabled = true) {
  return useQuery({
    queryKey: queryKeys.books.purchases(),
    queryFn: () => booksApi.getMyPurchases(),
    enabled,
  });
}
