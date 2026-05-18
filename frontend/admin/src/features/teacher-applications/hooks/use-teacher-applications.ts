"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { teacherApplicationsApi, type TeacherApplicationStatus } from "../api/teacher-applications.api";

export function useTeacherApplicationsList(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.teacherApplications.list(params),
    queryFn: () => teacherApplicationsApi.list(params),
  });
}

export function useTeacherApplicationById(id: string | null) {
  return useQuery({
    queryKey: queryKeys.teacherApplications.detail(id ?? undefined),
    queryFn: () => teacherApplicationsApi.getById(id!),
    enabled: !!id,
  });
}

export function useUpdateTeacherApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TeacherApplicationStatus }) =>
      teacherApplicationsApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.teacherApplications.all() }),
  });
}
