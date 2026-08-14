"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type ResourceRow = Record<string, unknown>;

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ResourceQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  [key: string]: string | number | undefined;
}

/** List a collection with search, filters, sorting and pagination. */
export function useResourceList<T = ResourceRow>(
  path: string,
  query: ResourceQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: [path, query],
    enabled,
    queryFn: () =>
      apiClient
        .get<Paginated<T>>(`/${path}`, { params: query })
        .then((r) => r.data),
  });
}

export function useResourceItem<T = ResourceRow>(
  path: string,
  id: string | null,
) {
  return useQuery({
    queryKey: [path, "detail", id],
    enabled: !!id,
    queryFn: () => apiClient.get<T>(`/${path}/${id}`).then((r) => r.data),
  });
}

function useInvalidate(path: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: [path] });
    queryClient.invalidateQueries({ queryKey: ["admin/dashboard"] });
  };
}

export function useCreateResource<T = ResourceRow>(path: string) {
  const invalidate = useInvalidate(path);
  return useMutation({
    mutationFn: (body: ResourceRow) =>
      apiClient.post<T>(`/${path}`, body).then((r) => r.data),
    onSuccess: invalidate,
  });
}

export function useUpdateResource<T = ResourceRow>(path: string) {
  const invalidate = useInvalidate(path);
  return useMutation({
    mutationFn: ({ id, ...body }: ResourceRow & { id: string }) =>
      apiClient.patch<T>(`/${path}/${id}`, body).then((r) => r.data),
    onSuccess: invalidate,
  });
}

export function useDeleteResource(path: string) {
  const invalidate = useInvalidate(path);
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/${path}/${id}`).then((r) => r.data),
    onSuccess: invalidate,
  });
}

/** POST to an action endpoint under a resource, e.g. `payouts/:id/approve`. */
export function useResourceAction<TBody = ResourceRow, TResult = unknown>(
  path: string,
  action: string,
) {
  const invalidate = useInvalidate(path);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: TBody }) =>
      apiClient
        .post<TResult>(`/${path}/${id}/${action}`, body ?? {})
        .then((r) => r.data),
    onSuccess: invalidate,
  });
}
