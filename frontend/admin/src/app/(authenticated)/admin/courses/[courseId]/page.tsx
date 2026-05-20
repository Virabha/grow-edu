"use client";
import { use, useState } from "react";
import Image from "next/image";
import {
  BookOpen,
  Clock,
  FileText,
  HelpCircle,
  IndianRupee,
  Play,
  Tag,
  User,
  Video,
} from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SecureVideoPlayer } from "@/components/ui/secure-video-player";
import { cn } from "@/lib/utils";

import { useCourse } from "@/features/courses/hooks/use-courses";
import { CourseModerationPanel } from "@/features/courses/components/course-moderation-panel";

const REVIEW_STYLES: Record<string, string> = {
  APPROVED:
    "border-emerald-300/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
  PENDING_REVIEW:
    "border-amber-300/40 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
  REJECTED: "border-destructive/30 bg-destructive/5 text-destructive",
  CHANGES_REQUESTED:
    "border-amber-300/40 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
};

interface AdminCourseReviewParams {
  params: Promise<{ courseId: string }>;
}

export default function AdminCourseReviewPage({
  params,
}: AdminCourseReviewParams) {
  const { courseId } = use(params);
  const { data: course, isLoading } = useCourse({ enabled: true, courseId });
  const [previewVideo, setPreviewVideo] = useState<{
    lessonId: string;
    title: string;
    sectionTitle: string;
  } | null>(null);

  if (isLoading) {
    return (
      <PageLayout subtitle="Course administration" header="Loading…">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </PageLayout>
    );
  }

  if (!course) {
    return (
      <PageLayout subtitle="Course administration" header="Course not found">
        <p className="text-sm text-muted-foreground">
          This course doesn&apos;t exist or you don&apos;t have access.
        </p>
      </PageLayout>
    );
  }

  const totalLessons =
    course.sections?.reduce((s, sec) => s + (sec.lessons?.length ?? 0), 0) ?? 0;
  const videoLessons =
    course.sections?.reduce(
      (s, sec) =>
        s + (sec.lessons?.filter((l) => l.type === "VIDEO").length ?? 0),
      0,
    ) ?? 0;

  const reviewStatus = course.reviewStatus || "DRAFT";
  const reviewStatusStyles =
    REVIEW_STYLES[reviewStatus] ?? "border-border bg-muted text-muted-foreground";

  return (
    <PageLayout subtitle="Course administration" header={course.title}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ── Left: course preview + curriculum ─────────────── */}
        <div className="order-2 space-y-4 lg:order-1 lg:col-span-2">
          <article className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex flex-col gap-4 p-5 sm:flex-row">
              <div className="relative h-32 w-full overflow-hidden rounded-xl bg-muted sm:h-28 sm:w-44 sm:shrink-0">
                {course.thumbnail ? (
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    sizes="176px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <BookOpen className="size-7 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-xl font-medium leading-snug text-foreground">
                    {course.title}
                  </h2>
                  <Badge
                    variant={
                      course.status === "PUBLISHED" ? "default" : "secondary"
                    }
                    className="shrink-0 rounded-full px-2 text-[10px] uppercase tracking-widest"
                  >
                    {course.status}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {course.description}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                  <div className="flex items-center gap-1.5">
                    <User className="size-3.5" />
                    <span className="truncate">
                      {course.instructor?.firstName}{" "}
                      {course.instructor?.lastName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Tag className="size-3.5" />
                    <span className="truncate">
                      {course.category?.name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IndianRupee className="size-3.5" />
                    <span className="font-medium text-foreground">
                      {course.price}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="size-3.5" />
                    <span>
                      {course.sections?.length ?? 0} · {totalLessons}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-border bg-card">
            <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
              <p className="font-display text-base font-medium text-foreground">
                Curriculum
              </p>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {videoLessons} videos · {totalLessons - videoLessons} other
              </p>
            </header>
            <div className="p-5">
              <ol className="space-y-2">
                {(course.sections || []).map((section, idx) => (
                  <li
                    key={section.sectionId}
                    className="overflow-hidden rounded-xl border border-border"
                  >
                    <header className="flex items-center gap-2 bg-muted/40 px-4 py-2.5 text-sm">
                      <span className="font-display flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-foreground">
                        {section.title}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {section.lessons?.length ?? 0}
                      </span>
                    </header>
                    <ul className="divide-y divide-border/70">
                      {section.lessons?.map((lesson, lIdx) => {
                        const LessonIcon =
                          lesson.type === "VIDEO"
                            ? Video
                            : lesson.type === "QUIZ"
                              ? HelpCircle
                              : FileText;
                        return (
                          <li
                            key={lesson.lessonId}
                            className="group flex items-center justify-between gap-2 px-4 py-2 transition-colors hover:bg-muted/30"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <LessonIcon className="size-3.5 shrink-0 text-muted-foreground" />
                              <span className="truncate text-sm text-muted-foreground">
                                {lIdx + 1}. {lesson.title}
                              </span>
                              <Badge
                                variant="outline"
                                className="shrink-0 rounded-full px-1.5 py-0 text-[9px] uppercase tracking-widest"
                              >
                                {lesson.type}
                              </Badge>
                            </div>
                            {lesson.type === "VIDEO" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={() =>
                                  setPreviewVideo({
                                    lessonId: lesson.lessonId,
                                    title: lesson.title,
                                    sectionTitle: section.title,
                                  })
                                }
                              >
                                <Play className="size-3" />
                                Preview
                              </Button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          </article>
        </div>

        {/* ── Right: review status + moderation ─────────────── */}
        <div className="order-1 space-y-4 lg:order-2">
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-4 py-3",
              reviewStatusStyles,
            )}
          >
            <Clock className="size-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                Review status
              </p>
              <p className="font-display text-base font-medium leading-tight">
                {reviewStatus.replace(/_/g, " ")}
              </p>
            </div>
          </div>

          <CourseModerationPanel courseId={course.courseId} />
        </div>
      </div>

      <Dialog
        open={!!previewVideo}
        onOpenChange={(open) => !open && setPreviewVideo(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Admin preview
            </p>
            <DialogTitle className="line-clamp-2">
              {previewVideo?.title}
            </DialogTitle>
            {previewVideo?.sectionTitle && (
              <DialogDescription className="line-clamp-1">
                {previewVideo.sectionTitle}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="w-full overflow-hidden rounded-xl">
            {previewVideo?.lessonId && (
              <SecureVideoPlayer lessonId={previewVideo.lessonId} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
