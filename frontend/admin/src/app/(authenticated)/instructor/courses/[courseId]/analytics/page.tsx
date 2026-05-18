"use client";
import { use } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Download, Users, Target, TrendingUp, CheckCircle2, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCourse } from "@/features/courses/hooks/use-courses";
import { useCoursePerformance } from "@/features/analytics/hooks/use-analytics";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen as BookIcon } from "lucide-react";
import { CourseLoading } from "@/components/ui/course-loading";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { AnimatedMetricCard } from "@/components/analytics/animated-metric-card";
import { BackButton } from "@/components/ui/back-button";
export default function CourseAnalyticsPage({ params, }: {
    params: Promise<{
        courseId: string;
    }>;
}) {
    const { courseId } = use(params);
    const { data: course, isLoading: courseLoading } = useCourse({
        enabled: true,
        courseId,
    });
    const { data: performance, isLoading: performanceLoading } = useCoursePerformance({ enabled: true, courseId });
    if (courseLoading || performanceLoading) {
        return <CourseLoading type="analytics"/>;
    }
    if (!course) {
        return (<PageLayout header="Course Not Found">
        <EmptyState title="Course not found" description="The course you're looking for doesn't exist." icon={<BookIcon className="h-12 w-12"/>}/>
      </PageLayout>);
    }
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    };
    return (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <PageLayout header={`Course Analytics: ${course.title}`} subtitle="Performance Metrics" description="Track enrollment, completion rates, and student progress." actions={<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <BackButton href="/instructor/courses"/>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
              <Button variant="outline" className="relative group w-full sm:w-auto" onClick={() => {
                if (!performance) {
                    toast.warning("No analytics data available to export");
                    return;
                }
                const { exportToCSV } = require("@/lib/utils/export");
                exportToCSV([
                    {
                        Course: course?.title || "N/A",
                        Enrollments: performance.enrollments,
                        Completed: performance.completed,
                        "Completion Rate": `${performance.completionRate.toFixed(2)}%`,
                        "Average Progress": `${performance.averageProgress.toFixed(2)}%`,
                    },
                ], `course_analytics_${courseId}`);
                toast.success("Analytics data exported successfully");
            }}>
                <motion.div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" animate={{
                x: ["-100%", "100%"],
            }} transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop",
            }}/>
                <Download className="h-4 w-4 mr-2 relative z-10"/>
                <span className="relative z-10">Export CSV</span>
              </Button>
            </motion.div>
          </div>}>
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-3 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatedMetricCard title="Enrollments" description="Total students enrolled" value={performance?.enrollments || 0} icon={Users} gradient="from-blue-500 via-cyan-500 to-teal-500" index={0}/>
          <AnimatedMetricCard title="Completion Rate" description="Students who completed" value={performance?.completionRate || 0} icon={Target} gradient="from-purple-500 via-pink-500 to-rose-500" index={1} suffix="%" decimals={1}/>
          <AnimatedMetricCard title="Average Progress" description="Average completion percentage" value={performance?.averageProgress || 0} icon={TrendingUp} gradient="from-green-500 via-emerald-500 to-teal-500" index={2} suffix="%" decimals={1}/>
          <AnimatedMetricCard title="Completed" description="Total completions" value={performance?.completed || 0} icon={CheckCircle2} gradient="from-amber-500 via-orange-500 to-red-500" index={3}/>
        </motion.div>
      </PageLayout>
    </motion.div>);
}
