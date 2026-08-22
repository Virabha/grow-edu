"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { useInstructorStats } from "@/lib/hooks/use-instructor";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  GraduationCap,
  IndianRupee,
  PlusCircle,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { StatCard } from "@/components/ui/stat-card";
import { StatsCardSkeleton } from "@/components/cards/stats-card-skeleton";
import { useAuthStore } from "@/lib/store/auth-store";

function formatINR(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}

export default function InstructorDashboardPage() {
  const { user } = useAuthStore();
  const { data: stats, isLoading } = useInstructorStats();

  const firstName = user?.firstName || "Instructor";
  const totalStudents = stats?.totalStudents ?? 0;
  const totalBatches = stats?.totalBatches ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;

  return (
    <PageLayout
      subtitle="Studio"
      header="Dashboard"
      description="Your teaching at a glance."
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
              {totalStudents > 0
                ? `${formatCompact(totalStudents)} student${totalStudents === 1 ? "" : "s"} are enrolled in your batches.`
                : "Create your first batch to start reaching learners."}
            </p>
          </div>
        </motion.section>

        <section>
          <header className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="font-display text-sm italic text-primary">01</span>
            <span className="inline-block h-px w-8 bg-border" />
            Your numbers
          </header>
          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-3">
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <StatCard
                title="Total students"
                description="Across all batches"
                value={formatCompact(totalStudents)}
                icon={Users}
              />
              <StatCard
                title="Total batches"
                description="Active & draft"
                value={formatCompact(totalBatches)}
                icon={GraduationCap}
              />
              <StatCard
                title="Total revenue"
                description="Lifetime earnings"
                value={formatINR(totalRevenue)}
                icon={IndianRupee}
              />
            </div>
          )}
        </section>

        <section className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <header className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="font-display text-sm italic text-primary">
                02
              </span>
              <span className="inline-block h-px w-8 bg-border" />
              Recent batches
            </header>

            <div className="rounded-2xl border border-border bg-card">
              {isLoading ? (
                <div className="space-y-2 p-5">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : stats?.recentBatches && stats.recentBatches.length > 0 ? (
                <ul className="divide-y divide-border/70">
                  {stats.recentBatches.map((batch) => (
                    <li
                      key={batch.batchId}
                      className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="font-display truncate text-base font-medium text-foreground">
                          {batch.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                          <Badge
                            variant={
                              batch.status === "ONGOING"
                                ? "default"
                                : batch.status === "DRAFT"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="rounded-full px-2 py-0 text-[10px] uppercase tracking-widest"
                          >
                            {batch.status}
                          </Badge>
                          <span>·</span>
                          <span>
                            {batch.enrollmentCount || 0} student
                            {batch.enrollmentCount === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/batches/${batch.batchId}`}>
                            Open
                          </Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-5 py-10 text-center">
                  <GraduationCap className="mx-auto size-8 text-muted-foreground/40" />
                  <p className="font-display mt-3 text-lg font-medium text-foreground">
                    No batches yet.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Batches you are assigned to will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <header className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="font-display text-sm italic text-primary">
                03
              </span>
              <span className="inline-block h-px w-8 bg-border" />
              Quick actions
            </header>
            <div className="space-y-2">
              <Link
                href="/admin/batches"
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-foreground px-4 py-3 text-background transition-all hover:bg-foreground/90"
              >
                <span className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <PlusCircle className="size-4" />
                  </span>
                  <span className="text-sm font-medium">Manage batches</span>
                </span>
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href="/instructor/videos"
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
              >
                <span className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-primary">
                    <GraduationCap className="size-4" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    Video library
                  </span>
                </span>
                <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
