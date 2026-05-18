import { apiClient } from "../client";

export interface SubmitTeacherApplicationDto {
  fullName: string;
  email: string;
  phone?: string;
  experienceYears?: number;
  skills?: string[];
  categories?: string[];
  cvUrl?: string;
  whyJoin?: string;
}

export const teacherApplicationsApi = {
  uploadCv: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient
      .post<{ url: string; key: string }>("/teacher-applications/upload-cv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  submit: (data: SubmitTeacherApplicationDto) =>
    apiClient.post("/teacher-applications", data).then((r) => r.data),
};
