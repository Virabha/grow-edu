"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";

export interface Profile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImage?: string | null;
}

function getProfile() {
  return apiClient.get<Profile>("/users/me").then((r) => r.data);
}

function updateProfile(data: {
  firstName?: string;
  lastName?: string;
  profileImage?: string | null;
}) {
  return apiClient.patch<Profile>("/users/me", data).then((r) => r.data);
}

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: getProfile,
    enabled,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
    },
  });
}
