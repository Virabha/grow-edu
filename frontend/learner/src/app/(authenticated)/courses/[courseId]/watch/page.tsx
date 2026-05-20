"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  ChevronDown,
  BookOpen,
  ArrowLeft,
  Lock,
  CheckCircle2,
  Video,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SecureVideoPlayer } from "@/components/ui/secure-video-player";
import { useCourseById } from "@/lib/hooks/use-courses";
import { useEnrollments } from "@/lib/hooks/use-enrollments";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";
import type { Lesson, Section } from "@/lib/api/services/courses";

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

  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const sections: Section[] = course?.sections ?? [];

  // Auto-select first available lesson on load
  useEffect(() => {
    if (!course || currentLesson) return;
    for (const section of course.sections ?? []) {
      for (const lesson of section.lessons ?? []) {
        if (lesson.type === "VIDEO") {
          setCurrentLesson(lesson);
          return;
        }
      }
    }
    // If no video lesson, pick the first lesson of any type
    const firstSection = (course.sections ?? [])[0];
    const firstLesson = (firstSection?.lessons ?? [])[0];
    if (firstLesson) {
      setCurrentLesson(firstLesson);
    }
  }, [course, currentLesson]);

  // Open the section containing the current lesson by default
  useEffect(() => {
    if (!currentLesson || !course) return;
    for (const section of course.sections ?? []) {
      const hasLesson = (section.lessons ?? []).some(
        (l) => l.lessonId === currentLesson.lessonId,
      );
      if (hasLesson) {
        setOpenSections((prev) => new Set(prev).add(section.sectionId));
        break;
      }
    }
  }, [currentLesson, course]);

  function toggleSection(sectionId: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  function handleLessonClick(lesson: Lesson) {
    setCurrentLesson(lesson);
  }

  const isLoading = courseLoading || enrollmentsLoading || !isHydrated;

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="mb-6 h-8 w-2/3" />
        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Not enrolled - access denied
  if (!isEnrolled) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-muted/30">
            <Lock className="size-10 text-muted-foreground/50" />
          </div>
          <h1 className="font-display mb-3 text-3xl font-medium leading-tight tracking-tight">
            Access denied.
          </h1>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground">
            You need to be enrolled in this course to access the content.
            Please enroll first to start learning.
          </p>
          <Button asChild size="lg" variant="glow">
            <Link href={`/courses/${course?.slug ?? courseId}`}>
              <ArrowLeft className="size-4" />
              Back to Course Details
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Link
        href={`/courses/${course?.slug ?? courseId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground/70 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Course
      </Link>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display mb-6 text-2xl font-medium leading-tight tracking-tight md:text-3xl"
      >
        {course?.title}
      </motion.h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Video Player */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div
            className="relative aspect-video overflow-hidden rounded-xl bg-black"
            onContextMenu={(e) => e.preventDefault()}
          >
            {currentLesson?.type === "VIDEO" ? (
              <SecureVideoPlayer
                lessonId={currentLesson.lessonId}
                className="absolute inset-0 h-full w-full rounded-xl"
                autoPlay
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Video className="size-12 text-white/30" />
                <p className="text-sm text-white/50">
                  {currentLesson
                    ? "Select a video lesson to start watching"
                    : "No lessons available"}
                </p>
              </div>
            )}
          </div>

          {/* Current lesson info */}
          {currentLesson && (
            <motion.div
              key={currentLesson.lessonId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4"
            >
              <h2 className="font-display text-xl font-medium leading-snug">
                {currentLesson.title}
              </h2>
              {currentLesson.duration && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {Math.ceil(currentLesson.duration / 60)} min
                </p>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Sidebar - Course Content */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="overflow-hidden rounded-2xl border border-border bg-card"
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
              {sections.length} section{sections.length !== 1 && "s"} &middot;{" "}
              {sections.reduce(
                (sum, s) => sum + (s.lessons?.length ?? 0),
                0,
              )}{" "}
              lessons
            </p>
          </div>

          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {sections.map((section, i) => {
              const lessons = section.lessons ?? [];
              const isOpen = openSections.has(section.sectionId);
              const accessedSectionIds =
                course?.accessibleSectionIds ?? [];
              const isSectionAccessible = accessedSectionIds.includes(
                section.sectionId,
              );

              return (
                <div key={section.sectionId} className="border-b border-border/30 last:border-b-0">
                  <button
                    onClick={() => toggleSection(section.sectionId)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-6 items-center justify-center rounded bg-primary/15 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <div>
                        <span className="text-sm font-medium">
                          {section.title}
                        </span>
                        <span className="ml-2 text-[11px] text-muted-foreground/50">
                          {lessons.length} lesson
                          {lessons.length !== 1 && "s"}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-4 text-muted-foreground/60 transition-transform duration-300",
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
                        <ul className="border-t border-border/30">
                          {lessons.map((lesson) => {
                            const isActive =
                              currentLesson?.lessonId === lesson.lessonId;
                            const isVideo = lesson.type === "VIDEO";
                            const LessonIcon = isVideo ? Play : FileText;

                            return (
                              <li key={lesson.lessonId}>
                                <button
                                  onClick={() => handleLessonClick(lesson)}
                                  className={cn(
                                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                                    isActive
                                      ? "bg-primary/10 text-primary"
                                      : "text-foreground/70 hover:bg-muted/30 hover:text-foreground",
                                  )}
                                >
                                  <LessonIcon
                                    className={cn(
                                      "size-3.5 shrink-0",
                                      isActive
                                        ? "text-primary"
                                        : "text-muted-foreground/50",
                                    )}
                                  />
                                  <span className="flex-1 truncate">
                                    {lesson.title}
                                  </span>
                                  {lesson.duration && (
                                    <span className="shrink-0 text-[11px] text-muted-foreground/50">
                                      {Math.ceil(lesson.duration / 60)}m
                                    </span>
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
        </motion.div>
      </div>
    </div>
  );
}
