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
interface UseInstructorCoursesParams {
    enabled?: boolean;
    page?: number;
    limit?: number;
}
export function useInstructorCourses({ enabled, page = 1, limit = 10 }: UseInstructorCoursesParams = {}) {
    const fetchInstructorCourses = async () => {
        return instructorService.getCourses(page, limit);
    };
    return useQuery({
        staleTime: Infinity,
        queryFn: fetchInstructorCourses,
        enabled: enabled !== false,
        queryKey: queryKeys.instructor.courses(),
    });
}
