export interface DashboardStats {
    totalEnrollments: number;
    inProgress: number;
    completed: number;
    recentCourses?: Array<{
        id: string;
        title: string;
        progress: number;
    }>;
}
