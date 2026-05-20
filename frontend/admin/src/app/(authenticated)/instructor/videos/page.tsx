"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Edit, ExternalLink, Play, Video } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SecureVideoPlayer } from "@/components/ui/secure-video-player";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { useCourses } from "@/features/courses/hooks/use-courses";
import { useAuthStore } from "@/lib/store/auth-store";

interface VideoLesson {
  lessonId: string;
  title: string;
  description?: string;
  duration?: number;
  status: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  sectionTitle: string;
  updatedAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  READY:
    "border-emerald-300/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
  PROCESSING:
    "border-blue-300/40 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200",
  PENDING_APPROVAL:
    "border-amber-300/40 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
  DRAFT: "border-border bg-muted text-muted-foreground",
};

function formatDuration(seconds?: number) {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}:${rem.toString().padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "READY"
      ? "Ready"
      : status === "PROCESSING"
        ? "Processing"
        : status === "PENDING_APPROVAL"
          ? "Pending"
          : "Draft";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest",
        STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT,
      )}
    >
      {label}
    </span>
  );
}

function VideoCard({
  video,
  onPreview,
}: {
  video: VideoLesson;
  onPreview: (lessonId: string) => void;
}) {
  const isReady = video.status === "READY";
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_16px_40px_-20px_rgba(28,25,23,0.18)]">
      <div className="relative aspect-video w-full overflow-hidden bg-foreground">
        {isReady ? (
          <SecureVideoPlayer
            lessonId={video.lessonId}
            className="size-full"
            showStatus={false}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-background/55">
            <Video className="size-10" />
            <p className="text-xs">
              {video.status === "PROCESSING" ? "Encoding…" : "Not ready"}
            </p>
          </div>
        )}
        <span className="absolute right-3 top-3">
          <StatusBadge status={video.status} />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="font-display line-clamp-2 text-base font-medium leading-snug text-foreground">
          {video.title}
        </h3>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {video.description || "No description provided."}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
          <BookOpen className="size-3" />
          <span className="truncate">{video.courseTitle}</span>
        </p>
        <p className="text-[11px] text-muted-foreground">
          {video.sectionTitle}
          {video.duration ? ` · ${formatDuration(video.duration)}` : ""}
        </p>

        <div className="mt-auto flex gap-2 pt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            disabled={!isReady}
            onClick={() => onPreview(video.lessonId)}
          >
            <Play className="size-3.5" />
            Preview
          </Button>
          <Button asChild variant="ghost" size="sm" aria-label="Edit course">
            <Link href={`/instructor/courses/${video.courseId}/edit`}>
              <Edit className="size-3.5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" aria-label="View public">
            <Link href={`/courses/${video.courseSlug}`} target="_blank">
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function InstructorVideosPage() {
  const { user } = useAuthStore();
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  const { data: coursesData, isLoading } = useCourses({
    enabled: !!user?.id,
    filters: { instructorId: user?.id, limit: 100 },
  });

  const videos: VideoLesson[] = useMemo(() => {
    const list: VideoLesson[] = [];
    (coursesData?.data ?? []).forEach((course) => {
      course.sections?.forEach((section) => {
        section.lessons?.forEach((lesson) => {
          if (lesson.type !== "VIDEO") return;
          list.push({
            lessonId: lesson.lessonId,
            title: lesson.title,
            description: lesson.description,
            duration: lesson.duration,
            status: lesson.status || "DRAFT",
            courseId: course.courseId,
            courseTitle: course.title,
            courseSlug: course.slug,
            sectionTitle: section.title,
            updatedAt: course.updatedAt,
          });
        });
      });
    });
    return list.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [coursesData]);

  const courseCount = new Set(videos.map((v) => v.courseId)).size;
  const previewVideo = previewLessonId
    ? videos.find((v) => v.lessonId === previewLessonId)
    : null;

  return (
    <PageLayout
      subtitle="Studio"
      header="Videos"
      description={
        videos.length > 0
          ? `${videos.length} video${videos.length === 1 ? "" : "s"} across ${courseCount} course${courseCount === 1 ? "" : "s"}.`
          : "All your uploaded lessons in one place."
      }
      actions={
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/instructor/courses/new">
            <BookOpen className="size-3.5" />
            New course
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <EmptyState
          title="No videos yet"
          description="Upload your first video lesson to see it here."
          icon={<Video className="h-12 w-12" />}
          action={{
            label: "Create course",
            onClick: () =>
              (window.location.href = "/instructor/courses/new"),
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoCard
              key={video.lessonId}
              video={video}
              onPreview={setPreviewLessonId}
            />
          ))}
        </div>
      )}

      <Dialog
        open={!!previewLessonId}
        onOpenChange={(open) => !open && setPreviewLessonId(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Preview
            </p>
            <DialogTitle className="line-clamp-2">
              {previewVideo?.title ?? "Video preview"}
            </DialogTitle>
            {previewVideo && (
              <DialogDescription className="line-clamp-1">
                {previewVideo.courseTitle} · {previewVideo.sectionTitle}
              </DialogDescription>
            )}
          </DialogHeader>
          {previewLessonId && (
            <div className="overflow-hidden rounded-xl">
              <SecureVideoPlayer
                key={previewLessonId}
                lessonId={previewLessonId}
                autoPlay
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
