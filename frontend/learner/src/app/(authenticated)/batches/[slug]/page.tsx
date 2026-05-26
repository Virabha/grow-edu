"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Megaphone,
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
  useBatchSession,
  useBatchSessions,
} from "@/lib/hooks/use-batches";
import type { BatchSession } from "@/lib/api/services/batches";

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
        <Skeleton className="h-48 w-full" />
      </PageLayout>
    );
  }

  if (!batch) {
    return (
      <PageLayout header="Not found">
        <EmptyState title="Batch not found" description="It may have been removed." />
      </PageLayout>
    );
  }

  if (!batch.isEnrolled && !batch.canManage) {
    return (
      <PageLayout
        subtitle="Batch"
        header={batch.title}
        description={batch.shortDescription ?? "You don't have access to this batch yet."}
      >
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            You're not enrolled. Contact your admin or purchase access.
          </p>
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
      <div className="-mt-4 mb-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/my-batches">
            <ArrowLeft className="size-3.5 mr-1.5" />
            My Batches
          </Link>
        </Button>
      </div>
      {batch.bannerImage && (
        <div className="relative mb-6 aspect-[16/5] w-full overflow-hidden rounded-2xl bg-muted">
          <SecureImage
            src={batch.bannerImage}
            alt={batch.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">
            <Radio className="size-3.5 mr-1.5" />
            Today
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <CalendarDays className="size-3.5 mr-1.5" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="recordings">
            <Library className="size-3.5 mr-1.5" />
            Recordings
          </TabsTrigger>
          <TabsTrigger value="announcements">
            <Megaphone className="size-3.5 mr-1.5" />
            Announcements
          </TabsTrigger>
        </TabsList>

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
                          <a href={s.joinUrl} target="_blank" rel="noreferrer">
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
