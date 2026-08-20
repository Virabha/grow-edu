"use client";

import Link from "next/link";
import {
  Award,
  BookOpen,
  ChevronRight,
  Megaphone,
  PlayCircle,
  Target,
} from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SecureImage } from "@/components/ui/secure-image";
import { Skeleton } from "@/components/ui/skeleton";
import { useBatchDashboard } from "@/lib/hooks/use-batches";
import { useAuthStore } from "@/lib/store/auth-store";
import { formatDate, formatRelative } from "@/lib/format";
import { getApiError } from "@/lib/api/errors";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-medium">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading, isError, error, refetch } = useBatchDashboard();

  if (isLoading) {
    return (
      <PageLayout header="Dashboard">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-64 rounded-xl" />
      </PageLayout>
    );
  }

  if (isError || !data) {
    return (
      <PageLayout header="Dashboard">
        <EmptyState
          title="We could not load your dashboard"
          description={getApiError(error).message}
          action={{ label: "Try again", onClick: () => void refetch() }}
        />
      </PageLayout>
    );
  }

  const firstName = user?.firstName ?? "there";

  return (
    <PageLayout
      header={`Welcome back, ${firstName}`}
      description="Everything you have access to, in one place."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Batches"
          value={String(data.batches.length)}
          hint="you have access to"
        />
        <StatCard
          icon={PlayCircle}
          label="Upcoming classes"
          value={String(data.upcomingLive.length)}
          hint="scheduled next"
        />
        <StatCard
          icon={Target}
          label="Open tests"
          value={String(data.openQuizzes.length)}
          hint="available to attempt"
        />
        <StatCard
          icon={Award}
          label="Certificates"
          value={String(data.myCertificates.length)}
          hint="earned so far"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Continue learning</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/my-batches">
                All batches <ChevronRight className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.batches.length === 0 ? (
              <EmptyState
                title="You have not joined a batch yet"
                description="Browse what is on offer and enrol to get started."
              />
            ) : (
              <ul className="divide-y divide-border">
                {data.batches.slice(0, 5).map((batch) => (
                  <li key={batch.batchId}>
                    <Link
                      href={`/batches/${batch.slug}`}
                      className="flex items-center gap-3 py-3 transition-colors hover:text-primary"
                    >
                      <SecureImage
                        src={batch.thumbnail ?? ""}
                        alt={batch.title}
                        className="h-10 w-16 rounded-md object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {batch.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {batch.targetExam ?? batch.language}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next live classes</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingLive.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                Nothing scheduled right now.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.upcomingLive.slice(0, 5).map((session) => (
                  <li key={session.sessionId} className="text-sm">
                    <Link
                      href={`/batches/${session.batch.slug}`}
                      className="font-medium hover:text-primary"
                    >
                      {session.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {session.batch.title} ·{" "}
                      {session.scheduledStartAt
                        ? formatDate(session.scheduledStartAt)
                        : "Time to be confirmed"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Target className="size-4 text-muted-foreground" />
            <CardTitle>Tests you can take</CardTitle>
          </CardHeader>
          <CardContent>
            {data.openQuizzes.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                No open tests at the moment.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.openQuizzes.slice(0, 5).map((quiz) => (
                  <li key={quiz.quizId} className="text-sm">
                    <Link
                      href={`/batches/${quiz.batch.slug}/quizzes/${quiz.quizId}`}
                      className="font-medium hover:text-primary"
                    >
                      {quiz.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {quiz.batch.title} · {quiz.durationMinutes} min
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Megaphone className="size-4 text-muted-foreground" />
            <CardTitle>Recent announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentAnnouncements.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                Nothing new from your teachers.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.recentAnnouncements.slice(0, 5).map((announcement) => (
                  <li key={announcement.announcementId} className="text-sm">
                    <Link
                      href={`/batches/${announcement.batch.slug}`}
                      className="font-medium hover:text-primary"
                    >
                      {announcement.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {announcement.batch.title} ·{" "}
                      {formatRelative(announcement.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
