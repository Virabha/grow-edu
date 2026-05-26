"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { batchesApi } from "../api/batches.api";
import type {
  BatchFilters,
  CreateBatchAnnouncementDto,
  CreateBatchDto,
  CreateBatchEnrollmentsDto,
  CreateBatchSessionDto,
  CreateBatchSubjectDto,
  UpdateBatchAnnouncementDto,
  UpdateBatchDto,
  UpdateBatchSessionDto,
  UpdateBatchSubjectDto,
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
