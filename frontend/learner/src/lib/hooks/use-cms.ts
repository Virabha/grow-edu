"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { cmsApi } from "@/lib/api/services/cms";
import type { SubmitServiceApplicationDto } from "@/lib/api/services/cms";
import { queryKeys } from "@/lib/query-keys";

export function useBanners(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.banners(),
    queryFn: cmsApi.getBanners,
    enabled,
  });
}

export function useFaqs(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.faqs(),
    queryFn: cmsApi.getFaqs,
    enabled,
  });
}

export function useWhyChooseUs(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.whyChooseUs(),
    queryFn: cmsApi.getWhyChooseUs,
    enabled,
  });
}

export function useTestimonials(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.testimonials(),
    queryFn: cmsApi.getTestimonials,
    enabled,
  });
}

export function useServices(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.services(),
    queryFn: cmsApi.getServices,
    enabled,
  });
}

export function useInstructors(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.instructors(),
    queryFn: cmsApi.getInstructors,
    enabled,
  });
}

export function useServiceBySlug(slug: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.serviceBySlug(slug ?? ""),
    queryFn: () => cmsApi.getServiceBySlug(slug!),
    enabled: !!slug && enabled,
  });
}

export function useSiteSettings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.siteSettings(),
    queryFn: cmsApi.getAllSiteSettings,
    enabled,
  });
}

export function useSiteSetting<T = unknown>(key: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.siteSetting(key ?? ""),
    queryFn: () => cmsApi.getSiteSetting<T>(key!),
    enabled: !!key && enabled,
  });
}

export function useSubmitServiceApplication() {
  return useMutation({
    mutationFn: (dto: SubmitServiceApplicationDto) => cmsApi.submitServiceApplication(dto),
  });
}
