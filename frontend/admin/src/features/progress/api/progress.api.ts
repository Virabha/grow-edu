import { apiClient } from "@/lib/api";
import { CourseProgress, UpdateProgressDto } from "../types";
export const progressApi = {
    async getCourseProgress(courseId: string): Promise<CourseProgress> {
        const response = await apiClient.get(`/progress/courses/${courseId}`);
        return response.data;
    },
    async updateProgress(courseId: string, dto: UpdateProgressDto): Promise<CourseProgress> {
        const response = await apiClient.put(`/progress/courses/${courseId}`, dto);
        return response.data;
    },
};
