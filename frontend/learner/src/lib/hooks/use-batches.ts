"use client";

import { useQuery } from "@tanstack/react-query";
import {
  batchesApi,
  type BatchSessionType,
  type BatchesListParams,
} from "@/lib/api/services/batches";
import { queryKeys } from "@/lib/query-keys";

export function useBatches(params?: BatchesListParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.batches.list(params),
    queryFn: () => batchesApi.list(params),
    enabled,
  });
}

export function useMyBatches(enabled = true) {
  return useQuery({
    queryKey: queryKeys.batches.mine(),
    queryFn: () => batchesApi.mine(),
    enabled,
  });
}

export function useBatchBySlug(slug: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.batches.bySlug(slug ?? ""),
    queryFn: () => batchesApi.bySlug(slug!),
    enabled: !!slug && enabled,
  });
}

export function useBatchSessions(
  batchId: string | null,
  type?: BatchSessionType,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.batches.sessions(batchId ?? "", type),
    queryFn: () => batchesApi.listSessions(batchId!, type),
    enabled: !!batchId && enabled,
  });
}

export function useBatchSession(
  batchId: string | null,
  sessionId: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.batches.session(batchId ?? "", sessionId ?? ""),
    queryFn: () => batchesApi.getSession(batchId!, sessionId!),
    enabled: !!batchId && !!sessionId && enabled,
  });
}

export function useBatchAnnouncements(
  batchId: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.batches.announcements(batchId ?? ""),
    queryFn: () => batchesApi.listAnnouncements(batchId!),
    enabled: !!batchId && enabled,
  });
}
