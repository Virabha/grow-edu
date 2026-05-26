export type BatchStatus = "DRAFT" | "UPCOMING" | "ONGOING" | "COMPLETED" | "ARCHIVED";

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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface BatchTeacher {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImage: string | null;
}

export interface BatchSubject {
  subjectId: string;
  batchId: string;
  name: string;
  color: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
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

export interface BatchEnrollment {
  enrollmentId: string;
  batchId: string;
  userId: string;
  status: "ACTIVE" | "REVOKED" | "COMPLETED";
  accessStartsAt: string;
  accessEndsAt: string | null;
  grantedBy: string | null;
  paymentId: string | null;
  createdAt: string;
  user: {
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profileImage: string | null;
  };
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

export interface BatchDetail extends Batch {
  subjects: BatchSubject[];
  teachers: BatchTeacher[];
  isEnrolled: boolean;
  canManage: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BatchesResponse {
  data: Batch[];
  pagination: Pagination;
}

export interface EnrollmentsResponse {
  data: BatchEnrollment[];
  pagination: Pagination;
}

export interface BatchFilters {
  search?: string;
  status?: BatchStatus;
  targetExam?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export interface CreateBatchDto {
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  targetExam?: string;
  language?: string;
  thumbnail?: string;
  bannerImage?: string;
  price: number;
  compareAtPrice?: number;
  currency?: string;
  capacity?: number;
  startDate: string;
  endDate: string;
  teacherIds?: string[];
  categoryId?: string;
  status?: BatchStatus;
}

export type UpdateBatchDto = Partial<CreateBatchDto>;

export interface CreateBatchSubjectDto {
  name: string;
  color?: string;
  displayOrder?: number;
}

export type UpdateBatchSubjectDto = Partial<CreateBatchSubjectDto>;

export interface CreateBatchSessionDto {
  title: string;
  description?: string;
  type: BatchSessionType;
  subjectId?: string;
  teacherId?: string;
  liveProvider?: BatchLiveProvider;
  joinUrl?: string;
  meetingId?: string;
  meetingPasscode?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  recordingVideoId?: string;
  recordingDurationSeconds?: number;
  recordingThumbnail?: string;
  resources?: Array<{ label: string; url: string }>;
}

export type UpdateBatchSessionDto = Partial<CreateBatchSessionDto>;

export interface CreateBatchEnrollmentsDto {
  userIds?: string[];
  emails?: string[];
  accessEndsAt?: string;
}

export interface CreateBatchAnnouncementDto {
  title: string;
  body: string;
  pinned?: boolean;
}

export type UpdateBatchAnnouncementDto = Partial<CreateBatchAnnouncementDto>;
