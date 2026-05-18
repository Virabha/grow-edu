"use client";
import { useCourseProgress as useProgress, useUpdateProgress as useUpdateProgressMutation } from "@/lib/hooks/use-data";
interface UseCourseProgressParams {
    enabled?: boolean;
    courseId?: string;
}
export function useCourseProgress({ enabled, courseId }: UseCourseProgressParams = {}) {
    return useProgress({ enabled, courseId });
}
export function useUpdateProgress() {
    return useUpdateProgressMutation();
}
