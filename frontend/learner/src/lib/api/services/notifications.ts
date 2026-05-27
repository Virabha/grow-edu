import { apiClient } from "../client";

export type NotificationType =
  | "BATCH_ANNOUNCEMENT"
  | "BATCH_DOUBT_REPLY"
  | "BATCH_SESSION_SCHEDULED"
  | "BATCH_QUIZ_PUBLISHED"
  | "BATCH_RESOURCE_ADDED"
  | "BATCH_ENROLLMENT"
  | "BATCH_CERTIFICATE"
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "GENERIC";

export interface Notification {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  batchId: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  data: Notification[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  unread: number;
}

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient
      .get<NotificationsResponse>("/notifications", { params })
      .then((r) => r.data),
  unreadCount: () =>
    apiClient
      .get<{ count: number }>("/notifications/unread-count")
      .then((r) => r.data),
  markRead: (notificationIds: string[]) =>
    apiClient
      .patch<{ updated: number }>("/notifications/read", { notificationIds })
      .then((r) => r.data),
  markAllRead: () =>
    apiClient
      .post<{ updated: number }>("/notifications/mark-all-read", {})
      .then((r) => r.data),
};
