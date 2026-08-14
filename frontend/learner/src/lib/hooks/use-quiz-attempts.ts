"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";

export interface QuizAnswer {
  questionId: string;
  question: string;
  options: string[];
  correctIndex: number;
  chosenIndex: number | null;
  explanation: string;
}

export interface QuizAttempt {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  courseId: string;
  courseTitle: string;
  lessonTitle: string;
  totalQuestions: number;
  correctCount: number;
  scorePercent: number;
  passMark: number;
  passed: boolean;
  durationSeconds: number;
  attemptNo: number;
  submittedAt: string;
  answers: QuizAnswer[];
}

interface AttemptsResponse {
  data: QuizAttempt[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface AttemptFilters {
  courseId?: string;
  result?: "all" | "passed" | "failed";
  page?: number;
  limit?: number;
}

export function useQuizAttempts(filters?: AttemptFilters) {
  return useQuery({
    queryKey: queryKeys.quizAttempts.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient
        .get<AttemptsResponse>("/quiz-attempts", { params: filters })
        .then((r) => r.data),
  });
}

export function useQuizAttempt(attemptId: string | null) {
  return useQuery({
    queryKey: queryKeys.quizAttempts.byId(attemptId ?? ""),
    enabled: !!attemptId,
    queryFn: () =>
      apiClient
        .get<QuizAttempt>(`/quiz-attempts/${attemptId}`)
        .then((r) => r.data),
  });
}
