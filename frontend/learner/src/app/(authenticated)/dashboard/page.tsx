"use client";

import Link from "next/link";
import {
  Award,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Megaphone,
  Radio,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SecureImage } from "@/components/ui/secure-image";
import { useBatchDashboard } from "@/lib/hooks/use-batches";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LearnerDashboardPage() {
  const { data, isLoading } = useBatchDashboard();

  if (isLoading || !data) {
    return (
      <PageLayout header="Dashboard">
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      </PageLayout>
    );
  }

  if (data.batches.length === 0) {
    return (
      <PageLayout header="Dashboard">
        <EmptyState
          title="You're not enrolled in any batches yet"
          description="Browse batches to start learning."
          icon={<GraduationCap className="h-12 w-12" />}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      header="Dashboard"
      description="Your batches, today's live classes, and pending work — all in one place."
      className="space-y-6"
    >
      {data.upcomingLive.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display text-base font-medium">
            <Radio className="size-4 text-emerald-600" />
            Upcoming live classes
          </h2>
          <ul className="space-y-2">
            {data.upcomingLive.map((s) => (
              <li
                key={s.sessionId}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium line-clamp-1">{s.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.batch.title} · {formatDateTime(s.scheduledStartAt)}
                  </p>
                </div>
                {s.joinUrl ? (
                  <Button asChild size="sm">
                    <a href={s.joinUrl} target="_blank" rel="noreferrer">
                      Join
                    </a>
                  </Button>
                ) : (
                  <Badge variant="outline">{s.status}</Badge>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 flex items-center gap-2 font-display text-base font-medium">
          <GraduationCap className="size-4" />
          My batches
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {data.batches.map((b) => (
            <Link
              key={b.batchId}
              href={`/batches/${b.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {b.thumbnail ? (
                  <SecureImage
                    src={b.thumbnail}
                    alt={b.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <GraduationCap className="size-8 text-muted-foreground/30" />
                  </div>
                )}
                <span
                  className={
                    "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                    (b.status === "ONGOING"
                      ? "bg-emerald-500/95 text-white"
                      : b.status === "UPCOMING"
                        ? "bg-amber-500/95 text-white"
                        : "bg-zinc-500/95 text-white")
                  }
                >
                  {b.status}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                {b.targetExam && (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                    {b.targetExam}
                  </p>
                )}
                <p className="font-display line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary">
                  {b.title}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {data.openQuizzes.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display text-base font-medium">
            <ClipboardList className="size-4 text-amber-500" />
            Tests available
          </h2>
          <ul className="space-y-2">
            {data.openQuizzes.map((q) => (
              <li key={q.quizId}>
                <Link
                  href={`/batches/${q.batch.slug}/quizzes/${q.quizId}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="font-medium line-clamp-1">{q.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {q.batch.title} · {q.durationMinutes} min
                    </p>
                  </div>
                  <Badge>Open</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.recentAnnouncements.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display text-base font-medium">
            <Megaphone className="size-4" />
            Recent announcements
          </h2>
          <ul className="space-y-2">
            {data.recentAnnouncements.slice(0, 5).map((a) => (
              <li
                key={a.announcementId}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <Link
                  href={`/batches/${a.batch.slug}?tab=announcements`}
                  className="block"
                >
                  <p className="font-medium line-clamp-1">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {a.body}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {a.batch.title} ·{" "}
                    <CalendarDays className="inline size-3" />{" "}
                    {formatDateTime(a.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.myCertificates.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display text-base font-medium">
            <Award className="size-4 text-amber-500" />
            Certificates
          </h2>
          <ul className="space-y-2">
            {data.myCertificates.map((c) => (
              <li
                key={c.cert.certificateId}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium line-clamp-1">{c.batch.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.cert.certificateNumber}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a
                    href={`/api/batches/${c.batch.batchId}/my-certificate/download`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageLayout>
  );
}
