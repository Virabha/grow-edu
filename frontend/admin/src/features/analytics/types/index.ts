export interface EnrollmentStats {
    total: number;
    b2c: number;
    b2b: number;
}
export interface RevenueStats {
    total: number;
    transactions: number;
}
export interface CoursePerformance {
    enrollments: number;
    completed: number;
    completionRate: number;
    averageProgress: number;
}
export interface PlatformStats {
    totalUsers: number;
    totalCourses: number;
    totalEnrollments: number;
}
