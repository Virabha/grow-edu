import { apiClient } from "@/lib/api/client";
import type {
  Batch,
  BatchAnnouncement,
  BatchDetail,
  BatchEnrollment,
  BatchFilters,
  BatchesResponse,
  BatchSession,
  BatchSubject,
  CreateBatchAnnouncementDto,
  CreateBatchDto,
  CreateBatchEnrollmentsDto,
  CreateBatchSessionDto,
  CreateBatchSubjectDto,
  EnrollmentsResponse,
  UpdateBatchAnnouncementDto,
  UpdateBatchDto,
  UpdateBatchSessionDto,
  UpdateBatchSubjectDto,
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
};
