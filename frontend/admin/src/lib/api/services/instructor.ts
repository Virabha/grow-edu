import { apiClient } from "@/lib/api/client";
interface InstructorCourse {
    courseId: string;
    title: string;
    slug: string;
    status: string;
    price: string;
    currency: string;
    thumbnail?: string;
    enrollmentCount?: number;
    createdAt: string;
}
export interface InstructorStats {
    totalCourses: number;
    totalStudents: number;
    totalRevenue: number;
    recentCourses: InstructorCourse[];
}
export interface InstructorCoursesResponse {
    data: InstructorCourse[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export const instructorService = {
    getStats: async (): Promise<InstructorStats> => {
        const { data } = await apiClient.get<InstructorStats>("/instructor/stats");
        return data;
    },
    getCourses: async (page = 1, limit = 10): Promise<InstructorCoursesResponse> => {
        const { data } = await apiClient.get<InstructorCoursesResponse>("/instructor/courses", {
            params: { page, limit }
        });
        return data;
    },
};
