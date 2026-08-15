"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { meetingCredentialsApi } from "../api/meeting-credentials.api";
import type {
  UpsertZoomCredentialsInput,
  UpsertJitsiCredentialsInput,
} from "../types/meeting-credentials";

const QUERY_KEY = ["instructor", "meeting-credentials"] as const;

export function useMeetingCredentials() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => meetingCredentialsApi.get(),
  });
}

export function useUpsertZoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertZoomCredentialsInput) =>
      meetingCredentialsApi.upsertZoom(input),
    onSuccess: (data) => {
      qc.setQueryData(QUERY_KEY, data);
    },
  });
}

export function useClearZoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => meetingCredentialsApi.clearZoom(),
    onSuccess: (data) => {
      qc.setQueryData(QUERY_KEY, data);
    },
  });
}

export function useUpsertJitsi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertJitsiCredentialsInput) =>
      meetingCredentialsApi.upsertJitsi(input),
    onSuccess: (data) => {
      qc.setQueryData(QUERY_KEY, data);
    },
  });
}

export function useClearJitsi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => meetingCredentialsApi.clearJitsi(),
    onSuccess: (data) => {
      qc.setQueryData(QUERY_KEY, data);
    },
  });
}
