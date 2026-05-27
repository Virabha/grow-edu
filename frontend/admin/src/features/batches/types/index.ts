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

// ─── Resources ──────────────────────────────────────────────────────────────

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
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBatchResourceDto {
  title: string;
  description?: string;
  type: BatchResourceType;
  fileKey: string;
  subjectId?: string;
  fileSize?: number;
  pageCount?: number;
  dayNumber?: number;
  publishAt?: string;
}

export type UpdateBatchResourceDto = Partial<CreateBatchResourceDto>;

// ─── Doubts ─────────────────────────────────────────────────────────────────

export type BatchDoubtStatus = "OPEN" | "ANSWERED" | "CLOSED";

export interface DoubtAuthor {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  profileImage: string | null;
  role?: string;
}

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
  updatedAt: string;
  author: DoubtAuthor;
}

export interface BatchDoubtReply {
  replyId: string;
  doubtId: string;
  authorId: string;
  body: string;
  attachments: string[];
  isOfficial: boolean;
  createdAt: string;
  author: DoubtAuthor;
}

export interface BatchDoubtDetail extends BatchDoubt {
  replies: BatchDoubtReply[];
}

export interface CreateBatchDoubtDto {
  title: string;
  body: string;
  subjectId?: string;
  attachments?: string[];
}

export interface UpdateBatchDoubtDto extends Partial<CreateBatchDoubtDto> {
  status?: BatchDoubtStatus;
}

export interface CreateDoubtReplyDto {
  body: string;
  attachments?: string[];
}

// ─── Attendance ─────────────────────────────────────────────────────────────

export interface AttendanceRow {
  attendanceId: string;
  batchId: string;
  sessionId: string;
  userId: string;
  joinedAt: string;
  durationSeconds: number | null;
  user: {
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profileImage: string | null;
  };
}

// ─── Quizzes ────────────────────────────────────────────────────────────────

export type QuizQuestionType = "MCQ_SINGLE" | "MCQ_MULTI" | "NUMERICAL";
export type QuizAttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";

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
  createdAt: string;
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
  updatedAt: string;
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

export interface CreateBatchQuizDto {
  title: string;
  description?: string;
  subjectId?: string;
  durationMinutes: number;
  maxAttempts: number;
  negativeMarkPercent: number;
  passingPercent: number;
  showLeaderboard?: boolean;
  showSolutions?: boolean;
  opensAt?: string;
  closesAt?: string;
  publish?: boolean;
}

export type UpdateBatchQuizDto = Partial<CreateBatchQuizDto>;

export interface CreateQuizQuestionDto {
  order: number;
  type: QuizQuestionType;
  prompt: string;
  options?: QuizOption[];
  correctAnswer: unknown;
  marks: number;
  explanation?: string;
}

export type UpdateQuizQuestionDto = Partial<CreateQuizQuestionDto>;

export interface LeaderboardEntry {
  userId: string;
  name: string;
  profileImage: string | null;
  score: number | null;
  maxScore: number | null;
  submittedAt: string | null;
  rank: number;
}
