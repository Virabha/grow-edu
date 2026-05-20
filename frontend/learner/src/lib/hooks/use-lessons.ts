"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

interface LessonPreviewResponse {
  signedUrl: string;
}

export function useLessonPreview() {
  return useMutation({
    mutationFn: async (lessonId: string) => {
      const { data } = await apiClient.get<LessonPreviewResponse>(
        `/lessons/${lessonId}/preview`,
      );
      return data;
    },
  });
}
