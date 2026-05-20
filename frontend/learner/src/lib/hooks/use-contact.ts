"use client";

import { useMutation } from "@tanstack/react-query";
import { contactApi, type SubscribeParams } from "@/lib/api/services/contact";

export function useSubscribe() {
  return useMutation({
    mutationFn: (data: SubscribeParams) => contactApi.subscribe(data),
  });
}
