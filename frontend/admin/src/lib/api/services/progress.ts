import { apiClient } from '../client';
export interface CourseProgress {
    courseProgressId: string;
    userId: string;
    courseId: string;
    progress: string;
    timeSpent: number;
    lastAccessed: string;
    lessonProgress: LessonProgress[];
}
export interface LessonProgress {
    lessonProgressId: string;
    progressId: string;
    lessonId: string;
    completed: boolean;
    timeSpent: number;
    lastPosition?: number;
    lastAccessed: string;
}
export interface UpdateProgressDto {
    lessonId?: string;
    completed?: boolean;
    progress?: number;
    timeSpent?: number;
    lastPosition?: number;
}
export const progressApi = {
    getCourseProgress: async (courseId: string): Promise<CourseProgress> => {
        const { data } = await apiClient.get(`/progress/courses/${courseId}`);
        return data;
    },
    updateProgress: async (courseId: string, dto: UpdateProgressDto): Promise<CourseProgress> => {
        const { data } = await apiClient.put(`/progress/courses/${courseId}`, dto);
        return data;
    },
};
