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
  pendingPaymentId: string | null;
  pendingPaymentStatus: "PENDING" | "PROOF_UPLOADED" | null;
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

export type BatchResourceType = "DPP" | "NOTES" | "REFERENCE";

export interface BatchResource {
  resourceId: string;
  batchId: string;
  subjectId: string | null;
  title: string;
  description: string | null;
  type: BatchResourceType;
  fileKey: string;
  fileUrl: string;
  fileSize: number | null;
  pageCount: number | null;
  dayNumber: number | null;
  publishAt: string | null;
  createdAt: string;
}

export type BatchDoubtStatus = "OPEN" | "ANSWERED" | "CLOSED";

export interface BatchDoubt {
  doubtId: string;
  batchId: string;
  subjectId: string | null;
  askedBy: string;
  title: string;
  body: string;
  attachments: string[];
  status: BatchDoubtStatus;
  replyCount: number;
  createdAt: string;
  author: {
    userId: string;
    firstName: string | null;
    lastName: string | null;
    profileImage: string | null;
  };
}

export interface BatchDoubtReply {
  replyId: string;
  doubtId: string;
  authorId: string;
  body: string;
  isOfficial: boolean;
  createdAt: string;
  author: {
    userId: string;
    firstName: string | null;
    lastName: string | null;
    profileImage: string | null;
    role?: string;
  };
}

export interface BatchDoubtDetail extends BatchDoubt {
  replies: BatchDoubtReply[];
}

export type QuizQuestionType = "MCQ_SINGLE" | "MCQ_MULTI" | "NUMERICAL";

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  questionId: string;
  quizId: string;
  order: number;
  type: QuizQuestionType;
  prompt: string;
  options: QuizOption[];
  correctAnswer: unknown;
  marks: string;
  explanation: string | null;
}

export interface BatchQuiz {
  quizId: string;
  batchId: string;
  subjectId: string | null;
  title: string;
  description: string | null;
  durationMinutes: number;
  maxAttempts: number;
  negativeMarkPercent: string;
  passingPercent: string;
  showLeaderboard: boolean;
  showSolutions: boolean;
  opensAt: string | null;
  closesAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  myBestAttempt?: {
    score: number | null;
    maxScore: number | null;
    submittedAt: string | null;
    status: string;
  } | null;
}

export interface BatchQuizDetail extends BatchQuiz {
  questions: QuizQuestion[];
}

export type QuizAttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";

export interface QuizAttempt {
  attemptId: string;
  quizId: string;
  userId: string;
  status: QuizAttemptStatus;
  startedAt: string;
  submittedAt: string | null;
  expiresAt: string;
  score: string | null;
  maxScore: string | null;
  correctCount: number | null;
  wrongCount: number | null;
  skippedCount: number | null;
  answers: Record<string, unknown>;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  profileImage: string | null;
  score: number | null;
  maxScore: number | null;
  submittedAt: string | null;
  rank: number;
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
  recordAttendance: (batchId: string, sessionId: string, durationSeconds?: number) =>
    apiClient
      .post<{ success: boolean; alreadyRecorded: boolean }>(
        `/batches/${batchId}/sessions/${sessionId}/attendance`,
        durationSeconds !== undefined ? { durationSeconds } : {}
      )
      .then((r) => r.data),
  listAnnouncements: (batchId: string) =>
    apiClient
      .get<BatchAnnouncement[]>(`/batches/${batchId}/announcements`)
      .then((r) => r.data),
  listResources: (batchId: string, params?: { type?: BatchResourceType; subjectId?: string }) =>
    apiClient
      .get<BatchResource[]>(`/batches/${batchId}/resources`, { params })
      .then((r) => r.data),
  listDoubts: (batchId: string, params?: { mine?: boolean; status?: string }) =>
    apiClient
      .get<BatchDoubt[]>(`/batches/${batchId}/doubts`, { params })
      .then((r) => r.data),
  getDoubt: (batchId: string, doubtId: string) =>
    apiClient
      .get<BatchDoubtDetail>(`/batches/${batchId}/doubts/${doubtId}`)
      .then((r) => r.data),
  createDoubt: (batchId: string, dto: { title: string; body: string; subjectId?: string }) =>
    apiClient.post<BatchDoubt>(`/batches/${batchId}/doubts`, dto).then((r) => r.data),
  replyToDoubt: (batchId: string, doubtId: string, body: string) =>
    apiClient
      .post<BatchDoubtReply>(`/batches/${batchId}/doubts/${doubtId}/replies`, { body })
      .then((r) => r.data),
  listQuizzes: (batchId: string) =>
    apiClient.get<BatchQuiz[]>(`/batches/${batchId}/quizzes`).then((r) => r.data),
  getQuiz: (batchId: string, quizId: string) =>
    apiClient
      .get<BatchQuizDetail>(`/batches/${batchId}/quizzes/${quizId}`)
      .then((r) => r.data),
  startAttempt: (batchId: string, quizId: string) =>
    apiClient
      .post<QuizAttempt>(`/batches/${batchId}/quizzes/${quizId}/attempts`, {})
      .then((r) => r.data),
  submitAttempt: (
    batchId: string,
    quizId: string,
    attemptId: string,
    answers: Record<string, unknown>
  ) =>
    apiClient
      .post<QuizAttempt>(
        `/batches/${batchId}/quizzes/${quizId}/attempts/${attemptId}/submit`,
        { answers }
      )
      .then((r) => r.data),
  getAttempt: (batchId: string, quizId: string, attemptId: string) =>
    apiClient
      .get<QuizAttempt>(`/batches/${batchId}/quizzes/${quizId}/attempts/${attemptId}`)
      .then((r) => r.data),
  myAttempts: (batchId: string, quizId: string) =>
    apiClient
      .get<QuizAttempt[]>(`/batches/${batchId}/quizzes/${quizId}/attempts`)
      .then((r) => r.data),
  leaderboard: (batchId: string, quizId: string) =>
    apiClient
      .get<LeaderboardEntry[]>(`/batches/${batchId}/quizzes/${quizId}/leaderboard`)
      .then((r) => r.data),
  startCheckout: (batchId: string, opts?: { couponCode?: string }) =>
    apiClient
      .post<{
        paymentId: string | null;
        enrolled: boolean;
        originalAmount: number;
        discountAmount: number;
        finalAmount: number;
      }>(`/batches/${batchId}/checkout`, opts ?? {})
      .then((r) => r.data),
  myProgress: (batchId: string) =>
    apiClient
      .get<{
        sessions: {
          liveTotal: number;
          attended: number;
          attendancePercent: number;
          recordings: number;
        };
        quizzes: {
          total: number;
          attempted: number;
          averageScorePercent: number | null;
        };
      }>(`/batches/${batchId}/my-progress`)
      .then((r) => r.data),
  myCertificate: (batchId: string) =>
    apiClient
      .get<{
        certificate: {
          certificateId: string;
          certificateNumber: string;
          issuedAt: string;
          revokedAt: string | null;
        } | null;
      }>(`/batches/${batchId}/my-certificate`)
      .then((r) => r.data),
  dashboard: () =>
    apiClient
      .get<{
        batches: MyBatch[];
        upcomingLive: Array<
          BatchSession & {
            batch: { batchId: string; title: string; slug: string };
          }
        >;
        openQuizzes: Array<
          BatchQuiz & {
            batch: { batchId: string; title: string; slug: string };
          }
        >;
        recentAnnouncements: Array<
          BatchAnnouncement & {
            batch: { batchId: string; title: string; slug: string };
          }
        >;
        myCertificates: Array<{
          cert: {
            certificateId: string;
            certificateNumber: string;
            issuedAt: string;
          };
          batch: { batchId: string; title: string; slug: string };
        }>;
      }>("/batches/dashboard")
      .then((r) => r.data),
};
