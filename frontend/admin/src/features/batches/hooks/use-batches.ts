"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { batchesApi } from "../api/batches.api";
import type {
  BatchFilters,
  BatchResourceType,
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
  UpdateBatchAnnouncementDto,
  UpdateBatchDoubtDto,
  UpdateBatchDto,
  UpdateBatchQuizDto,
  UpdateBatchResourceDto,
  UpdateBatchSessionDto,
  UpdateBatchSubjectDto,
  UpdateQuizQuestionDto,
} from "../types";

// ─── Batches ────────────────────────────────────────────────────────────────

export function useBatches(filters?: BatchFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.batches.list(filters),
    queryFn: () => batchesApi.getAll(filters),
    enabled,
  });
}

export function useBatch(idOrSlug: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.batches.detail(idOrSlug ?? undefined),
    queryFn: () => batchesApi.getById(idOrSlug!),
    enabled: !!idOrSlug && enabled,
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBatchDto) => batchesApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.all() }),
  });
}

export function useUpdateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, dto }: { batchId: string; dto: UpdateBatchDto }) =>
      batchesApi.update(batchId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.all() }),
  });
}

export function useDeleteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => batchesApi.remove(batchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.all() }),
  });
}

// ─── Subjects ───────────────────────────────────────────────────────────────

export function useBatchSubjects(batchId: string | null) {
  return useQuery({
    queryKey: queryKeys.batches.subjects(batchId ?? undefined),
    queryFn: () => batchesApi.listSubjects(batchId!),
    enabled: !!batchId,
  });
}

export function useCreateBatchSubject(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBatchSubjectDto) => batchesApi.createSubject(batchId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.batches.subjects(batchId) });
      qc.invalidateQueries({ queryKey: queryKeys.batches.detail(batchId) });
    },
  });
}

export function useUpdateBatchSubject(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subjectId, dto }: { subjectId: string; dto: UpdateBatchSubjectDto }) =>
      batchesApi.updateSubject(batchId, subjectId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.batches.subjects(batchId) });
      qc.invalidateQueries({ queryKey: queryKeys.batches.detail(batchId) });
    },
  });
}

export function useDeleteBatchSubject(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subjectId: string) => batchesApi.deleteSubject(batchId, subjectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.batches.subjects(batchId) });
      qc.invalidateQueries({ queryKey: queryKeys.batches.detail(batchId) });
    },
  });
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export function useBatchSessions(
  batchId: string | null,
  type?: "LIVE" | "RECORDING"
) {
  return useQuery({
    queryKey: queryKeys.batches.sessions(batchId ?? undefined, type),
    queryFn: () => batchesApi.listSessions(batchId!, type),
    enabled: !!batchId,
  });
}

export function useBatchSession(batchId: string | null, sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.batches.session(
      batchId ?? undefined,
      sessionId ?? undefined
    ),
    queryFn: () => batchesApi.getSession(batchId!, sessionId!),
    enabled: !!batchId && !!sessionId,
  });
}

export function useCreateBatchSession(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBatchSessionDto) => batchesApi.createSession(batchId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.all() }),
  });
}

export function useUpdateBatchSession(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, dto }: { sessionId: string; dto: UpdateBatchSessionDto }) =>
      batchesApi.updateSession(batchId, sessionId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.all() }),
  });
}

export function useDeleteBatchSession(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => batchesApi.deleteSession(batchId, sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.all() }),
  });
}

// ─── Enrollments ────────────────────────────────────────────────────────────

export function useBatchEnrollments(
  batchId: string | null,
  params?: { page?: number; limit?: number; search?: string }
) {
  return useQuery({
    queryKey: queryKeys.batches.enrollments(batchId ?? undefined, params),
    queryFn: () => batchesApi.listEnrollments(batchId!, params),
    enabled: !!batchId,
  });
}

export function useAddBatchEnrollments(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBatchEnrollmentsDto) =>
      batchesApi.addEnrollments(batchId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.all() }),
  });
}

export function useRemoveBatchEnrollment(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => batchesApi.removeEnrollment(batchId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.all() }),
  });
}

// ─── Announcements ──────────────────────────────────────────────────────────

export function useBatchAnnouncements(batchId: string | null) {
  return useQuery({
    queryKey: queryKeys.batches.announcements(batchId ?? undefined),
    queryFn: () => batchesApi.listAnnouncements(batchId!),
    enabled: !!batchId,
  });
}

export function useCreateBatchAnnouncement(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBatchAnnouncementDto) =>
      batchesApi.createAnnouncement(batchId, dto),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.batches.announcements(batchId) }),
  });
}

export function useUpdateBatchAnnouncement(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      announcementId,
      dto,
    }: {
      announcementId: string;
      dto: UpdateBatchAnnouncementDto;
    }) => batchesApi.updateAnnouncement(batchId, announcementId, dto),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.batches.announcements(batchId) }),
  });
}

export function useDeleteBatchAnnouncement(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (announcementId: string) =>
      batchesApi.deleteAnnouncement(batchId, announcementId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.batches.announcements(batchId) }),
  });
}

// ─── Resources ──────────────────────────────────────────────────────────────

export function useBatchResources(
  batchId: string | null,
  params?: { type?: BatchResourceType; subjectId?: string }
) {
  return useQuery({
    queryKey: queryKeys.batches.resources(batchId ?? undefined, params),
    queryFn: () => batchesApi.listResources(batchId!, params),
    enabled: !!batchId,
  });
}

export function useCreateBatchResource(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBatchResourceDto) => batchesApi.createResource(batchId, dto),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.batches.resources(batchId) }),
  });
}

export function useUpdateBatchResource(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ resourceId, dto }: { resourceId: string; dto: UpdateBatchResourceDto }) =>
      batchesApi.updateResource(batchId, resourceId, dto),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.batches.resources(batchId) }),
  });
}

export function useDeleteBatchResource(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: string) => batchesApi.deleteResource(batchId, resourceId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.batches.resources(batchId) }),
  });
}

// ─── Doubts ─────────────────────────────────────────────────────────────────

export function useBatchDoubts(
  batchId: string | null,
  params?: { mine?: boolean; status?: string }
) {
  return useQuery({
    queryKey: queryKeys.batches.doubts(batchId ?? undefined, params),
    queryFn: () => batchesApi.listDoubts(batchId!, params),
    enabled: !!batchId,
  });
}

export function useBatchDoubt(batchId: string | null, doubtId: string | null) {
  return useQuery({
    queryKey: queryKeys.batches.doubt(batchId ?? undefined, doubtId ?? undefined),
    queryFn: () => batchesApi.getDoubt(batchId!, doubtId!),
    enabled: !!batchId && !!doubtId,
  });
}

export function useCreateBatchDoubt(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBatchDoubtDto) => batchesApi.createDoubt(batchId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.all() }),
  });
}

export function useUpdateBatchDoubt(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ doubtId, dto }: { doubtId: string; dto: UpdateBatchDoubtDto }) =>
      batchesApi.updateDoubt(batchId, doubtId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.all() }),
  });
}

export function useDeleteBatchDoubt(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doubtId: string) => batchesApi.deleteDoubt(batchId, doubtId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.all() }),
  });
}

export function useReplyToDoubt(batchId: string, doubtId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDoubtReplyDto) => batchesApi.replyToDoubt(batchId, doubtId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.batches.doubt(batchId, doubtId) });
      qc.invalidateQueries({ queryKey: queryKeys.batches.doubts(batchId) });
    },
  });
}

export function useDeleteDoubtReply(batchId: string, doubtId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (replyId: string) => batchesApi.deleteDoubtReply(batchId, doubtId, replyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.batches.doubt(batchId, doubtId) });
      qc.invalidateQueries({ queryKey: queryKeys.batches.doubts(batchId) });
    },
  });
}

// ─── Attendance ─────────────────────────────────────────────────────────────

export function useSessionAttendance(batchId: string | null, sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.batches.attendance(batchId ?? undefined, sessionId ?? undefined),
    queryFn: () => batchesApi.listAttendance(batchId!, sessionId!),
    enabled: !!batchId && !!sessionId,
  });
}

// ─── Quizzes ────────────────────────────────────────────────────────────────

export function useBatchQuizzes(batchId: string | null) {
  return useQuery({
    queryKey: queryKeys.batches.quizzes(batchId ?? undefined),
    queryFn: () => batchesApi.listQuizzes(batchId!),
    enabled: !!batchId,
  });
}

export function useBatchQuiz(batchId: string | null, quizId: string | null) {
  return useQuery({
    queryKey: queryKeys.batches.quiz(batchId ?? undefined, quizId ?? undefined),
    queryFn: () => batchesApi.getQuiz(batchId!, quizId!),
    enabled: !!batchId && !!quizId,
  });
}

export function useCreateBatchQuiz(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBatchQuizDto) => batchesApi.createQuiz(batchId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.all() }),
  });
}

export function useUpdateBatchQuiz(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quizId, dto }: { quizId: string; dto: UpdateBatchQuizDto }) =>
      batchesApi.updateQuiz(batchId, quizId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.all() }),
  });
}

export function useDeleteBatchQuiz(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quizId: string) => batchesApi.deleteQuiz(batchId, quizId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.all() }),
  });
}

export function useCreateQuizQuestion(batchId: string, quizId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateQuizQuestionDto) =>
      batchesApi.createQuizQuestion(batchId, quizId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.quiz(batchId, quizId) }),
  });
}

export function useUpdateQuizQuestion(batchId: string, quizId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, dto }: { questionId: string; dto: UpdateQuizQuestionDto }) =>
      batchesApi.updateQuizQuestion(batchId, quizId, questionId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.quiz(batchId, quizId) }),
  });
}

export function useDeleteQuizQuestion(batchId: string, quizId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) =>
      batchesApi.deleteQuizQuestion(batchId, quizId, questionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.batches.quiz(batchId, quizId) }),
  });
}

export function useQuizLeaderboard(batchId: string | null, quizId: string | null) {
  return useQuery({
    queryKey: queryKeys.batches.leaderboard(batchId ?? undefined, quizId ?? undefined),
    queryFn: () => batchesApi.leaderboard(batchId!, quizId!),
    enabled: !!batchId && !!quizId,
  });
}

export function useBatchAnalytics(batchId: string | null) {
  return useQuery({
    queryKey: ["batches", "analytics", batchId],
    queryFn: () => batchesApi.analytics(batchId!),
    enabled: !!batchId,
  });
}
