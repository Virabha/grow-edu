"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  Megaphone,
  MessageCircleQuestion,
  PlayCircle,
  Pin,
  Radio,
  Video,
  ExternalLink,
  Clock,
  Library,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SecureImage } from "@/components/ui/secure-image";
import {
  useBatchAnnouncements,
  useBatchBySlug,
  useBatchDoubts,
  useBatchQuizzes,
  useBatchResources,
  useBatchSession,
  useBatchSessions,
  useCreateDoubt,
  useMyBatchProgress,
  useRecordAttendance,
} from "@/lib/hooks/use-batches";
import type { BatchSession } from "@/lib/api/services/batches";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const JOIN_WINDOW_MS = 15 * 60 * 1000; // 15 min before start

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function sessionIsJoinable(s: BatchSession): boolean {
  if (s.type !== "LIVE" || !s.scheduledStartAt || !s.scheduledEndAt) return false;
  const now = Date.now();
  const start = new Date(s.scheduledStartAt).getTime();
  const end = new Date(s.scheduledEndAt).getTime();
  return now >= start - JOIN_WINDOW_MS && now <= end;
}

function isUpcoming(s: BatchSession): boolean {
  if (s.type !== "LIVE" || !s.scheduledStartAt) return false;
  return new Date(s.scheduledStartAt).getTime() > Date.now() - JOIN_WINDOW_MS;
}

function RecordingPlayer({
  batchId,
  sessionId,
  onClose,
}: {
  batchId: string;
  sessionId: string;
  onClose: () => void;
}) {
  const { data: session, isLoading } = useBatchSession(batchId, sessionId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
          <h3 className="font-display text-sm font-medium line-clamp-1">
            {session?.title ?? "Loading…"}
          </h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="aspect-video w-full bg-black">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : session?.playbackUrl ? (
            <iframe
              src={session.playbackUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/60">
              Playback unavailable.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BatchDetailPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = use(props.params);
  const { data: batch, isLoading: batchLoading } = useBatchBySlug(slug);
  const { data: sessions = [] } = useBatchSessions(batch?.batchId ?? null);
  const { data: announcements = [] } = useBatchAnnouncements(batch?.batchId ?? null);
  const { data: resources = [] } = useBatchResources(batch?.batchId ?? null);
  const { data: doubts = [] } = useBatchDoubts(batch?.batchId ?? null);
  const { data: quizzes = [] } = useBatchQuizzes(batch?.batchId ?? null);
  const { data: progress } = useMyBatchProgress(
    batch?.batchId ?? null,
    !!batch && (batch.isEnrolled || batch.canManage)
  );
  const recordAttendance = useRecordAttendance(batch?.batchId ?? "");
  const createDoubt = useCreateDoubt(batch?.batchId ?? "");
  const [doubtTitle, setDoubtTitle] = useState("");
  const [doubtBody, setDoubtBody] = useState("");
  const [playingSessionId, setPlayingSessionId] = useState<string | null>(null);

  const { liveJoinable, liveUpcoming, recordings } = useMemo(() => {
    const liveJoinable = sessions.filter((s) => s.type === "LIVE" && sessionIsJoinable(s));
    const liveUpcoming = sessions
      .filter((s) => s.type === "LIVE" && isUpcoming(s) && !sessionIsJoinable(s))
      .sort((a, b) => {
        const ta = a.scheduledStartAt ? new Date(a.scheduledStartAt).getTime() : 0;
        const tb = b.scheduledStartAt ? new Date(b.scheduledStartAt).getTime() : 0;
        return ta - tb;
      });
    const recordings = sessions
      .filter((s) => s.type === "RECORDING")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { liveJoinable, liveUpcoming, recordings };
  }, [sessions]);

  if (batchLoading) {
    return (
      <PageLayout header="Loading batch…">
        <div className="space-y-3">
          <Skeleton className="aspect-[16/4] w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  if (!batch) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-10">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-muted/30">
          <GraduationCap className="size-10 text-muted-foreground/50" />
        </div>
        <h1 className="mb-3 font-display text-2xl font-medium text-foreground sm:text-3xl">
          Batch not found
        </h1>
        <p className="mx-auto mb-6 max-w-md text-center text-sm text-muted-foreground">
          The batch you&apos;re looking for doesn&apos;t exist or may have been
          removed.
        </p>
        <Button asChild size="sm">
          <Link href="/batches">
            <ArrowLeft className="size-3.5 mr-1.5" />
            Browse all batches
          </Link>
        </Button>
      </div>
    );
  }

  if (!batch.isEnrolled && !batch.canManage) {
    const discount =
      batch.compareAtPrice && batch.compareAtPrice > batch.price
        ? Math.round(
            ((batch.compareAtPrice - batch.price) / batch.compareAtPrice) * 100,
          )
        : null;
    return (
      <PageLayout
        subtitle="Batch"
        header={batch.title}
        description={batch.shortDescription ?? batch.targetExam ?? ""}
      >
        <div className="-mt-2 mb-3">
          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
            <Link href="/batches">
              <ArrowLeft className="size-3 mr-1" />
              All batches
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted">
              {batch.bannerImage || batch.thumbnail ? (
                <SecureImage
                  src={batch.bannerImage ?? batch.thumbnail ?? ""}
                  alt={batch.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <GraduationCap className="size-12 text-muted-foreground/30" />
                </div>
              )}
              <span
                className={
                  "absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                  (batch.status === "ONGOING"
                    ? "bg-emerald-500/95 text-white"
                    : batch.status === "UPCOMING"
                      ? "bg-amber-500/95 text-white"
                      : "bg-zinc-500/95 text-white")
                }
              >
                {batch.status}
              </span>
              {batch.targetExam && (
                <span className="absolute left-3 top-3 rounded-full bg-foreground/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background backdrop-blur">
                  {batch.targetExam}
                </span>
              )}
            </div>
            {batch.description && (
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  About this batch
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                  {batch.description}
                </p>
              </section>
            )}
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                What you&apos;ll get
              </h2>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {[
                  "Scheduled live classes",
                  "Recorded lecture library",
                  "DPP, notes and references",
                  "Tests with auto-grading",
                  "Leaderboards",
                  "Instructor doubt support",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-xs text-foreground/80"
                  >
                    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-baseline gap-2">
                {batch.price === 0 ? (
                  <span className="font-display text-2xl font-semibold text-emerald-600">
                    Free
                  </span>
                ) : (
                  <>
                    <span className="font-display text-2xl font-semibold">
                      {batch.currency} {batch.price.toFixed(0)}
                    </span>
                    {batch.compareAtPrice &&
                      batch.compareAtPrice > batch.price && (
                        <span className="text-xs text-muted-foreground line-through">
                          {batch.currency} {batch.compareAtPrice.toFixed(0)}
                        </span>
                      )}
                    {discount && (
                      <span className="ml-auto rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        −{discount}%
                      </span>
                    )}
                  </>
                )}
              </div>

              <Button asChild className="mt-3 h-9 w-full">
                <Link href={`/batches/${slug}/checkout`}>
                  {batch.price === 0 ? "Enroll for free" : "Enroll now"}
                </Link>
              </Button>

              <dl className="mt-4 space-y-2 border-t border-border/60 pt-3 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Starts</dt>
                  <dd className="font-medium text-foreground">
                    {new Date(batch.startDate).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Ends</dt>
                  <dd className="font-medium text-foreground">
                    {new Date(batch.endDate).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Language</dt>
                  <dd className="font-medium text-foreground">
                    {batch.language}
                  </dd>
                </div>
                {batch.capacity && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Seats</dt>
                    <dd className="font-medium text-foreground">
                      {batch.capacity}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </aside>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      subtitle="Batch"
      header={batch.title}
      description={batch.shortDescription ?? batch.targetExam ?? ""}
    >
      <div className="-mt-2 mb-2">
        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
          <Link href="/my-batches">
            <ArrowLeft className="size-3 mr-1" />
            My Batches
          </Link>
        </Button>
      </div>
      {batch.bannerImage && (
        <div className="relative mb-3 aspect-[16/4] w-full overflow-hidden rounded-xl bg-muted sm:aspect-[16/3]">
          <SecureImage
            src={batch.bannerImage}
            alt={batch.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {progress && batch.isEnrolled && (
        <section className="mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Attendance
            </p>
            <p className="mt-0.5 font-display text-base font-semibold leading-tight">
              {progress.sessions.attendancePercent}%
            </p>
            <p className="text-[11px] text-muted-foreground">
              {progress.sessions.attended}/{progress.sessions.liveTotal} live
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Tests
            </p>
            <p className="mt-0.5 font-display text-base font-semibold leading-tight">
              {progress.quizzes.attempted}
              <span className="text-xs font-normal text-muted-foreground">
                {" "}
                / {progress.quizzes.total}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">attempted</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Avg score
            </p>
            <p className="mt-0.5 font-display text-base font-semibold leading-tight">
              {progress.quizzes.averageScorePercent != null
                ? `${progress.quizzes.averageScorePercent}%`
                : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">across tests</p>
          </div>
        </section>
      )}

      <Tabs defaultValue="today">
        <div className="scrollbar-hide -mx-1 overflow-x-auto">
          <TabsList className="inline-flex h-9 w-auto items-center justify-start gap-1 px-1">
            <TabsTrigger value="today" className="h-7 gap-1.5 px-2.5 text-xs">
              <Radio className="size-3" />
              Today
            </TabsTrigger>
            <TabsTrigger value="schedule" className="h-7 gap-1.5 px-2.5 text-xs">
              <CalendarDays className="size-3" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="recordings" className="h-7 gap-1.5 px-2.5 text-xs">
              <Library className="size-3" />
              Recordings
            </TabsTrigger>
            <TabsTrigger value="resources" className="h-7 gap-1.5 px-2.5 text-xs">
              <FileText className="size-3" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="h-7 gap-1.5 px-2.5 text-xs">
              <ClipboardList className="size-3" />
              Tests
            </TabsTrigger>
            <TabsTrigger value="doubts" className="h-7 gap-1.5 px-2.5 text-xs">
              <MessageCircleQuestion className="size-3" />
              Doubts
            </TabsTrigger>
            <TabsTrigger value="announcements" className="h-7 gap-1.5 px-2.5 text-xs">
              <Megaphone className="size-3" />
              News
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="today" className="space-y-3">
          {liveJoinable.length === 0 && liveUpcoming.length === 0 ? (
            <EmptyState
              title="Nothing scheduled today"
              description="Check the schedule tab for upcoming classes."
              icon={<Radio className="h-10 w-10" />}
            />
          ) : (
            <>
              {liveJoinable.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Live now
                  </h3>
                  {liveJoinable.map((s) => (
                    <article
                      key={s.sessionId}
                      className="flex items-center justify-between rounded-2xl border-2 border-emerald-500/50 bg-card p-4"
                    >
                      <div>
                        <p className="font-display text-base font-medium">{s.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateTime(s.scheduledStartAt)} → {formatDateTime(s.scheduledEndAt)}
                        </p>
                        <Badge className="mt-2 bg-emerald-600">LIVE NOW</Badge>
                      </div>
                      {s.joinUrl ? (
                        <Button asChild>
                          <a
                            href={s.joinUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => {
                              recordAttendance.mutate({ sessionId: s.sessionId });
                            }}
                          >
                            <ExternalLink className="size-3.5 mr-1.5" />
                            Join class
                          </a>
                        </Button>
                      ) : (
                        <Button disabled>Link pending</Button>
                      )}
                    </article>
                  ))}
                </section>
              )}
              {liveUpcoming.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Upcoming
                  </h3>
                  {liveUpcoming.slice(0, 5).map((s) => (
                    <article
                      key={s.sessionId}
                      className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
                    >
                      <div>
                        <p className="font-display text-base font-medium">{s.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {formatDateTime(s.scheduledStartAt)}
                        </p>
                      </div>
                      <Badge variant="outline">{s.liveProvider?.replace("_", " ")}</Badge>
                    </article>
                  ))}
                </section>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="schedule" className="space-y-2">
          {sessions.filter((s) => s.type === "LIVE").length === 0 ? (
            <EmptyState
              title="No live classes scheduled"
              description="Your instructor will schedule classes here."
              icon={<CalendarDays className="h-10 w-10" />}
            />
          ) : (
            sessions
              .filter((s) => s.type === "LIVE")
              .sort((a, b) => {
                const ta = a.scheduledStartAt ? new Date(a.scheduledStartAt).getTime() : 0;
                const tb = b.scheduledStartAt ? new Date(b.scheduledStartAt).getTime() : 0;
                return ta - tb;
              })
              .map((s) => {
                const joinable = sessionIsJoinable(s);
                const subject = batch.subjects.find((sub) => sub.subjectId === s.subjectId);
                return (
                  <article
                    key={s.sessionId}
                    className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {subject?.color && (
                          <span
                            className="size-2.5 rounded-full"
                            style={{ background: subject.color }}
                          />
                        )}
                        <p className="font-display text-base font-medium">{s.title}</p>
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {formatDateTime(s.scheduledStartAt)} → {formatDateTime(s.scheduledEndAt)}
                      </p>
                    </div>
                    {joinable && s.joinUrl ? (
                      <Button asChild size="sm">
                        <a href={s.joinUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="size-3.5 mr-1.5" />
                          Join
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="outline">{s.status}</Badge>
                    )}
                  </article>
                );
              })
          )}
        </TabsContent>

        <TabsContent value="recordings" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recordings.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="No recordings yet"
                description="Recorded lectures will appear here."
                icon={<Video className="h-10 w-10" />}
              />
            </div>
          ) : (
            recordings.map((s) => {
              const subject = batch.subjects.find((sub) => sub.subjectId === s.subjectId);
              return (
                <button
                  key={s.sessionId}
                  type="button"
                  onClick={() => setPlayingSessionId(s.sessionId)}
                  className="group overflow-hidden rounded-2xl border border-border bg-card text-left transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-video w-full bg-muted">
                    {s.recordingThumbnail ? (
                      <SecureImage
                        src={s.recordingThumbnail}
                        alt={s.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Video className="size-10 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <PlayCircle className="size-12 text-white" />
                    </div>
                    {s.recordingDurationSeconds != null && (
                      <Badge className="absolute right-2 bottom-2 bg-black/70 text-white">
                        {Math.round(s.recordingDurationSeconds / 60)} min
                      </Badge>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      {subject?.color && (
                        <span
                          className="size-2 rounded-full"
                          style={{ background: subject.color }}
                        />
                      )}
                      <p className="font-display text-sm font-medium line-clamp-1">
                        {s.title}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(s.createdAt)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          {resources.length === 0 ? (
            <EmptyState
              title="No resources yet"
              description="DPP, notes, and reference PDFs will appear here."
              icon={<FileText className="h-10 w-10" />}
            />
          ) : (
            (["DPP", "NOTES", "REFERENCE"] as const).map((type) => {
              const list = resources.filter((r) => r.type === type);
              if (list.length === 0) return null;
              return (
                <section key={type}>
                  <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {type === "DPP"
                      ? "Daily Practice"
                      : type === "NOTES"
                        ? "Notes"
                        : "Reference"}
                  </h3>
                  <ul className="space-y-2">
                    {list.map((r) => (
                      <li
                        key={r.resourceId}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium line-clamp-1">
                            {r.dayNumber ? `Day ${r.dayNumber} — ` : ""}
                            {r.title}
                          </p>
                          {r.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {r.description}
                            </p>
                          )}
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <a href={r.fileUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-3.5 mr-1.5" />
                            Open
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-3">
          {quizzes.length === 0 ? (
            <EmptyState
              title="No tests scheduled"
              description="When tests are published, they appear here."
              icon={<ClipboardList className="h-10 w-10" />}
            />
          ) : (
            quizzes.map((q) => {
              const score = q.myBestAttempt?.score;
              const max = q.myBestAttempt?.maxScore;
              const pct = score != null && max ? (score / max) * 100 : null;
              const passed = pct != null && pct >= Number(q.passingPercent);
              return (
                <Link
                  key={q.quizId}
                  href={`/batches/${batch.slug}/quizzes/${q.quizId}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-medium line-clamp-1">
                      {q.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {q.durationMinutes} min · Max {q.maxAttempts} attempt
                      {q.maxAttempts === 1 ? "" : "s"}
                    </p>
                  </div>
                  {q.myBestAttempt && score != null && max != null ? (
                    <div className="text-right">
                      <p className="font-display text-base font-semibold">
                        {score} / {max}
                      </p>
                      <Badge variant={passed ? "default" : "destructive"} className="mt-1">
                        {passed ? "Passed" : "Below pass"}
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="outline">Not attempted</Badge>
                  )}
                </Link>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="doubts" className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-2 font-display text-base font-medium">Ask a doubt</h3>
            <div className="space-y-2">
              <Input
                placeholder="Doubt title"
                value={doubtTitle}
                onChange={(e) => setDoubtTitle(e.target.value)}
              />
              <Textarea
                rows={3}
                placeholder="Describe your doubt clearly…"
                value={doubtBody}
                onChange={(e) => setDoubtBody(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={
                    !doubtTitle.trim() || !doubtBody.trim() || createDoubt.isPending
                  }
                  onClick={async () => {
                    try {
                      await createDoubt.mutateAsync({
                        title: doubtTitle.trim(),
                        body: doubtBody.trim(),
                      });
                      setDoubtTitle("");
                      setDoubtBody("");
                      toast.success("Doubt posted");
                    } catch {
                      toast.error("Failed to post doubt");
                    }
                  }}
                >
                  Post
                </Button>
              </div>
            </div>
          </section>
          {doubts.length === 0 ? (
            <EmptyState
              title="No doubts yet"
              description="Be the first to ask. Official answers come from teachers/admins."
              icon={<MessageCircleQuestion className="h-10 w-10" />}
            />
          ) : (
            <ul className="space-y-2">
              {doubts.map((d) => (
                <li key={d.doubtId}>
                  <Link
                    href={`/batches/${batch.slug}/doubts/${d.doubtId}`}
                    className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-display text-base font-medium line-clamp-1">
                        {d.title}
                      </p>
                      <Badge
                        variant={
                          d.status === "OPEN"
                            ? "secondary"
                            : d.status === "ANSWERED"
                              ? "default"
                              : "outline"
                        }
                      >
                        {d.status}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {d.body}
                    </p>
                    <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {[d.author.firstName, d.author.lastName].filter(Boolean).join(" ") ||
                        "Student"}
                      {" • "}
                      {d.replyCount} repl{d.replyCount === 1 ? "y" : "ies"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="announcements" className="space-y-3">
          {announcements.length === 0 ? (
            <EmptyState
              title="No announcements yet"
              description="Your instructor will post updates here."
              icon={<Megaphone className="h-10 w-10" />}
            />
          ) : (
            announcements.map((a) => (
              <article
                key={a.announcementId}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="mb-1 flex items-center gap-2">
                  {a.pinned && <Pin className="size-3.5 text-amber-500" />}
                  <h4 className="font-display text-base font-medium">{a.title}</h4>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  {formatDateTime(a.createdAt)}
                </p>
              </article>
            ))
          )}
        </TabsContent>
      </Tabs>

      {playingSessionId && (
        <RecordingPlayer
          batchId={batch.batchId}
          sessionId={playingSessionId}
          onClose={() => setPlayingSessionId(null)}
        />
      )}
    </PageLayout>
  );
}
