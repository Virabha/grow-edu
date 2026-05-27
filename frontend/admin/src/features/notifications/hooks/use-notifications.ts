"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../api/notifications.api";

const KEYS = {
  list: (params?: { page?: number; limit?: number }) =>
    ["notifications", "list", params] as const,
  unread: () => ["notifications", "unread"] as const,
};

export function useNotifications(
  params?: { page?: number; limit?: number },
  enabled = true
) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => notificationsApi.list(params),
    enabled,
  });
}

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: KEYS.unread(),
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => notificationsApi.markRead(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
