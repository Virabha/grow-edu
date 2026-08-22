"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { cmsApi, type ServiceApplicationInput } from "@/lib/api/services/cms";
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

export function useInstructors(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.instructors(),
    queryFn: cmsApi.getInstructors,
    enabled,
  });
}

export function useSiteSettings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.siteSettings(),
    queryFn: cmsApi.getAllSiteSettings,
    enabled,
  });
}

export function useService(slug: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.cms.service(slug),
    queryFn: () => cmsApi.getServiceBySlug(slug),
    enabled,
    retry: false,
  });
}

export function useSubmitServiceApplication(serviceId: string | undefined) {
  return useMutation({
    mutationFn: (input: ServiceApplicationInput) => {
      if (!serviceId) throw new Error("Applications are not open yet");
      return cmsApi.submitServiceApplication(serviceId, input);
    },
  });
}
