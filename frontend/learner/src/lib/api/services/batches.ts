import { apiClient } from "../client";

export type BatchStatus =
  | "DRAFT"
  | "UPCOMING"
  | "ONGOING"
  | "COMPLETED"
  | "ARCHIVED";

export type BatchSessionType = "LIVE" | "RECORDING";

export type BatchLiveProvider =
  | "GOOGLE_MEET"
  | "ZOOM"
  | "JITSI"
  | "YOUTUBE_LIVE"
  | "CUSTOM_URL";

export type BatchSessionStatus = "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";

export interface Batch {
  batchId: string;
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  targetExam: string | null;
  language: string;
  thumbnail: string | null;
  bannerImage: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  capacity: number | null;
  startDate: string;
  endDate: string;
  teacherIds: string[];
  categoryId: string | null;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface BatchSubject {
  subjectId: string;
  batchId: string;
  name: string;
  color: string | null;
  displayOrder: number;
}

export interface BatchTeacher {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImage: string | null;
}

export interface BatchDetail extends Batch {
  subjects: BatchSubject[];
  teachers: BatchTeacher[];
  isEnrolled: boolean;
  canManage: boolean;
}

export interface BatchSession {
  sessionId: string;
  batchId: string;
  subjectId: string | null;
  teacherId: string | null;
  title: string;
  description: string | null;
  type: BatchSessionType;
  liveProvider: BatchLiveProvider | null;
  joinUrl: string | null;
  meetingId: string | null;
  meetingPasscode: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  status: BatchSessionStatus;
  recordingVideoId: string | null;
  recordingDurationSeconds: number | null;
  recordingThumbnail: string | null;
  resources: Array<{ label: string; url: string }> | null;
  createdAt: string;
  updatedAt: string;
  playbackUrl?: string | null;
}

export interface BatchAnnouncement {
  announcementId: string;
  batchId: string;
  authorId: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MyBatch extends Batch {
  enrollment: {
    enrollmentId: string;
    status: string;
    accessStartsAt: string;
    accessEndsAt: string | null;
  };
}

export interface BatchesListResponse {
  data: Batch[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface BatchesListParams {
  search?: string;
  status?: BatchStatus;
  targetExam?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export const batchesApi = {
  list: (params?: BatchesListParams) =>
    apiClient
      .get<BatchesListResponse>("/batches", { params })
      .then((r) => r.data),
  mine: () => apiClient.get<MyBatch[]>("/batches/mine").then((r) => r.data),
  bySlug: (slug: string) =>
    apiClient.get<BatchDetail>(`/batches/${slug}`).then((r) => r.data),
  listSessions: (batchId: string, type?: BatchSessionType) =>
    apiClient
      .get<BatchSession[]>(`/batches/${batchId}/sessions`, {
        params: type ? { type } : {},
      })
      .then((r) => r.data),
  getSession: (batchId: string, sessionId: string) =>
    apiClient
      .get<BatchSession>(`/batches/${batchId}/sessions/${sessionId}`)
      .then((r) => r.data),
  listAnnouncements: (batchId: string) =>
    apiClient
      .get<BatchAnnouncement[]>(`/batches/${batchId}/announcements`)
      .then((r) => r.data),
};
