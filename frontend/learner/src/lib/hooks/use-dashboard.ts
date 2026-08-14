"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import type { Enrollment } from "@/lib/hooks/use-enrollments";
import type { Order } from "@/lib/hooks/use-orders";
import type { QuizAttempt } from "@/lib/hooks/use-quiz-attempts";

export interface DashboardStats {
  enrolledCount: number;
  activeCount: number;
  completedCount: number;
  lessonsCompleted: number;
  quizzesAttempted: number;
  averageQuizScore: number;
  certificatesEarned: number;
  totalSpend: number;
  currency: string;
  studyStreakDays: number;
  studyMinutesThisWeek: number;
}

export interface DashboardSummary {
  stats: DashboardStats;
  activity: { day: string; minutes: number }[];
  continueLearning: Enrollment[];
  recentAttempts: QuizAttempt[];
  recentOrders: Order[];
}

export function useDashboardSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () =>
      apiClient
        .get<DashboardSummary>("/dashboard/summary")
        .then((r) => r.data),
    enabled,
  });
}
