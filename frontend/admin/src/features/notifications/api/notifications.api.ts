import { apiClient } from "@/lib/api/client";
import type { NotificationsResponse } from "../types";

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient
      .get<NotificationsResponse>("/notifications", { params })
      .then((r) => r.data),
  unreadCount: () =>
    apiClient.get<{ count: number }>("/notifications/unread-count").then((r) => r.data),
  markRead: (notificationIds: string[]) =>
    apiClient
      .patch<{ updated: number }>("/notifications/read", { notificationIds })
      .then((r) => r.data),
  markAllRead: () =>
    apiClient
      .post<{ updated: number }>("/notifications/mark-all-read", {})
      .then((r) => r.data),
  remove: (notificationId: string) =>
    apiClient
      .delete<{ success: boolean }>(`/notifications/${notificationId}`)
      .then((r) => r.data),
};
