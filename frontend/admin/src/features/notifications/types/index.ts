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
