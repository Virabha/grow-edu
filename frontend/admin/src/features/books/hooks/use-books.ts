"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { booksApi } from "../api/books.api";
import type { CreateBookDto, UpdateBookDto, BookFilters } from "../types";

export function useBooksAdmin(filters?: BookFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.books.list(filters),
    queryFn: () => booksApi.getAll(filters),
    enabled,
  });
}

export function useBookById(id: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.books.detail(id ?? undefined),
    queryFn: () => booksApi.getById(id!),
    enabled: !!id && enabled,
  });
}

export function useCreateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBookDto) => booksApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.books.all() }),
  });
}

export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateBookDto }) => booksApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.books.all() }),
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => booksApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.books.all() }),
  });
}
