import { useCallback, useRef, useEffect } from "react";
import { useUpdateProgress } from "@/features/progress/hooks/use-progress";
interface UseSaveVideoProgressOptions {
    lessonId: string;
    courseId: string;
    enabled?: boolean;
    debounceMs?: number;
}
export function useSaveVideoProgress({ lessonId, courseId, enabled = true, debounceMs = 5000, }: UseSaveVideoProgressOptions) {
    const updateProgress = useUpdateProgress();
    const lastSavedRef = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isCompletedRef = useRef<boolean>(false);
    const saveProgress = useCallback((currentTime: number, duration: number) => {
        if (!enabled || isCompletedRef.current) {
            return;
        }
        const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
        const shouldComplete = progressPercentage >= 90;
        if (shouldComplete && !isCompletedRef.current) {
            isCompletedRef.current = true;
            updateProgress.mutate({
                courseId,
                dto: {
                    lessonId,
                    lastPosition: Math.floor(currentTime),
                    progress: progressPercentage,
                    completed: true,
                },
            });
            return;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            const now = Date.now();
            if (now - lastSavedRef.current >= debounceMs) {
                lastSavedRef.current = now;
                updateProgress.mutate({
                    courseId,
                    dto: {
                        lessonId,
                        lastPosition: Math.floor(currentTime),
                        progress: progressPercentage,
                    },
                });
            }
        }, debounceMs);
    }, [enabled, courseId, lessonId, updateProgress, debounceMs]);
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
    return { saveProgress, isSaving: updateProgress.isPending };
}
