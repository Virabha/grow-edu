"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import type { Course } from "@/lib/api/services/courses";

export interface Enrollment {
  enrollmentId: string;
  userId: string;
  courseId: string;
  status: string;
  accessType: string;
  enrolledAt: string;
  course?: Course;
  accessedSections?: { sectionId: string; title: string }[];
  /** Present when the list is served with progress joined in. */
  progressPercent?: number;
  lessonsCompleted?: number;
  lastAccessedAt?: string | null;
}

interface EnrollmentsResponse {
  data: Enrollment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface EnrollmentsFilters {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

function getEnrollments(filters?: EnrollmentsFilters) {
  return apiClient
    .get<EnrollmentsResponse>("/enrollments", { params: filters })
    .then((r) => r.data);
}

export function useEnrollments(options?: {
  enabled?: boolean;
  filters?: EnrollmentsFilters;
}) {
  const { enabled = true, filters } = options ?? {};
  return useQuery({
    queryKey: queryKeys.enrollments.list(filters as Record<string, unknown>),
    queryFn: () => getEnrollments(filters),
    enabled,
  });
}
