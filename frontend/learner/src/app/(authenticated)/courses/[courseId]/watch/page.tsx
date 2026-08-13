"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowLeft,
  Lock,
  CheckCircle2,
  FileText,
  Hourglass,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SecureVideoPlayer } from "@/components/ui/secure-video-player";
import { useCourseById } from "@/lib/hooks/use-courses";
import { useEnrollments } from "@/lib/hooks/use-enrollments";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";
import type { Lesson, Section } from "@/lib/api/services/courses";

interface FlatLesson {
  lesson: Lesson;
  section: Section;
  sectionIndex: number;
  globalIndex: number;
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const mins = Math.ceil(seconds / 60);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function lessonIcon(type: Lesson["type"]) {
  if (type === "VIDEO") return Play;
  if (type === "QUIZ") return HelpCircle;
  return FileText;
}

export default function WatchPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;
  const { user, isHydrated } = useAuthStore();
  const isLoggedIn = isHydrated && !!user;

  const { data: course, isLoading: courseLoading } = useCourseById(courseId);
  const { data: enrollmentsData, isLoading: enrollmentsLoading } =
    useEnrollments({
      enabled: isLoggedIn && !!courseId,
      filters: { userId: user?.id },
    });

  const isEnrolled =
    enrollmentsData?.data?.some(
      (e) =>
        e.courseId === courseId &&
        (e.status === "ACTIVE" || e.status === "COMPLETED"),
    ) ?? false;

  const sections: Section[] = useMemo(
    () => course?.sections ?? [],
    [course?.sections],
  );

  const flatLessons: FlatLesson[] = useMemo(() => {
    const flat: FlatLesson[] = [];
    sections.forEach((section, sectionIndex) => {
      (section.lessons ?? []).forEach((lesson) => {
        flat.push({
          lesson,
          section,
          sectionIndex,
          globalIndex: flat.length,
        });
      });
    });
    return flat;
  }, [sections]);

  const [selectedLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [sectionVisibility, setSectionVisibility] = useState<Map<string, boolean>>(new Map());

  // Block common screenshot/screen-capture keyboard shortcuts on the watch page.
  useEffect(() => {
    function blockCaptureKeys(e: KeyboardEvent) {
      const { key, code, ctrlKey, metaKey, shiftKey } = e;
      // PrintScreen
      if (key === "PrintScreen" || code === "PrintScreen") {
        e.preventDefault();
        return;
      }
      // Win+Shift+S (Windows Snipping Tool) / Ctrl+Shift+S
      if (shiftKey && (key === "s" || key === "S") && (ctrlKey || metaKey)) {
        e.preventDefault();
        return;
      }
      // Ctrl+P / Cmd+P (print → Save as PDF)
      if ((ctrlKey || metaKey) && (key === "p" || key === "P")) {
        e.preventDefault();
        return;
      }
    }
    window.addEventListener("keydown", blockCaptureKeys, { capture: true });
    return () => window.removeEventListener("keydown", blockCaptureKeys, { capture: true });
  }, []);

  // Derive the active lesson: use selectedLessonId if set, else pick the first ready video
  const currentLessonId = useMemo(() => {
    if (selectedLessonId !== null) return selectedLessonId;
    if (flatLessons.length === 0) return null;
    const firstVideo = flatLessons.find(
      (f) => f.lesson.type === "VIDEO" && f.lesson.status === "READY",
    );
    return (firstVideo ?? flatLessons[0])?.lesson.lessonId ?? null;
  }, [selectedLessonId, flatLessons]);

  const current = useMemo(
    () =>
      flatLessons.find((f) => f.lesson.lessonId === currentLessonId) ?? null,
    [flatLessons, currentLessonId],
  );

  // Derive open sections: a section is open when the user has explicitly opened it,
  // OR it contains the current lesson and the user has not explicitly closed it.
  const openSections = useMemo(() => {
    const open = new Set<string>();
    for (const [id, visible] of sectionVisibility) {
      if (visible) open.add(id);
    }
    if (current) {
      const explicit = sectionVisibility.get(current.section.sectionId);
      if (explicit === undefined || explicit === true) {
        open.add(current.section.sectionId);
      }
    }
    return open;
  }, [current, sectionVisibility]);

  function toggleSection(sectionId: string) {
    setSectionVisibility((prev) => {
      const explicit = prev.get(sectionId);
      const isCurrentSection = current?.section.sectionId === sectionId;
      const currentlyOpen =
        explicit === true || (isCurrentSection && explicit === undefined);
      const next = new Map(prev);
      next.set(sectionId, !currentlyOpen);
      return next;
    });
  }

  const prev =
    current && current.globalIndex > 0
      ? flatLessons[current.globalIndex - 1]
      : null;
  const next =
    current && current.globalIndex < flatLessons.length - 1
      ? flatLessons[current.globalIndex + 1]
      : null;

  const totalLessons = flatLessons.length;
  const isLoading = courseLoading || enrollmentsLoading || !isHydrated;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="mb-6 h-9 w-2/3" />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <Skeleton className="aspect-video w-full rounded-2xl" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isEnrolled) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-muted/40">
            <Lock className="size-9 text-muted-foreground/50" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            — Locked
          </p>
          <h1 className="font-display mb-3 mt-2 text-3xl font-medium leading-tight tracking-tight">
            Access denied.
          </h1>
          <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-muted-foreground">
            You need to enrol in this course to watch the lessons.
          </p>
          <Button asChild size="lg" variant="glow">
            <Link href={`/courses/${course?.slug ?? courseId}`}>
              <ArrowLeft className="size-4" />
              Back to course
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6 space-y-3">
        <Link
          href={`/courses/${course?.slug ?? courseId}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to course
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Now watching
            </p>
            <h1 className="font-display mt-1 truncate text-2xl font-medium leading-tight tracking-tight sm:text-3xl">
              {course?.title}
            </h1>
          </div>
          {current && (
            <p className="shrink-0 text-xs text-muted-foreground">
              Lesson{" "}
              <span className="font-display text-sm text-foreground">
                {current.globalIndex + 1}
              </span>{" "}
              of{" "}
              <span className="font-display text-sm text-foreground">
                {totalLessons}
              </span>
            </p>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >
          <div onContextMenu={(e) => e.preventDefault()}>
            {current?.lesson.type === "VIDEO" &&
            current.lesson.status === "READY" ? (
              <SecureVideoPlayer
                key={current.lesson.lessonId}
                lessonId={current.lesson.lessonId}
                className="w-full"
                autoPlay
              />
            ) : current?.lesson.type === "VIDEO" ? (
              <NotReadyState />
            ) : current?.lesson.type === "TEXT" ? (
              <TextLessonView lesson={current.lesson} />
            ) : current?.lesson.type === "QUIZ" ? (
              <PlaceholderState
                icon={HelpCircle}
                title="Quiz coming soon"
                description="Quizzes will open here once they're ready."
              />
            ) : (
              <PlaceholderState
                icon={BookOpen}
                title="No lessons yet"
                description="This course doesn't have any lessons available."
              />
            )}
          </div>

          {current && (
            <motion.section
              key={current.lesson.lessonId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Section {current.sectionIndex + 1} · {current.section.title}
                  </p>
                  <h2 className="font-display mt-1 text-xl font-medium leading-snug text-foreground sm:text-2xl">
                    {current.lesson.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <LessonTypeBadge type={current.lesson.type} />
                    {formatDuration(current.lesson.duration) && (
                      <span>· {formatDuration(current.lesson.duration)}</span>
                    )}
                    {current.lesson.status !== "READY" &&
                      current.lesson.type === "VIDEO" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                          <Hourglass className="size-3" />
                          Processing
                        </span>
                      )}
                  </div>
                </div>
              </div>

              {current.lesson.description && (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {current.lesson.description}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!prev}
                  onClick={() =>
                    prev && setCurrentLessonId(prev.lesson.lessonId)
                  }
                  className="gap-1.5"
                >
                  <ChevronLeft className="size-3.5" />
                  Previous
                </Button>
                <Button
                  size="sm"
                  disabled={!next}
                  onClick={() =>
                    next && setCurrentLessonId(next.lesson.lessonId)
                  }
                  className="ml-auto gap-1.5"
                >
                  Next lesson
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </motion.section>
          )}
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-hidden rounded-2xl border border-border bg-card lg:sticky lg:top-6 lg:self-start"
        >
          <div className="border-b border-border/70 bg-muted/30 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Curriculum
            </p>
            <h3 className="font-display mt-1 flex items-center gap-2 text-base font-medium">
              <BookOpen className="size-4 text-primary" />
              Course content
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {sections.length} section{sections.length !== 1 && "s"} ·{" "}
              {totalLessons} lesson{totalLessons !== 1 && "s"}
            </p>
          </div>

          <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
            {sections.map((section, i) => {
              const lessons = section.lessons ?? [];
              const isOpen = openSections.has(section.sectionId);
              const accessibleIds = course?.accessibleSectionIds ?? [];
              const isSectionAccessible =
                accessibleIds.length === 0 ||
                accessibleIds.includes(section.sectionId);

              return (
                <div
                  key={section.sectionId}
                  className="border-b border-border/30 last:border-b-0"
                >
                  <button
                    onClick={() => toggleSection(section.sectionId)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="font-display flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-[11px] font-medium text-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {section.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {lessons.length} lesson
                          {lessons.length !== 1 && "s"}
                          {!isSectionAccessible && " · Locked"}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground/60 transition-transform duration-300",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <ul className="divide-y divide-border/30 border-t border-border/30 bg-muted/10">
                          {lessons.map((lesson) => {
                            const isActive =
                              currentLessonId === lesson.lessonId;
                            const Icon = lessonIcon(lesson.type);
                            const isLocked = !isSectionAccessible;
                            const isProcessing =
                              lesson.type === "VIDEO" &&
                              lesson.status !== "READY";

                            return (
                              <li key={lesson.lessonId}>
                                <button
                                  onClick={() => {
                                    if (isLocked) return;
                                    setCurrentLessonId(lesson.lessonId);
                                  }}
                                  disabled={isLocked}
                                  className={cn(
                                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                                    isActive
                                      ? "bg-primary/10 text-primary"
                                      : "text-foreground/80 hover:bg-muted/40 hover:text-foreground",
                                    isLocked && "cursor-not-allowed opacity-50",
                                  )}
                                >
                                  <Icon
                                    className={cn(
                                      "size-3.5 shrink-0",
                                      isActive
                                        ? "text-primary"
                                        : "text-muted-foreground/60",
                                    )}
                                  />
                                  <span className="flex-1 truncate">
                                    {lesson.title}
                                  </span>
                                  {isLocked ? (
                                    <Lock className="size-3.5 shrink-0 text-muted-foreground/50" />
                                  ) : isProcessing ? (
                                    <Hourglass className="size-3.5 shrink-0 text-amber-500" />
                                  ) : (
                                    formatDuration(lesson.duration) && (
                                      <span className="shrink-0 text-[11px] text-muted-foreground/60">
                                        {formatDuration(lesson.duration)}
                                      </span>
                                    )
                                  )}
                                  {isActive && (
                                    <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.aside>
      </div>
    </div>
  );
}

function LessonTypeBadge({ type }: { type: Lesson["type"] }) {
  const label =
    type === "VIDEO" ? "Video" : type === "QUIZ" ? "Quiz" : "Reading";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {type === "VIDEO" ? (
        <Play className="size-3" />
      ) : type === "QUIZ" ? (
        <HelpCircle className="size-3" />
      ) : (
        <FileText className="size-3" />
      )}
      {label}
    </span>
  );
}

function NotReadyState() {
  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl bg-neutral-900 p-6 text-center text-white">
      <Hourglass className="size-9 text-amber-300" />
      <p className="font-display text-lg font-medium">Still cooking.</p>
      <p className="max-w-sm text-sm text-white/70">
        This video is being processed. Refresh in a few minutes — we&apos;ll
        have it ready soon.
      </p>
    </div>
  );
}

function PlaceholderState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
}) {
  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl bg-neutral-900 p-6 text-center text-white">
      <Icon className="size-9 text-white/40" />
      <p className="font-display text-lg font-medium">{title}</p>
      <p className="max-w-sm text-sm text-white/70">{description}</p>
    </div>
  );
}

function TextLessonView({ lesson }: { lesson: Lesson }) {
  return (
    <article className="prose prose-sm max-w-none rounded-2xl border border-border bg-card p-6 dark:prose-invert sm:p-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Reading
      </p>
      <h2 className="font-display mt-1 text-2xl font-medium leading-snug">
        {lesson.title}
      </h2>
      <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {lesson.textContent || "No content available for this lesson yet."}
      </div>
    </article>
  );
}
