export interface CourseProgress {
    id: string;
    userId: string;
    courseId: string;
    progress: string;
    timeSpent: number;
    lastAccessed: string;
    updatedAt: string;
    lessonProgress?: LessonProgress[];
}
export interface LessonProgress {
    id: string;
    progressId: string;
    lessonId: string;
    completed: boolean;
    timeSpent: number;
    lastPosition?: number;
    lastAccessed: string;
    updatedAt: string;
}
export interface UpdateProgressDto {
    progress?: number;
    timeSpent?: number;
    lessonId?: string;
    completed?: boolean;
    lastPosition?: number;
}
