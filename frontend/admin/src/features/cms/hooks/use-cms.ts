"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { cmsApi } from "../api/cms.api";
import type {
  CreateBannerDto,
  UpdateBannerDto,
  CreateFaqDto,
  UpdateFaqDto,
  CreateWhyChooseUsDto,
  UpdateWhyChooseUsDto,
  CreateTestimonialDto,
  UpdateTestimonialDto,
  CreateServiceDto,
  UpdateServiceDto,
  UpsertSiteSettingDto,
} from "../types";

export function useBannersAdmin(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.banners(),
    queryFn: cmsApi.banners.getAllAdmin,
    enabled,
  });
}

export function useBannerById(id: string | null, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.cms.banners(), id],
    queryFn: () => cmsApi.banners.getById(id!),
    enabled: !!id && enabled,
  });
}

export function useCreateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBannerDto) => cmsApi.banners.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.banners() }),
  });
}

export function useUpdateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateBannerDto }) => cmsApi.banners.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.banners() }),
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cmsApi.banners.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.banners() }),
  });
}

export function useToggleBannerStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bannerId, activate }: { bannerId: string; activate: boolean }) =>
      activate ? cmsApi.banners.activate(bannerId) : cmsApi.banners.deactivate(bannerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.banners() }),
  });
}

export function useFaqsAdmin(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.faqs(),
    queryFn: cmsApi.faqs.getAllAdmin,
    enabled,
  });
}

export function useFaqById(id: string | null, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.cms.faqs(), id],
    queryFn: () => cmsApi.faqs.getById(id!),
    enabled: !!id && enabled,
  });
}

export function useCreateFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateFaqDto) => cmsApi.faqs.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.faqs() }),
  });
}

export function useUpdateFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateFaqDto }) => cmsApi.faqs.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.faqs() }),
  });
}

export function useDeleteFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cmsApi.faqs.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.faqs() }),
  });
}

export function useWhyChooseUsAdmin(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.whyChooseUs(),
    queryFn: cmsApi.whyChooseUs.getAllAdmin,
    enabled,
  });
}

export function useWhyChooseUsById(id: string | null, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.cms.whyChooseUs(), id],
    queryFn: () => cmsApi.whyChooseUs.getById(id!),
    enabled: !!id && enabled,
  });
}

export function useCreateWhyChooseUs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateWhyChooseUsDto) => cmsApi.whyChooseUs.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.whyChooseUs() }),
  });
}

export function useUpdateWhyChooseUs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateWhyChooseUsDto }) =>
      cmsApi.whyChooseUs.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.whyChooseUs() }),
  });
}

export function useDeleteWhyChooseUs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cmsApi.whyChooseUs.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.whyChooseUs() }),
  });
}

export function useTestimonialsAdmin(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.testimonials(),
    queryFn: cmsApi.testimonials.getAllAdmin,
    enabled,
  });
}

export function useTestimonialById(id: string | null, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.cms.testimonials(), id],
    queryFn: () => cmsApi.testimonials.getById(id!),
    enabled: !!id && enabled,
  });
}

export function useCreateTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTestimonialDto) => cmsApi.testimonials.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.testimonials() }),
  });
}

export function useUpdateTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTestimonialDto }) =>
      cmsApi.testimonials.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.testimonials() }),
  });
}

export function useDeleteTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cmsApi.testimonials.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.testimonials() }),
  });
}

export function useServicesAdmin(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.services(),
    queryFn: cmsApi.services.getAllAdmin,
    enabled,
  });
}

export function useServiceById(id: string | null, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.cms.services(), id],
    queryFn: () => cmsApi.services.getById(id!),
    enabled: !!id && enabled,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateServiceDto) => cmsApi.services.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.services() }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateServiceDto }) =>
      cmsApi.services.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.services() }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cmsApi.services.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.services() }),
  });
}

export function useSiteSettingsAdmin(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.siteSettings(),
    queryFn: cmsApi.siteSettings.getAllAdmin,
    enabled,
  });
}

export function useUpsertSiteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpsertSiteSettingDto) => cmsApi.siteSettings.upsert(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.siteSettings() }),
  });
}

export function useDeleteSiteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => cmsApi.siteSettings.delete(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cms.siteSettings() }),
  });
}

export function useInstructors(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.instructors(),
    queryFn: cmsApi.instructors.getList,
    enabled,
  });
}

// ==================== SERVICE APPLICATIONS ====================

export function useServiceApplications(params?: { serviceId?: string; status?: string; search?: string; page?: number; limit?: number }, enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.serviceApplications(params),
    queryFn: () => cmsApi.serviceApplications.getAll(params),
    enabled,
  });
}

export function useServiceApplicationById(id: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.serviceApplication(id ?? undefined),
    queryFn: () => cmsApi.serviceApplications.getById(id!),
    enabled: !!id && enabled,
  });
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) =>
      cmsApi.serviceApplications.updateStatus(id, { status, adminNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cms.all() });
    },
  });
}

export function useDeleteServiceApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cmsApi.serviceApplications.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cms.all() });
    },
  });
}
