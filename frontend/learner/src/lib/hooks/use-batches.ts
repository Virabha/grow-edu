"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  batchesApi,
  type BatchResourceType,
  type BatchSessionType,
  type BatchesListParams,
} from "@/lib/api/services/batches";
import { queryKeys } from "@/lib/query-keys";

const LIVE_REFETCH_MS = 60_000;
const THREAD_REFETCH_MS = 20_000;
const FEED_REFETCH_MS = 45_000;
const SLOW_REFETCH_MS = 90_000;

function liveOpts(intervalMs: number) {
  return {
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true as const,
    refetchOnReconnect: true as const,
  };
}

export function useBatches(params?: BatchesListParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.batches.list(params),
    queryFn: () => batchesApi.list(params),
    enabled,
    ...liveOpts(SLOW_REFETCH_MS),
  });
}

export function useMyBatches(enabled = true) {
  return useQuery({
    queryKey: queryKeys.batches.mine(),
    queryFn: () => batchesApi.mine(),
    enabled,
    ...liveOpts(SLOW_REFETCH_MS),
  });
}

export function useBatchBySlug(slug: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.batches.bySlug(slug ?? ""),
    queryFn: () => batchesApi.bySlug(slug!),
    enabled: !!slug && enabled,
    ...liveOpts(SLOW_REFETCH_MS),
  });
}

export function useBatchSessions(
  batchId: string | null,
  type?: BatchSessionType,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.batches.sessions(batchId ?? "", type),
    queryFn: () => batchesApi.listSessions(batchId!, type),
    enabled: !!batchId && enabled,
    ...liveOpts(LIVE_REFETCH_MS),
  });
}

export function useBatchSession(
  batchId: string | null,
  sessionId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.batches.session(batchId ?? "", sessionId ?? ""),
    queryFn: () => batchesApi.getSession(batchId!, sessionId!),
    enabled: !!batchId && !!sessionId && enabled,
    ...liveOpts(LIVE_REFETCH_MS),
  });
}

export function useBatchAnnouncements(batchId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.batches.announcements(batchId ?? ""),
    queryFn: () => batchesApi.listAnnouncements(batchId!),
    enabled: !!batchId && enabled,
    ...liveOpts(FEED_REFETCH_MS),
  });
}

export function useBatchResources(
  batchId: string | null,
  params?: { type?: BatchResourceType },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.batches.resources(batchId ?? "", params),
    queryFn: () => batchesApi.listResources(batchId!, params),
    enabled: !!batchId && enabled,
    ...liveOpts(FEED_REFETCH_MS),
  });
}

export function useBatchDoubts(
  batchId: string | null,
  params?: { mine?: boolean; status?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.batches.doubts(batchId ?? "", params),
    queryFn: () => batchesApi.listDoubts(batchId!, params),
    enabled: !!batchId && enabled,
    ...liveOpts(FEED_REFETCH_MS),
  });
}

export function useBatchDoubt(batchId: string | null, doubtId: string | null) {
  return useQuery({
    queryKey: queryKeys.batches.doubt(batchId ?? "", doubtId ?? ""),
    queryFn: () => batchesApi.getDoubt(batchId!, doubtId!),
    enabled: !!batchId && !!doubtId,
    ...liveOpts(THREAD_REFETCH_MS),
  });
}

export function useCreateDoubt(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { title: string; body: string; subjectId?: string }) =>
      batchesApi.createDoubt(batchId, dto),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["batches", "doubts", batchId] }),
  });
}

export function useReplyToDoubt(batchId: string, doubtId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => batchesApi.replyToDoubt(batchId, doubtId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.batches.doubt(batchId, doubtId) });
      qc.invalidateQueries({ queryKey: ["batches", "doubts", batchId] });
    },
  });
}

export function useBatchQuizzes(batchId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.batches.quizzes(batchId ?? ""),
    queryFn: () => batchesApi.listQuizzes(batchId!),
    enabled: !!batchId && enabled,
    ...liveOpts(SLOW_REFETCH_MS),
  });
}

export function useBatchQuiz(batchId: string | null, quizId: string | null) {
  return useQuery({
    queryKey: queryKeys.batches.quiz(batchId ?? "", quizId ?? ""),
    queryFn: () => batchesApi.getQuiz(batchId!, quizId!),
    enabled: !!batchId && !!quizId,
    // No interval; polling mid-attempt would clobber locally-tracked answers.
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useStartQuizAttempt(batchId: string, quizId: string) {
  return useMutation({
    mutationFn: () => batchesApi.startAttempt(batchId, quizId),
  });
}

export function useSubmitQuizAttempt(batchId: string, quizId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      attemptId,
      answers,
    }: {
      attemptId: string;
      answers: Record<string, unknown>;
    }) => batchesApi.submitAttempt(batchId, quizId, attemptId, answers),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.batches.quiz(batchId, quizId) }),
  });
}

export function useQuizLeaderboard(batchId: string | null, quizId: string | null) {
  return useQuery({
    queryKey: queryKeys.batches.leaderboard(batchId ?? "", quizId ?? ""),
    queryFn: () => batchesApi.leaderboard(batchId!, quizId!),
    enabled: !!batchId && !!quizId,
    ...liveOpts(SLOW_REFETCH_MS),
  });
}

export function useRecordAttendance(batchId: string) {
  return useMutation({
    mutationFn: ({
      sessionId,
      durationSeconds,
    }: {
      sessionId: string;
      durationSeconds?: number;
    }) => batchesApi.recordAttendance(batchId, sessionId, durationSeconds),
  });
}

export function useStartBatchCheckout() {
  return useMutation({
    mutationFn: ({
      batchId,
      couponCode,
    }: {
      batchId: string;
      couponCode?: string;
    }) => batchesApi.startCheckout(batchId, { couponCode }),
  });
}

export function useBatchDashboard(enabled = true) {
  return useQuery({
    queryKey: ["batches", "dashboard"],
    queryFn: () => batchesApi.dashboard(),
    enabled,
    ...liveOpts(SLOW_REFETCH_MS),
  });
}

export function useMyCertificate(batchId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["batches", "my-certificate", batchId],
    queryFn: () => batchesApi.myCertificate(batchId!),
    enabled: !!batchId && enabled,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useMyBatchProgress(batchId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["batches", "my-progress", batchId],
    queryFn: () => batchesApi.myProgress(batchId!),
    enabled: !!batchId && enabled,
    ...liveOpts(SLOW_REFETCH_MS),
  });
}
