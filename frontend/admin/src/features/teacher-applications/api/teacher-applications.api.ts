import { apiClient } from "@/lib/api/client";

export type TeacherApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface TeacherApplication {
  applicationId: string;
  fullName: string;
  email: string;
  phone: string | null;
  experienceYears: number | null;
  skills: string[];
  categories: string[];
  cvUrl: string | null;
  whyJoin: string | null;
  status: TeacherApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherApplicationsListResponse {
  data: TeacherApplication[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export const teacherApplicationsApi = {
  list: (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page != null) searchParams.set("page", String(params.page));
    if (params?.limit != null) searchParams.set("limit", String(params.limit));
    const q = searchParams.toString();
    return apiClient.get<TeacherApplicationsListResponse>(`/teacher-applications${q ? `?${q}` : ""}`).then((r) => r.data);
  },
  getById: (id: string) =>
    apiClient.get<TeacherApplication>(`/teacher-applications/${id}`).then((r) => r.data),
  updateStatus: (id: string, status: TeacherApplicationStatus) =>
    apiClient.patch(`/teacher-applications/${id}/status`, { status }).then((r) => r.data),
};
