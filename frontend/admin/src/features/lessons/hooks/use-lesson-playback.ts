import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/lib/store/auth-store";
import { env } from "@/lib/env";
interface PlaybackUrlResponse {
    signedUrl: string;
    expiresAt: string;
}
export interface PlaybackError {
    type: "access_denied" | "not_found" | "not_ready" | "network" | "unknown";
    message: string;
}
interface UseLessonPlaybackResult {
    data: PlaybackUrlResponse | undefined;
    isLoading: boolean;
    isError: boolean;
    error: PlaybackError | null;
    errorType: PlaybackError["type"] | undefined;
    errorMessage: string | undefined;
    refetch: () => void;
}
export function useLessonPlaybackUrl(lessonId: string | null): UseLessonPlaybackResult {
    const { token } = useAuthStore();
    const query = useQuery<PlaybackUrlResponse, PlaybackError>({
        queryKey: ["lesson-playback", lessonId],
        queryFn: async () => {
            if (!lessonId) {
                throw { type: "unknown", message: "Lesson ID is required" } as PlaybackError;
            }
            try {
                const baseUrl = env.NEXT_PUBLIC_API_URL;
                const { data } = await axios.get<PlaybackUrlResponse>(`${baseUrl}/lessons/${lessonId}/play`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                return data;
            }
            catch (err) {
                const axiosError = err as AxiosError<{
                    message?: string;
                    statusCode?: number;
                }>;
                if (axiosError.response) {
                    const status = axiosError.response.status;
                    const message = axiosError.response.data?.message || axiosError.message;
                    if (status === 403) {
                        throw { type: "access_denied", message: message || "You don't have access to this content" } as PlaybackError;
                    }
                    if (status === 404) {
                        throw { type: "not_found", message: message || "Video not found" } as PlaybackError;
                    }
                    throw { type: "unknown", message: message || "Failed to load video" } as PlaybackError;
                }
                throw { type: "network", message: "Network error. Please check your connection." } as PlaybackError;
            }
        },
        enabled: !!lessonId && !!token,
        staleTime: 8 * 60 * 1000,
        retry: (failureCount, error) => {
            if (error?.type === "access_denied" || error?.type === "not_found") {
                return false;
            }
            return failureCount < 2;
        },
        refetchInterval: 8 * 60 * 1000,
        refetchIntervalInBackground: false,
    });
    return {
        data: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        errorType: query.error?.type,
        errorMessage: query.error?.message,
        refetch: query.refetch,
    };
}
