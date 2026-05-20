"use client";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle, Clock, Users } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { StatCard } from "@/components/ui/stat-card";
import { SimpleBarChart } from "@/components/ui/simple-chart";
import { StatsCardSkeleton } from "@/components/cards/stats-card-skeleton";

import { useUsers } from "@/features/users/hooks/use-users";
import { useEnrollments } from "@/features/enrollments/hooks/use-enrollments";
import type { Enrollment } from "@/features/enrollments/types";
import type { UsersResponse } from "@/features/users/types";
import { useAuthStore } from "@/lib/store/auth-store";

export default function CorporateDashboardPage() {
  const { user } = useAuthStore();
  const { data: usersData, isLoading: usersLoading } = useUsers({
    enabled: true,
    filters: { companyId: user?.companyId ?? undefined, limit: 1000 },
  });
  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useEnrollments({
    enabled: true,
    filters: { companyId: user?.companyId ?? undefined, limit: 1000 },
  });

  const users = (usersData as UsersResponse | undefined)?.data ?? [];
  const enrollments = enrollmentsData?.data ?? [];
  const active = enrollments.filter((e: Enrollment) => e.status === "ACTIVE").length;
  const completed = enrollments.filter(
    (e: Enrollment) => e.status === "COMPLETED",
  ).length;
  const courseCount = new Set(enrollments.map((e) => e.courseId)).size;

  const breakdown = [
    { label: "Active", value: active, color: "bg-primary" },
    { label: "Completed", value: completed, color: "bg-foreground" },
  ];

  const firstName = user?.firstName || "Admin";

  return (
    <PageLayout
      subtitle="Corporate"
      header="Dashboard"
      description="Your team's learning at a glance."
    >
      <div className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-foreground p-6 text-background sm:p-8"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative">
            <p className="font-display text-xs italic tracking-wide text-background/65">
              — Welcome back
            </p>
            <h2 className="font-display mt-2 text-2xl font-medium leading-tight sm:text-3xl">
              Hello, <em className="text-primary">{firstName}.</em>
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-background/80">
              {users.length > 0
                ? `${users.length} team member${users.length === 1 ? "" : "s"} · ${enrollments.length} enrolment${enrollments.length === 1 ? "" : "s"}`
                : "No team members yet — invite your first learner to get started."}
            </p>
          </div>
        </motion.section>

        <section>
          <header className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="font-display text-sm italic text-primary">01</span>
            <span className="inline-block h-px w-8 bg-border" />
            Your team
          </header>
          {usersLoading || enrollmentsLoading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Team members"
                description="In your company"
                value={users.length}
                icon={Users}
              />
              <StatCard
                title="Active enrolments"
                description="In progress"
                value={active}
                icon={Clock}
              />
              <StatCard
                title="Completed"
                description="Finished by your team"
                value={completed}
                icon={CheckCircle}
              />
              <StatCard
                title="Courses assigned"
                description="Unique courses"
                value={courseCount}
                icon={BookOpen}
              />
            </div>
          )}
        </section>

        <section>
          <header className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="font-display text-sm italic text-primary">02</span>
            <span className="inline-block h-px w-8 bg-border" />
            Enrolment breakdown
          </header>
          <div className="rounded-2xl border border-border bg-card p-5">
            <SimpleBarChart data={breakdown} height={120} noCard />
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
