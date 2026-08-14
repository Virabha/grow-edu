"use client";

import Link from "next/link";
import {
  Award,
  BookOpen,
  ChevronRight,
  Flame,
  ListChecks,
  PlayCircle,
  Receipt,
  Target,
} from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { StudyRhythm } from "@/components/dashboard/study-rhythm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ResultChip } from "@/components/ui/result-chip";
import { SecureImage } from "@/components/ui/secure-image";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary } from "@/lib/hooks/use-dashboard";
import { useAuthStore } from "@/lib/store/auth-store";
import { formatDate, formatMoney, formatRelative } from "@/lib/format";

const ORDER_STATUS_COPY: Record<string, string> = {
  COMPLETED: "Paid",
  PENDING: "Awaiting payment",
  PROOF_UPLOADED: "Under review",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading, isError, error, refetch } = useDashboardSummary();

  const firstName = user?.firstName ?? "there";

  if (isError) {
    return (
      <PageLayout header="Dashboard">
        <EmptyState
          title="We could not load your dashboard"
          description={
            error instanceof Error
              ? error.message
              : "Something went wrong on our side."
          }
          icon={<Target className="size-10" />}
          action={{ label: "Try again", onClick: () => void refetch() }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      subtitle="Your learning"
      header={`Welcome back, ${firstName}`}
      description="Where you left off, how the week is going, and what needs your attention."
    >
      {isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-4">
          {/* Stat band — one bordered strip rather than four floating cards, so
              the numbers read as a single summary. */}
          {/* gap-px over a border-coloured ground draws the dividers, so the
              grid stays correct at both 2 and 4 columns. */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 sm:grid-cols-4">
            <Stat
              icon={<BookOpen className="size-3.5" />}
              label="Active courses"
              value={String(data.stats.activeCount)}
              hint={`${data.stats.enrolledCount} enrolled in total`}
            />
            <Stat
              icon={<ListChecks className="size-3.5" />}
              label="Lessons completed"
              value={String(data.stats.lessonsCompleted)}
              hint={`across ${data.stats.enrolledCount} courses`}
            />
            <Stat
              icon={<Target className="size-3.5" />}
              label="Average quiz score"
              value={`${data.stats.averageQuizScore}%`}
              hint={`${data.stats.quizzesAttempted} attempts`}
            />
            <Stat
              icon={<Award className="size-3.5" />}
              label="Certificates"
              value={String(data.stats.certificatesEarned)}
              hint={`${formatMoney(data.stats.totalSpend)} invested`}
            />
          </div>

          <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[1.4fr_1fr]">
            {/* Continue learning */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-display text-base font-medium">
                  Pick up where you left off
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                  <Link href="/my-courses">
                    All courses
                    <ChevronRight className="ml-0.5 size-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {data.continueLearning.length === 0 ? (
                  <EmptyState
                    title="Nothing in progress"
                    description="Enrol in a course and it will show up here."
                    icon={<BookOpen className="size-9" />}
                    className="py-8"
                  />
                ) : (
                  <ul className="divide-y divide-border/60">
                    {data.continueLearning.map((enrollment) => {
                      const progress = enrollment.progressPercent ?? 0;
                      return (
                      <li
                        key={enrollment.enrollmentId}
                        className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="h-12 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                          {enrollment.course?.thumbnail ? (
                            <SecureImage
                              src={enrollment.course.thumbnail}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <BookOpen className="size-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="truncate text-sm font-medium">
                              {enrollment.course?.title ?? "Course"}
                            </h3>
                            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                              {progress}%
                            </span>
                          </div>
                          <ProgressBar
                            value={progress}
                            label={`${enrollment.course?.title ?? "Course"} progress`}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            {enrollment.lastAccessedAt
                              ? `Last opened ${formatRelative(enrollment.lastAccessedAt)}`
                              : `Enrolled ${formatDate(enrollment.enrolledAt)}`}
                          </p>
                        </div>
                        </div>

                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8 w-full shrink-0 text-xs sm:w-auto"
                        >
                          <Link href={`/courses/${enrollment.courseId}/watch`}>
                            <PlayCircle className="mr-1 size-3.5" />
                            Resume
                          </Link>
                        </Button>
                      </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* This week */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base font-medium">
                  This week
                </CardTitle>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Flame className="size-3.5 text-[var(--brass)]" />
                  {data.stats.studyStreakDays}-day streak ·{" "}
                  {Math.floor(data.stats.studyMinutesThisWeek / 60)}h{" "}
                  {data.stats.studyMinutesThisWeek % 60}m studied
                </p>
              </CardHeader>
              <CardContent>
                <StudyRhythm data={data.activity} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-2">
            {/* Recent quiz attempts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-display text-base font-medium">
                  Recent quizzes
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                  <Link href="/quizzes">
                    All attempts
                    <ChevronRight className="ml-0.5 size-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {data.recentAttempts.length === 0 ? (
                  <EmptyState
                    title="No quizzes attempted yet"
                    description="Quiz results appear here once you submit one."
                    icon={<Target className="size-9" />}
                    className="py-8"
                  />
                ) : (
                  <ul className="divide-y divide-border/60">
                    {data.recentAttempts.map((attempt) => (
                      <li
                        key={attempt.attemptId}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/quizzes/${attempt.attemptId}`}
                            className="block truncate text-sm font-medium hover:underline"
                          >
                            {attempt.quizTitle}
                          </Link>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {attempt.courseTitle} ·{" "}
                            {formatRelative(attempt.submittedAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-medium tabular-nums">
                            {attempt.scorePercent}%
                          </span>
                          <ResultChip passed={attempt.passed} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Recent orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-display text-base font-medium">
                  Recent orders
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                  <Link href="/orders">
                    Order history
                    <ChevronRight className="ml-0.5 size-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {data.recentOrders.length === 0 ? (
                  <EmptyState
                    title="No orders yet"
                    description="Your purchases will be listed here."
                    icon={<Receipt className="size-9" />}
                    className="py-8"
                  />
                ) : (
                  <ul className="divide-y divide-border/60">
                    {data.recentOrders.map((order) => (
                      <li
                        key={order.orderId}
                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/orders?order=${order.orderId}`}
                            className="block truncate text-sm font-medium hover:underline"
                          >
                            {order.items[0]?.title ?? order.invoiceNo}
                            {order.items.length > 1 &&
                              ` + ${order.items.length - 1} more`}
                          </Link>
                          <p className="text-[11px] text-muted-foreground">
                            {order.invoiceNo} · {formatDate(order.placedAt)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium tabular-nums">
                            {formatMoney(order.total, order.currency)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {ORDER_STATUS_COPY[order.status] ?? order.status}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-card px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <span className="text-[var(--brass)]">{icon}</span>
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-medium tabular-nums leading-none">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/70 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 px-4 py-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}
