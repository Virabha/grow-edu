"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { StatCard } from "@/components/ui/stat-card";
import { SimpleBarChart } from "@/components/ui/simple-chart";
import { useUsers } from "@/features/users/hooks/use-users";
import { useEnrollments } from "@/features/enrollments/hooks/use-enrollments";
import type { Enrollment } from "@/features/enrollments/types";
import type { UsersResponse } from "@/features/users/types";
import { useAuthStore } from "@/lib/store/auth-store";
import { StatsCardSkeleton } from "@/components/cards/stats-card-skeleton";
import { Users, BookOpen, CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function CorporateDashboardPage() {
  const { user } = useAuthStore();
  const { data: usersData, isLoading: usersLoading } = useUsers({
    enabled: true,
    filters: {
      companyId: user?.companyId ?? undefined,
      limit: 1000,
    },
  });
  const { data: enrollmentsData, isLoading: enrollmentsLoading } =
    useEnrollments({
      enabled: true,
      filters: {
        companyId: user?.companyId ?? undefined,
        limit: 1000,
      },
    });
  const usersArray = (usersData as UsersResponse | undefined)?.data ?? [];
  const enrollmentsArray = enrollmentsData?.data ?? [];
  const totalUsers = usersArray.length;
  const activeEnrollments = enrollmentsArray.filter(
    (e: Enrollment) => e.status === "ACTIVE",
  ).length;
  const completedEnrollments = enrollmentsArray.filter(
    (e: Enrollment) => e.status === "COMPLETED",
  ).length;
  const totalCourses = new Set(
    enrollmentsArray.map((e: Enrollment) => e.courseId),
  ).size;
  const enrollmentBreakdown = [
    {
      label: "Active",
      value: activeEnrollments,
      color: "bg-blue-500",
    },
    {
      label: "Completed",
      value: completedEnrollments,
      color: "bg-green-500",
    },
  ];
  return (
    <PageLayout
      header="Corporate Dashboard"
      subtitle="Company Overview & Analytics"
      description="Manage your team's learning, track enrollment progress, and monitor analytics."
    >
      <div className="space-y-2.5">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"
        >
          {usersLoading || enrollmentsLoading ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : (
            <>
              <motion.div variants={item}>
                <StatCard
                  title="Total Users"
                  description="Employees in your company"
                  value={totalUsers}
                  icon={Users}
                  gradient="from-blue-500 to-cyan-500"
                />
              </motion.div>
              <motion.div variants={item}>
                <StatCard
                  title="Active Enrollments"
                  description="Current course enrollments"
                  value={activeEnrollments}
                  icon={Clock}
                  gradient="from-purple-500 to-pink-500"
                />
              </motion.div>
              <motion.div variants={item}>
                <StatCard
                  title="Completed"
                  description="Completed enrollments"
                  value={completedEnrollments}
                  icon={CheckCircle}
                  gradient="from-green-500 to-emerald-500"
                />
              </motion.div>
              <motion.div variants={item}>
                <StatCard
                  title="Courses Assigned"
                  description="Total courses assigned"
                  value={totalCourses}
                  icon={BookOpen}
                  gradient="from-amber-500 to-orange-500"
                />
              </motion.div>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <SimpleBarChart
            title="Enrollment Status Breakdown"
            data={enrollmentBreakdown}
            height={150}
          />
        </motion.div>
      </div>
    </PageLayout>
  );
}
