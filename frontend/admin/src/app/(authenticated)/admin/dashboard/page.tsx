"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { StatCard } from "@/components/ui/stat-card";
import { SimpleBarChart, SimpleLineChart } from "@/components/ui/simple-chart";
import { usePlatformStats, useEnrollmentStats, useRevenueStats, useEnrollmentTrend, useRevenueTrend, useTopCourses, } from "@/features/analytics/hooks/use-analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCardSkeleton } from "@/components/cards/stats-card-skeleton";
import { Users, BookOpen, UserCheck, IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function AdminDashboardPage() {
    const { data: stats, isLoading } = usePlatformStats();
    const { data: enrollmentStats } = useEnrollmentStats();
    const { data: revenueStats } = useRevenueStats();
    const { data: enrollmentTrendData } = useEnrollmentTrend({
        enabled: true,
        filters: {
            period: "day",
            days: 30,
        },
    });
    const { data: revenueTrendData } = useRevenueTrend({
        enabled: true,
        filters: {
            period: "day",
            days: 30,
        },
    });
    const { data: topCourses } = useTopCourses({
        enabled: true,
        filters: { limit: 5 },
    });
    const enrollmentTrend = Array.isArray(enrollmentTrendData)
        ? enrollmentTrendData.map((item) => ({
            label: item.date || "",
            value: Number(item.value || 0),
        }))
        : [];
    const revenueTrend = Array.isArray(revenueTrendData)
        ? revenueTrendData.map((item: {
            date: string;
            revenue?: number;
            value?: number;
        }) => ({
            label: item.date,
            value: item.revenue ?? item.value ?? 0,
        }))
        : [];
    const enrollmentBreakdown = [
        {
            label: "B2C",
            value: enrollmentStats?.b2c || 0,
            color: "bg-blue-500",
        },
        {
            label: "B2B",
            value: enrollmentStats?.b2b || 0,
            color: "bg-purple-500",
        },
    ];
    return (<PageLayout header="Admin Dashboard" description="Monitor platform metrics and analytics.">
      <div className="space-y-2">
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => {
            const data = [
                { Metric: "Total Users", Value: stats?.totalUsers || 0 },
                {
                    Metric: "Total Courses",
                    Value: stats?.totalCourses || 0,
                },
                {
                    Metric: "Total Enrollments",
                    Value: stats?.totalEnrollments || 0,
                },
                {
                    Metric: "Revenue",
                    Value: `₹${revenueStats?.total || 0}`,
                },
            ];
            const { exportToCSV } = require("@/lib/utils/export");
            exportToCSV(data, "admin_dashboard_export");
        }}>
            <Download className="h-4 w-4 mr-2"/>
            Export CSV
          </Button>
        </div>
        {stats && !isLoading ? (<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Users" description="All platform users" value={stats?.totalUsers || 0} icon={Users} gradient="from-blue-500 to-cyan-500"/>
            <StatCard title="Total Courses" description="Published courses" value={stats?.totalCourses || 0} icon={BookOpen} gradient="from-purple-500 to-pink-500"/>
            <StatCard title="Total Enrollments" description="Course enrollments" value={stats?.totalEnrollments || 0} icon={UserCheck} gradient="from-green-500 to-emerald-500"/>
            <StatCard title="Revenue" description="Total platform revenue" value={`₹${(revenueStats?.total || 0).toFixed(2)}`} icon={IndianRupee} gradient="from-amber-500 to-orange-500"/>
          </div>) : isLoading ? (<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>) : (<div className="p-4 rounded-md bg-destructive/10 text-destructive">
            Failed to load stats. Please try refreshing.
          </div>)}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid gap-3 md:grid-cols-2">
          <SimpleBarChart title="Enrollment Breakdown" data={enrollmentBreakdown} height={150}/>
          <SimpleLineChart title="Enrollment Trend (Last 30 Days)" data={enrollmentTrend.length > 0
            ? enrollmentTrend
            : [{ label: "No data", value: 0 }]} height={150}/>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="grid gap-3 md:grid-cols-2">
          <SimpleLineChart title="Revenue Trend (Last 30 Days)" data={revenueTrend.length > 0
            ? revenueTrend
            : [{ label: "No data", value: 0 }]} height={200}/>
          {Array.isArray(topCourses) && topCourses.length > 0 && (<Card>
              <CardHeader>
                <CardTitle>Top Performing Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(topCourses as {
                courseId: string;
                courseTitle: string;
                enrollments: number;
            }[]).map((course, index) => (<div key={course.courseId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {course.courseTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {course.enrollments} enrollments
                          </p>
                        </div>
                      </div>
                    </div>))}
                </div>
              </CardContent>
            </Card>)}
        </motion.div>
      </div>
    </PageLayout>);
}
