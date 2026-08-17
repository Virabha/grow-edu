"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGet, axiosPatch } from "@/lib/api/client";

export interface MeProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  profileImage: string | null;
  emailVerified: boolean;
  companyId: string | null;
  headline: string | null;
  bio: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  social: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateMeDto {
  firstName?: string;
  lastName?: string;
  profileImage?: string | null;
  headline?: string;
  bio?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  social?: Record<string, string>;
}

const ME_KEY = ["users", "me"] as const;

export function useProfile() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      const res = await axiosGet<MeProfile>("users/me");
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateMeDto) => {
      const res = await axiosPatch<MeProfile>("users/me", data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(ME_KEY, data);
    },
  });
}
