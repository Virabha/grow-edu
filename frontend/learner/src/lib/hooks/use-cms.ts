"use client";

import { useQuery } from "@tanstack/react-query";
import { cmsApi } from "@/lib/api/services/cms";
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
