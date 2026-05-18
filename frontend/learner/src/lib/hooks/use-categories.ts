"use client";

import { useQuery } from "@tanstack/react-query";
import { categoriesApi } from "@/lib/api/services/categories";
import { queryKeys } from "@/lib/query-keys";

export function useCategories(enabled = true) {
  return useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: categoriesApi.getAll,
    enabled,
  });
}

export function useCategoryBySlug(slug: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.categories.bySlug(slug ?? ""),
    queryFn: () => categoriesApi.getBySlug(slug!),
    enabled: !!slug && enabled,
  });
}
