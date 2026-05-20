"use client";
import { use } from "react";
import { motion } from "framer-motion";
import {
  BookOpen as BookIcon,
  CheckCircle2,
  Download,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CourseLoading } from "@/components/ui/course-loading";
import { BackButton } from "@/components/ui/back-button";
import { StatCard } from "@/components/ui/stat-card";

import { useCourse } from "@/features/courses/hooks/use-courses";
import { useCoursePerformance } from "@/features/analytics/hooks/use-analytics";

interface CourseAnalyticsParams {
  params: Promise<{ courseId: string }>;
}

export default function CourseAnalyticsPage({ params }: CourseAnalyticsParams) {
  const { courseId } = use(params);
  const { data: course, isLoading: courseLoading } = useCourse({
    enabled: true,
    courseId,
  });
  const { data: performance, isLoading: performanceLoading } =
    useCoursePerformance({ enabled: true, courseId });

  if (courseLoading || performanceLoading) {
    return <CourseLoading type="analytics" />;
  }

  if (!course) {
    return (
      <PageLayout header="Course not found">
        <EmptyState
          title="Course not found"
          description="This course doesn't exist or you can't access it."
          icon={<BookIcon className="h-12 w-12" />}
        />
      </PageLayout>
    );
  }

  const onExport = async () => {
    if (!performance) {
      toast.warning("No analytics data available to export.");
      return;
    }
    const { exportToCSV } = await import("@/lib/utils/export");
    exportToCSV(
      [
        {
          Course: course.title,
          Enrollments: performance.enrollments,
          Completed: performance.completed,
          "Completion rate": `${performance.completionRate.toFixed(2)}%`,
          "Average progress": `${performance.averageProgress.toFixed(2)}%`,
        },
      ],
      `course_analytics_${courseId}`,
    );
    toast.success("Exported.");
  };

  return (
    <PageLayout
      subtitle="Course analytics"
      header={course.title}
      description="Enrolment, completion, and progress at a glance."
      enableTransition={false}
      actions={
        <div className="flex items-center gap-2">
          <BackButton href="/instructor/courses" />
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="gap-1.5"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          title="Enrolments"
          description="All students enrolled"
          value={performance?.enrollments ?? 0}
          icon={Users}
        />
        <StatCard
          title="Completion rate"
          description="Students who finished"
          value={`${(performance?.completionRate ?? 0).toFixed(1)}%`}
          icon={Target}
        />
        <StatCard
          title="Average progress"
          description="Mean course completion"
          value={`${(performance?.averageProgress ?? 0).toFixed(1)}%`}
          icon={TrendingUp}
        />
        <StatCard
          title="Completed"
          description="Total completions"
          value={performance?.completed ?? 0}
          icon={CheckCircle2}
        />
      </motion.div>
    </PageLayout>
  );
}
