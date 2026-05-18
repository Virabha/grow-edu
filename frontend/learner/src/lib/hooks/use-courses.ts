"use client";

import { useQuery } from "@tanstack/react-query";
import { coursesApi, type CoursesParams } from "@/lib/api/services/courses";
import { queryKeys } from "@/lib/query-keys";

export function useCourses(params?: CoursesParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.courses.list(params),
    queryFn: () => coursesApi.getCourses(params),
    enabled,
  });
}

export function useCourseBySlug(slug: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.courses.bySlug(slug ?? ""),
    queryFn: () => coursesApi.getBySlug(slug!),
    enabled: !!slug && enabled,
  });
}

export function useCourseById(courseId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.courses.byId(courseId ?? ""),
    queryFn: () => coursesApi.getById(courseId!),
    enabled: !!courseId && enabled,
  });
}
