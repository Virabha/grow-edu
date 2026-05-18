import { apiClient } from "../client";

export interface CreateContactParams {
  name: string;
  email: string;
  mobile?: string;
  subject: string;
  courseInterested?: string;
  role?: string;
  message: string;
  documentUrl?: string;
}

export interface SubscribeParams {
  email: string;
}

export const contactApi = {
  submit: (data: CreateContactParams) =>
    apiClient.post("/contact", data).then((r) => r.data),
  subscribe: (data: SubscribeParams) =>
    apiClient.post("/subscribe", data).then((r) => r.data),
  uploadDocument: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("key", `documents/contact/${Date.now()}-${file.name}`);
    return apiClient
      .post<{ url: string; key: string }>("/storage/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};
