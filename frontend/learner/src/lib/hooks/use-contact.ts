"use client";

import { useMutation } from "@tanstack/react-query";
import {
  contactApi,
  type CreateContactParams,
  type SubscribeParams,
} from "@/lib/api/services/contact";

export function useSubmitContact() {
  return useMutation({
    mutationFn: (data: CreateContactParams) => contactApi.submit(data),
  });
}

export function useSubscribe() {
  return useMutation({
    mutationFn: (data: SubscribeParams) => contactApi.subscribe(data),
  });
}

export function useUploadDocument() {
  return useMutation({
    mutationFn: (file: File) => contactApi.uploadDocument(file),
  });
}
