"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { StatCard } from "@/components/ui/stat-card";
import { SimpleLineChart } from "@/components/ui/simple-chart";
import {
  usePlatformStats,
  useEnrollmentStats,
  useRevenueStats,
  useEnrollmentTrend,
  useRevenueTrend,
  useTopCourses,
} from "@/features/analytics/hooks/use-analytics";
import { StatsCardSkeleton } from "@/components/cards/stats-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  BookOpen,
  UserCheck,
  IndianRupee,
  Download,
  ArrowUpRight,
  Tag,
  CreditCard,
  FileText,
  Layers,
  QrCode,
  Shield,
  Library,
  Building2,
  Layout,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/auth-store";

const quickLinks = [
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Courses", href: "/admin/courses", icon: BookOpen },
  { label: "Categories", href: "/admin/categories", icon: Layers },
  { label: "Books", href: "/admin/books", icon: Library },
  { label: "Coupons", href: "/admin/coupons", icon: Tag },
  { label: "Pending reviews", href: "/admin/payments/pending", icon: QrCode },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Companies", href: "/admin/companies", icon: Building2 },
  { label: "Moderation", href: "/admin/moderation", icon: Shield },
  { label: "Landing page", href: "/admin/landing", icon: Layout },
  { label: "Instructor apps", href: "/admin/teacher-applications", icon: FileText },
];

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

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const { data: enrollmentStats } = useEnrollmentStats();
  const { data: revenueStats } = useRevenueStats();
  const { data: enrollmentTrendData } = useEnrollmentTrend({
    enabled: true,
    filters: { period: "day", days: 30 },
  });
  const { data: revenueTrendData } = useRevenueTrend({
    enabled: true,
    filters: { period: "day", days: 30 },
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
    ? revenueTrendData.map(
        (item: { date: string; revenue?: number; value?: number }) => ({
          label: item.date,
          value: item.revenue ?? item.value ?? 0,
        }),
      )
    : [];

  const totalRevenue = revenueStats?.total ?? 0;
  const totalEnrollments = enrollmentStats?.total ?? stats?.totalEnrollments ?? 0;
  const b2c = enrollmentStats?.b2c ?? 0;
  const b2b = enrollmentStats?.b2b ?? 0;
  const b2cShare =
    totalEnrollments > 0 ? Math.round((b2c / totalEnrollments) * 100) : 0;
  const b2bShare =
    totalEnrollments > 0 ? Math.round((b2b / totalEnrollments) * 100) : 0;

  const onExport = () => {
    const data = [
      { Metric: "Total Users", Value: stats?.totalUsers ?? 0 },
      { Metric: "Total Courses", Value: stats?.totalCourses ?? 0 },
      { Metric: "Total Enrollments", Value: totalEnrollments },
      { Metric: "Revenue", Value: `₹${totalRevenue}` },
    ];
    import("@/lib/utils/export").then(({ exportToCSV }) =>
      exportToCSV(data, "admin_dashboard_export"),
    );
  };

  const firstName = user?.firstName || "Admin";

  return (
    <PageLayout
      subtitle="Console"
      header="Dashboard"
      description="Live operational metrics for grotutor."
      actions={
        <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
          <Download className="size-3.5" />
          Export CSV
        </Button>
      }
    >
      <div className="space-y-6">
        {/* ── Welcome banner ─────────────────────────────────────── */}
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
              {totalEnrollments > 0
                ? `${formatCompact(totalEnrollments)} enrolment${totalEnrollments === 1 ? "" : "s"} and ${formatINR(totalRevenue)} processed to date.`
                : "No enrolments yet — once your first course goes live, the numbers below come alive."}
            </p>
          </div>
        </motion.section>

        {/* ── 01 · Stats ─────────────────────────────────────────── */}
        <section>
          <header className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="font-display text-sm italic text-primary">01</span>
            <span className="inline-block h-px w-8 bg-border" />
            Snapshot
          </header>

          {statsLoading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </div>
          ) : stats ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total users"
                description="All registered accounts"
                value={formatCompact(stats.totalUsers ?? 0)}
                icon={Users}
              />
              <StatCard
                title="Total courses"
                description="Published & draft"
                value={formatCompact(stats.totalCourses ?? 0)}
                icon={BookOpen}
              />
              <StatCard
                title="Enrolments"
                description="Across cohorts"
                value={formatCompact(totalEnrollments)}
                icon={UserCheck}
              />
              <StatCard
                title="Revenue"
                description="Lifetime, processed"
                value={formatINR(totalRevenue)}
                icon={IndianRupee}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
              Couldn&apos;t load platform stats. Refresh to retry.
            </div>
          )}
        </section>

        {/* ── 02 · Trends ────────────────────────────────────────── */}
        <section>
          <header className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="font-display text-sm italic text-primary">02</span>
            <span className="inline-block h-px w-8 bg-border" />
            Last 30 days
          </header>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Revenue trend
                  </p>
                  <p className="font-display mt-1 text-2xl font-medium leading-tight text-foreground">
                    {formatINR(totalRevenue)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(revenueStats as { transactions?: number } | undefined)
                    ?.transactions ?? 0}{" "}
                  transactions
                </p>
              </div>
              <SimpleLineChart
                title=""
                data={
                  revenueTrend.length > 0
                    ? revenueTrend
                    : [{ label: "No data", value: 0 }]
                }
                height={180}
                noCard
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Enrolment mix
              </p>
              <p className="font-display mt-1 text-2xl font-medium leading-tight text-foreground">
                {formatCompact(totalEnrollments)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                B2C vs corporate split
              </p>

              <div className="mt-5 space-y-4">
                <MixRow label="Individual (B2C)" value={b2c} share={b2cShare} />
                <MixRow label="Corporate (B2B)" value={b2b} share={b2bShare} tone="accent" />
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Enrolment trend
                </p>
                <p className="font-display mt-1 text-2xl font-medium leading-tight text-foreground">
                  {formatCompact(totalEnrollments)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Daily, last 30 days</p>
            </div>
            <SimpleLineChart
              title=""
              data={
                enrollmentTrend.length > 0
                  ? enrollmentTrend
                  : [{ label: "No data", value: 0 }]
              }
              height={150}
              noCard
            />
          </div>
        </section>

        {/* ── 03 · Top courses ───────────────────────────────────── */}
        <section>
          <header className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="font-display text-sm italic text-primary">03</span>
            <span className="inline-block h-px w-8 bg-border" />
            Top performing courses
          </header>
          <div className="rounded-2xl border border-border bg-card">
            {Array.isArray(topCourses) && topCourses.length > 0 ? (
              <ul className="divide-y divide-border/70">
                {(
                  topCourses as {
                    courseId: string;
                    courseTitle: string;
                    enrollments: number;
                  }[]
                ).map((c, i) => (
                  <li
                    key={c.courseId}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="font-display flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-sm font-medium text-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {c.courseTitle}
                        </p>
                        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                          {c.enrollments} enrolment{c.enrollments === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/admin/courses`}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
                      aria-label={`Open ${c.courseTitle}`}
                    >
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : statsLoading ? (
              <div className="space-y-2 p-5">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <BookOpen className="mx-auto size-8 text-muted-foreground/40" />
                <p className="font-display mt-3 text-lg font-medium text-foreground">
                  No courses yet.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Once instructors publish, top performers will rank here.
                </p>
                <Link
                  href="/admin/courses"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  Go to courses
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ── 04 · Quick actions ─────────────────────────────────── */}
        <section>
          <header className="mb-3 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="font-display text-sm italic text-primary">04</span>
            <span className="inline-block h-px w-8 bg-border" />
            Manage the platform
          </header>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {quickLinks.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="truncate text-sm font-medium text-foreground">
                    {label}
                  </span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

function MixRow({
  label,
  value,
  share,
  tone = "primary",
}: {
  label: string;
  value: number;
  share: number;
  tone?: "primary" | "accent";
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-display text-sm font-medium text-foreground">
          {value.toLocaleString("en-IN")}
          <span className="ml-1.5 text-[11px] text-muted-foreground">
            · {share}%
          </span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${share}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={
            tone === "primary"
              ? "h-full rounded-full bg-primary"
              : "h-full rounded-full bg-foreground"
          }
        />
      </div>
    </div>
  );
}
