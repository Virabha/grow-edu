import { DashboardStats } from '../types';
import { enrollmentsApi } from '../../enrollments/api/enrollments.api';
export const dashboardApi = {
    async getStats(userId: string): Promise<DashboardStats> {
        const enrollments = await enrollmentsApi.getAll({ userId, limit: 1000 });
        const inProgress = enrollments.data.filter((e) => e.status === 'ACTIVE').length;
        const completed = enrollments.data.filter((e) => e.status === 'COMPLETED').length;
        return {
            totalEnrollments: enrollments.data.length,
            inProgress,
            completed,
            recentCourses: enrollments.data.slice(0, 5).map((e) => ({
                id: e.courseId,
                title: e.course?.title || 'Unknown Course',
                progress: 0,
            })),
        };
    },
};
