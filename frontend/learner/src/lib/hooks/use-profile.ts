"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";

export interface ProfileSocial {
  website: string;
  linkedin: string;
  twitter: string;
  github: string;
}

export interface Profile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImage?: string | null;
  headline?: string;
  bio?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  social?: ProfileSocial;
}

export interface Device {
  deviceId: string;
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet";
  location: string;
  ipAddress: string;
  lastActiveAt: string;
  current: boolean;
}

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | "firstName"
    | "lastName"
    | "profileImage"
    | "headline"
    | "bio"
    | "phone"
    | "addressLine"
    | "city"
    | "state"
    | "country"
    | "postalCode"
  >
> & { social?: Partial<ProfileSocial> };

function getProfile() {
  return apiClient.get<Profile>("/users/me").then((r) => r.data);
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
    mutationFn: (data: ProfileUpdate) =>
      apiClient.patch<Profile>("/users/me", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiClient
        .post<{ message: string }>("/users/me/password", data)
        .then((r) => r.data),
  });
}

export function useChangeEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string }) =>
      apiClient
        .post<{ message: string; email: string }>("/users/me/email", data)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() });
    },
  });
}

export function useDevices() {
  return useQuery({
    queryKey: queryKeys.profile.devices(),
    queryFn: () => apiClient.get<Device[]>("/users/me/devices").then((r) => r.data),
  });
}

export function useSignOutDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) =>
      apiClient
        .delete<{ message: string }>(`/users/me/devices/${deviceId}`)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.devices() });
    },
  });
}

export function useSignOutOtherDevices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient
        .post<{ message: string; removed: number }>(
          "/users/me/devices/logout-others",
        )
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.devices() });
    },
  });
}
