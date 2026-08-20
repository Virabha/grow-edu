import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../query-keys";
import { instructorService } from "@/lib/api/services/instructor";
interface UseInstructorStatsParams {
    enabled?: boolean;
}
export function useInstructorStats({ enabled }: UseInstructorStatsParams = {}) {
    const fetchInstructorStats = async () => {
        return instructorService.getStats();
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchInstructorStats,
        enabled: enabled !== false,
        queryKey: ["instructor", "stats"],
    });
}
interface UseInstructorBatchesParams {
    enabled?: boolean;
    page?: number;
    limit?: number;
}
export function useInstructorBatches({ enabled, page = 1, limit = 10 }: UseInstructorBatchesParams = {}) {
    const fetchInstructorBatches = async () => {
        return instructorService.getBatches(page, limit);
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchInstructorBatches,
        enabled: enabled !== false,
        queryKey: queryKeys.instructor.courses(),
    });
}
