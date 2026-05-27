import { apiClient } from "@/lib/api/client";
import type {
  AttendanceRow,
  Batch,
  BatchAnnouncement,
  BatchDetail,
  BatchDoubt,
  BatchDoubtDetail,
  BatchDoubtReply,
  BatchEnrollment,
  BatchFilters,
  BatchQuiz,
  BatchQuizDetail,
  BatchResource,
  BatchResourceType,
  BatchesResponse,
  BatchSession,
  BatchSubject,
  CreateBatchAnnouncementDto,
  CreateBatchDoubtDto,
  CreateBatchDto,
  CreateBatchEnrollmentsDto,
  CreateBatchQuizDto,
  CreateBatchResourceDto,
  CreateBatchSessionDto,
  CreateBatchSubjectDto,
  CreateDoubtReplyDto,
  CreateQuizQuestionDto,
  EnrollmentsResponse,
  LeaderboardEntry,
  QuizAttempt,
  QuizQuestion,
  UpdateBatchAnnouncementDto,
  UpdateBatchDoubtDto,
  UpdateBatchDto,
  UpdateBatchQuizDto,
  UpdateBatchResourceDto,
  UpdateBatchSessionDto,
  UpdateBatchSubjectDto,
  UpdateQuizQuestionDto,
} from "../types";

export const batchesApi = {
  // Batches
  getAll: (filters?: BatchFilters) =>
    apiClient.get<BatchesResponse>("/batches", { params: filters }).then((r) => r.data),
  getById: (idOrSlug: string) =>
    apiClient.get<BatchDetail>(`/batches/${idOrSlug}`).then((r) => r.data),
  create: (dto: CreateBatchDto) =>
    apiClient.post<Batch>("/batches", dto).then((r) => r.data),
  update: (batchId: string, dto: UpdateBatchDto) =>
    apiClient.patch<Batch>(`/batches/${batchId}`, dto).then((r) => r.data),
  remove: (batchId: string) =>
    apiClient.delete<{ success: boolean }>(`/batches/${batchId}`).then((r) => r.data),

  // Subjects
  listSubjects: (batchId: string) =>
    apiClient.get<BatchSubject[]>(`/batches/${batchId}/subjects`).then((r) => r.data),
  createSubject: (batchId: string, dto: CreateBatchSubjectDto) =>
    apiClient.post<BatchSubject>(`/batches/${batchId}/subjects`, dto).then((r) => r.data),
  updateSubject: (batchId: string, subjectId: string, dto: UpdateBatchSubjectDto) =>
    apiClient
      .patch<BatchSubject>(`/batches/${batchId}/subjects/${subjectId}`, dto)
      .then((r) => r.data),
  deleteSubject: (batchId: string, subjectId: string) =>
    apiClient
      .delete<{ success: boolean }>(`/batches/${batchId}/subjects/${subjectId}`)
      .then((r) => r.data),

  // Sessions
  listSessions: (batchId: string, type?: "LIVE" | "RECORDING") =>
    apiClient
      .get<BatchSession[]>(`/batches/${batchId}/sessions`, { params: type ? { type } : {} })
      .then((r) => r.data),
  getSession: (batchId: string, sessionId: string) =>
    apiClient
      .get<BatchSession>(`/batches/${batchId}/sessions/${sessionId}`)
      .then((r) => r.data),
  createSession: (batchId: string, dto: CreateBatchSessionDto) =>
    apiClient
      .post<BatchSession>(`/batches/${batchId}/sessions`, dto)
      .then((r) => r.data),
  updateSession: (batchId: string, sessionId: string, dto: UpdateBatchSessionDto) =>
    apiClient
      .patch<BatchSession>(`/batches/${batchId}/sessions/${sessionId}`, dto)
      .then((r) => r.data),
  deleteSession: (batchId: string, sessionId: string) =>
    apiClient
      .delete<{ success: boolean }>(`/batches/${batchId}/sessions/${sessionId}`)
      .then((r) => r.data),

  // Enrollments
  listEnrollments: (batchId: string, params?: { page?: number; limit?: number; search?: string }) =>
    apiClient
      .get<EnrollmentsResponse>(`/batches/${batchId}/enrollments`, { params })
      .then((r) => r.data),
  addEnrollments: (batchId: string, dto: CreateBatchEnrollmentsDto) =>
    apiClient
      .post<{ enrolled: number; alreadyEnrolled: number; notFoundEmails: string[] }>(
        `/batches/${batchId}/enrollments`,
        dto
      )
      .then((r) => r.data),
  removeEnrollment: (batchId: string, userId: string) =>
    apiClient
      .delete<{ success: boolean }>(`/batches/${batchId}/enrollments/${userId}`)
      .then((r) => r.data),

  // Announcements
  listAnnouncements: (batchId: string) =>
    apiClient
      .get<BatchAnnouncement[]>(`/batches/${batchId}/announcements`)
      .then((r) => r.data),
  createAnnouncement: (batchId: string, dto: CreateBatchAnnouncementDto) =>
    apiClient
      .post<BatchAnnouncement>(`/batches/${batchId}/announcements`, dto)
      .then((r) => r.data),
  updateAnnouncement: (
    batchId: string,
    announcementId: string,
    dto: UpdateBatchAnnouncementDto
  ) =>
    apiClient
      .patch<BatchAnnouncement>(
        `/batches/${batchId}/announcements/${announcementId}`,
        dto
      )
      .then((r) => r.data),
  deleteAnnouncement: (batchId: string, announcementId: string) =>
    apiClient
      .delete<{ success: boolean }>(`/batches/${batchId}/announcements/${announcementId}`)
      .then((r) => r.data),

  // Resources
  listResources: (batchId: string, params?: { type?: BatchResourceType; subjectId?: string }) =>
    apiClient
      .get<BatchResource[]>(`/batches/${batchId}/resources`, { params })
      .then((r) => r.data),
  createResource: (batchId: string, dto: CreateBatchResourceDto) =>
    apiClient
      .post<BatchResource>(`/batches/${batchId}/resources`, dto)
      .then((r) => r.data),
  updateResource: (batchId: string, resourceId: string, dto: UpdateBatchResourceDto) =>
    apiClient
      .patch<BatchResource>(`/batches/${batchId}/resources/${resourceId}`, dto)
      .then((r) => r.data),
  deleteResource: (batchId: string, resourceId: string) =>
    apiClient
      .delete<{ success: boolean }>(`/batches/${batchId}/resources/${resourceId}`)
      .then((r) => r.data),

  // Doubts
  listDoubts: (batchId: string, params?: { mine?: boolean; status?: string }) =>
    apiClient
      .get<BatchDoubt[]>(`/batches/${batchId}/doubts`, { params })
      .then((r) => r.data),
  getDoubt: (batchId: string, doubtId: string) =>
    apiClient
      .get<BatchDoubtDetail>(`/batches/${batchId}/doubts/${doubtId}`)
      .then((r) => r.data),
  createDoubt: (batchId: string, dto: CreateBatchDoubtDto) =>
    apiClient
      .post<BatchDoubt>(`/batches/${batchId}/doubts`, dto)
      .then((r) => r.data),
  updateDoubt: (batchId: string, doubtId: string, dto: UpdateBatchDoubtDto) =>
    apiClient
      .patch<BatchDoubt>(`/batches/${batchId}/doubts/${doubtId}`, dto)
      .then((r) => r.data),
  deleteDoubt: (batchId: string, doubtId: string) =>
    apiClient
      .delete<{ success: boolean }>(`/batches/${batchId}/doubts/${doubtId}`)
      .then((r) => r.data),
  replyToDoubt: (batchId: string, doubtId: string, dto: CreateDoubtReplyDto) =>
    apiClient
      .post<BatchDoubtReply>(`/batches/${batchId}/doubts/${doubtId}/replies`, dto)
      .then((r) => r.data),
  deleteDoubtReply: (batchId: string, doubtId: string, replyId: string) =>
    apiClient
      .delete<{ success: boolean }>(
        `/batches/${batchId}/doubts/${doubtId}/replies/${replyId}`
      )
      .then((r) => r.data),

  // Attendance
  listAttendance: (batchId: string, sessionId: string) =>
    apiClient
      .get<AttendanceRow[]>(`/batches/${batchId}/sessions/${sessionId}/attendance`)
      .then((r) => r.data),

  // Quizzes
  listQuizzes: (batchId: string) =>
    apiClient.get<BatchQuiz[]>(`/batches/${batchId}/quizzes`).then((r) => r.data),
  getQuiz: (batchId: string, quizId: string) =>
    apiClient
      .get<BatchQuizDetail>(`/batches/${batchId}/quizzes/${quizId}`)
      .then((r) => r.data),
  createQuiz: (batchId: string, dto: CreateBatchQuizDto) =>
    apiClient
      .post<BatchQuiz>(`/batches/${batchId}/quizzes`, dto)
      .then((r) => r.data),
  updateQuiz: (batchId: string, quizId: string, dto: UpdateBatchQuizDto) =>
    apiClient
      .patch<BatchQuiz>(`/batches/${batchId}/quizzes/${quizId}`, dto)
      .then((r) => r.data),
  deleteQuiz: (batchId: string, quizId: string) =>
    apiClient
      .delete<{ success: boolean }>(`/batches/${batchId}/quizzes/${quizId}`)
      .then((r) => r.data),
  createQuizQuestion: (batchId: string, quizId: string, dto: CreateQuizQuestionDto) =>
    apiClient
      .post<QuizQuestion>(`/batches/${batchId}/quizzes/${quizId}/questions`, dto)
      .then((r) => r.data),
  updateQuizQuestion: (
    batchId: string,
    quizId: string,
    questionId: string,
    dto: UpdateQuizQuestionDto
  ) =>
    apiClient
      .patch<QuizQuestion>(
        `/batches/${batchId}/quizzes/${quizId}/questions/${questionId}`,
        dto
      )
      .then((r) => r.data),
  deleteQuizQuestion: (batchId: string, quizId: string, questionId: string) =>
    apiClient
      .delete<{ success: boolean }>(
        `/batches/${batchId}/quizzes/${quizId}/questions/${questionId}`
      )
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

  analytics: (batchId: string) =>
    apiClient
      .get<{
        enrollmentCount: number;
        liveSessions: number;
        recordings: number;
        resources: number;
        doubts: number;
        openDoubts: number;
        quizzes: number;
        avgAttendancePercent: number;
        avgQuizScorePercent: number | null;
      }>(`/batches/${batchId}/analytics`)
      .then((r) => r.data),
};
