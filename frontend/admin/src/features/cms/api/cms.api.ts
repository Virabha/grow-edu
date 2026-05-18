import { apiClient } from "@/lib/api/client";
import type {
  Banner,
  CreateBannerDto,
  UpdateBannerDto,
  Faq,
  CreateFaqDto,
  UpdateFaqDto,
  WhyChooseUs,
  CreateWhyChooseUsDto,
  UpdateWhyChooseUsDto,
  Testimonial,
  CreateTestimonialDto,
  UpdateTestimonialDto,
  Service,
  CreateServiceDto,
  UpdateServiceDto,
  SiteSetting,
  UpsertSiteSettingDto,
  Instructor,
  ServiceApplication,
  ServiceApplicationsResponse,
} from "../types";

const prefix = "/cms";

export const cmsApi = {
  banners: {
    getAllAdmin: () => apiClient.get<Banner[]>(`${prefix}/banners/admin`).then((r) => r.data),
    getById: (id: string) => apiClient.get<Banner>(`${prefix}/banners/admin/${id}`).then((r) => r.data),
    create: (dto: CreateBannerDto) => apiClient.post<Banner>(`${prefix}/banners`, dto).then((r) => r.data),
    update: (id: string, dto: UpdateBannerDto) => apiClient.put<Banner>(`${prefix}/banners/${id}`, dto).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`${prefix}/banners/${id}`).then((r) => r.data),
    activate: (id: string) => apiClient.patch<{ bannerId: string; isActive: boolean }>(`${prefix}/banners/${id}/activate`).then((r) => r.data),
    deactivate: (id: string) => apiClient.patch<{ bannerId: string; isActive: boolean }>(`${prefix}/banners/${id}/deactivate`).then((r) => r.data),
  },
  faqs: {
    getAllAdmin: () => apiClient.get<Faq[]>(`${prefix}/faqs/admin`).then((r) => r.data),
    getById: (id: string) => apiClient.get<Faq>(`${prefix}/faqs/admin/${id}`).then((r) => r.data),
    create: (dto: CreateFaqDto) => apiClient.post<Faq>(`${prefix}/faqs`, dto).then((r) => r.data),
    update: (id: string, dto: UpdateFaqDto) => apiClient.put<Faq>(`${prefix}/faqs/${id}`, dto).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`${prefix}/faqs/${id}`).then((r) => r.data),
  },
  whyChooseUs: {
    getAllAdmin: () => apiClient.get<WhyChooseUs[]>(`${prefix}/why-choose-us/admin`).then((r) => r.data),
    getById: (id: string) => apiClient.get<WhyChooseUs>(`${prefix}/why-choose-us/admin/${id}`).then((r) => r.data),
    create: (dto: CreateWhyChooseUsDto) => apiClient.post<WhyChooseUs>(`${prefix}/why-choose-us`, dto).then((r) => r.data),
    update: (id: string, dto: UpdateWhyChooseUsDto) =>
      apiClient.put<WhyChooseUs>(`${prefix}/why-choose-us/${id}`, dto).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`${prefix}/why-choose-us/${id}`).then((r) => r.data),
  },
  testimonials: {
    getAllAdmin: () => apiClient.get<Testimonial[]>(`${prefix}/testimonials/admin`).then((r) => r.data),
    getById: (id: string) => apiClient.get<Testimonial>(`${prefix}/testimonials/admin/${id}`).then((r) => r.data),
    create: (dto: CreateTestimonialDto) => apiClient.post<Testimonial>(`${prefix}/testimonials`, dto).then((r) => r.data),
    update: (id: string, dto: UpdateTestimonialDto) =>
      apiClient.put<Testimonial>(`${prefix}/testimonials/${id}`, dto).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`${prefix}/testimonials/${id}`).then((r) => r.data),
  },
  services: {
    getAllAdmin: () => apiClient.get<Service[]>(`${prefix}/services/admin`).then((r) => r.data),
    getById: (id: string) => apiClient.get<Service>(`${prefix}/services/admin/${id}`).then((r) => r.data),
    create: (dto: CreateServiceDto) => apiClient.post<Service>(`${prefix}/services`, dto).then((r) => r.data),
    update: (id: string, dto: UpdateServiceDto) =>
      apiClient.put<Service>(`${prefix}/services/${id}`, dto).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`${prefix}/services/${id}`).then((r) => r.data),
  },
  siteSettings: {
    getAllAdmin: () => apiClient.get<SiteSetting[]>(`${prefix}/site-settings/admin/list`).then((r) => r.data),
    upsert: (dto: UpsertSiteSettingDto) =>
      apiClient.post<SiteSetting>(`${prefix}/site-settings`, dto).then((r) => r.data),
    delete: (key: string) => apiClient.delete(`${prefix}/site-settings/${key}`).then((r) => r.data),
  },
  instructors: {
    getList: () => apiClient.get<Instructor[]>(`${prefix}/instructors`).then((r) => r.data),
  },
  serviceApplications: {
    getAll: (params?: { page?: number; limit?: number; serviceId?: string; status?: string; search?: string }) =>
      apiClient.get<ServiceApplicationsResponse>(`${prefix}/service-applications/admin`, { params }).then((r) => r.data),
    getById: (id: string) =>
      apiClient.get<ServiceApplication>(`${prefix}/service-applications/admin/${id}`).then((r) => r.data),
    updateStatus: (id: string, data: { status: string; adminNotes?: string }) =>
      apiClient.patch<ServiceApplication>(`${prefix}/service-applications/admin/${id}/status`, data).then((r) => r.data),
    delete: (id: string) =>
      apiClient.delete(`${prefix}/service-applications/admin/${id}`).then((r) => r.data),
  },
};
