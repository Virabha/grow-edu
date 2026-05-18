"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Share2,
  CheckCircle2,
  Play,
  ArrowLeft,
  Lock,
  FileText,
  HelpCircle,
  Eye,
  X,
  Loader2,
  Clock,
  Users,
  BarChart3,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourseBySlug, useCourses } from "@/lib/hooks/use-courses";
import { useAuthStore } from "@/lib/store/auth-store";
import { useEnrollments } from "@/lib/hooks/use-enrollments";
import { useFreeEnroll } from "@/lib/hooks/use-payments";
import { cn, getApiErrorMessage } from "@/lib/utils";

export default function CourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const slug = params.courseId;
  const { user, isHydrated } = useAuthStore();
  const isLoggedIn = isHydrated && !!user;
  const router = useRouter();

  const [openSection, setOpenSection] = useState<number | null>(0);
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewEnded, setPreviewEnded] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [activeTab, setActiveTab] = useState<"about" | "curriculum" | "related">("about");

  const freeEnroll = useFreeEnroll();
  const { data: course, isLoading, error } = useCourseBySlug(slug);
  const { data: enrollmentsData } = useEnrollments({
    enabled: isLoggedIn && !!course?.courseId,
    filters: { userId: user?.id },
  });

  const isEnrolled =
    enrollmentsData?.data?.some(
      (e) => e.courseId === course?.courseId && e.status === "ACTIVE",
    ) ?? false;

  const closePreview = useCallback(() => {
    setPreviewLessonId(null);
    setPreviewUrl(null);
    setPreviewEnded(false);
  }, []);

  const openPreview = useCallback(async (lessonId: string) => {
    setPreviewLessonId(lessonId);
    setPreviewLoading(true);
    setPreviewEnded(false);
    try {
      const { data } = await axios.get(`/api/lessons/${lessonId}/preview`);
      setPreviewUrl(
        `${data.signedUrl}${data.signedUrl.includes("?") ? "&" : "?"}autoplay=true&preload=true&responsive=true`,
      );
    } catch {
      toast.error("Failed to load preview");
      setPreviewLessonId(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!previewLessonId) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") closePreview();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [previewLessonId, closePreview]);

  useEffect(() => {
    if (!previewUrl) return;
    function handleMessage(e: MessageEvent) {
      if (typeof e.data !== "string") return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.event === "timeupdate" && msg.data?.currentTime >= 30) {
          setPreviewEnded(true);
          previewIframeRef.current?.contentWindow?.postMessage(
            '{"event":"command","func":"pauseVideo","args":[]}',
            "*",
          );
        }
      } catch {
        /* non-JSON messages */
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [previewUrl]);

  const { data: relatedData } = useCourses(
    { categoryId: course?.categoryId, limit: 4, status: "PUBLISHED" },
    !!course?.categoryId,
  );

  const relatedCourses =
    relatedData?.data?.filter((c) => c.courseId !== course?.courseId) ?? [];

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: course?.title ?? "Course", url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  }

  async function handleFreeEnroll() {
    if (!course) return;
    try {
      await freeEnroll.mutateAsync({ courseId: course.courseId, itemType: "COURSE" });
      toast.success("Enrolled successfully!");
      router.push("/my-courses");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to enroll"));
    }
  }

  if (isLoading) {
    return (
      <div>
        <div className="bg-[#000052] py-10">
          <div className="container mx-auto max-w-7xl px-4">
            <Skeleton className="mb-3 h-4 w-48 bg-white/10" />
            <Skeleton className="mb-4 h-10 w-3/4 bg-white/10" />
            <Skeleton className="h-5 w-1/2 bg-white/10" />
          </div>
        </div>
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!course || error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-muted/30">
            <BookOpen className="size-10 text-muted-foreground/50" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-foreground">Course Not Found</h1>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground">
            The course you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <Button asChild size="lg">
            <Link href="/courses">
              <ArrowLeft className="size-4" />
              Browse All Courses
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  const price = parseFloat(course.price);
  const comparePrice = course.compareAtPrice ? parseFloat(course.compareAtPrice) : null;
  const discount =
    comparePrice && comparePrice > price
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : null;

  const sections = course.sections ?? [];
  const totalLessons = sections.reduce((sum, s) => sum + (s.lessons?.length ?? 0), 0);
  const learningOutcomes = (course as unknown as Record<string, unknown>).learningOutcomes as string[] | undefined;
  const requirements = (course as unknown as Record<string, unknown>).requirements as string[] | undefined;

  const tabs = [
    { key: "about" as const, label: "About" },
    { key: "curriculum" as const, label: `Curriculum (${sections.length})` },
    ...(relatedCourses.length > 0 ? [{ key: "related" as const, label: "Related Courses" }] : []),
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#000052] to-primary">
        <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
          <nav
            className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-white/50"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition-colors hover:text-white/80">Home</Link>
            <ChevronRight className="size-3.5" />
            <Link href="/courses" className="transition-colors hover:text-white/80">Courses</Link>
            <ChevronRight className="size-3.5" />
            {course.category && (
              <>
                <span className="text-white/60">{course.category.name}</span>
                <ChevronRight className="size-3.5" />
              </>
            )}
            <span className="truncate text-white/80 font-medium">{course.title}</span>
          </nav>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
            <div className="flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {course.category && (
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    {course.category.name}
                  </span>
                )}
                {course.level && (
                  <span className="rounded-full border border-white/30 px-3 py-1 text-xs font-medium text-white/80">
                    {course.level}
                  </span>
                )}
                {discount && price > 0 && (
                  <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                    {discount}% OFF
                  </span>
                )}
              </div>

              <h1 className="mb-3 text-2xl font-black text-white tracking-tight md:text-3xl lg:text-4xl">
                {course.title}
              </h1>

              {course.description && (
                <p className="mb-4 max-w-2xl text-sm text-white/70 leading-relaxed md:text-base">
                  {course.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                {course.instructor && (
                  <span>
                    By <span className="font-semibold text-amber-300">{course.instructor.firstName} {course.instructor.lastName}</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <BookOpen className="size-4" />
                  {sections.length} sections, {totalLessons} lessons
                </span>
                {course.level && (
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="size-4" />
                    {course.level}
                  </span>
                )}
              </div>
            </div>

            {course.thumbnail && (
              <div className="relative hidden lg:block w-80 shrink-0 overflow-hidden rounded-2xl shadow-2xl border border-white/10">
                <div className="aspect-video relative">
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    className="object-cover"
                    sizes="320px"
                    priority
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="flex size-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
                      <Play className="size-6 fill-primary text-primary ml-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-border/50 bg-white sticky top-14 z-30">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative whitespace-nowrap px-5 py-3.5 text-sm font-medium transition-colors",
                  activeTab === tab.key
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="course-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 md:py-10">
        <div className="container mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:px-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            {activeTab === "about" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {learningOutcomes && learningOutcomes.length > 0 && (
                  <div className="rounded-2xl border border-border/80 bg-white p-6">
                    <h2 className="mb-4 text-lg font-bold text-foreground">What You&apos;ll Learn</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {learningOutcomes.map((outcome, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                          <span className="text-sm text-foreground">{outcome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-border/80 bg-white p-6">
                  <h2 className="mb-4 text-lg font-bold text-foreground">Course Highlights</h2>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="flex flex-col items-center gap-2 rounded-xl bg-primary/5 p-4 text-center">
                      <BookOpen className="size-6 text-primary" />
                      <div>
                        <p className="text-lg font-bold text-foreground">{totalLessons}</p>
                        <p className="text-xs text-muted-foreground">Lessons</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 rounded-xl bg-primary/5 p-4 text-center">
                      <Clock className="size-6 text-primary" />
                      <div>
                        <p className="text-lg font-bold text-foreground">{sections.length}</p>
                        <p className="text-xs text-muted-foreground">Sections</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 rounded-xl bg-primary/5 p-4 text-center">
                      <BarChart3 className="size-6 text-primary" />
                      <div>
                        <p className="text-lg font-bold text-foreground">{course.level ?? "All"}</p>
                        <p className="text-xs text-muted-foreground">Level</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 rounded-xl bg-primary/5 p-4 text-center">
                      <Award className="size-6 text-primary" />
                      <div>
                        <p className="text-lg font-bold text-foreground">Lifetime</p>
                        <p className="text-xs text-muted-foreground">Access</p>
                      </div>
                    </div>
                  </div>
                </div>

                {requirements && requirements.length > 0 && (
                  <div className="rounded-2xl border border-border/80 bg-white p-6">
                    <h2 className="mb-3 text-lg font-bold text-foreground">Requirements</h2>
                    <ul className="space-y-2">
                      {requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="mt-0.5 size-4 shrink-0 text-primary" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "curriculum" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">Course Content</h2>
                  <span className="text-sm text-muted-foreground">
                    {sections.length} sections · {totalLessons} lessons
                  </span>
                </div>
                <div className="space-y-2">
                  {sections.map((section, i) => {
                    const lessons = section.lessons ?? [];
                    const isAccessible = course.accessibleSectionIds?.includes(section.sectionId);
                    return (
                      <div
                        key={section.sectionId}
                        className="overflow-hidden rounded-xl border border-border/80 bg-white"
                      >
                        <button
                          onClick={() => setOpenSection(openSection === i ? null : i)}
                          className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                              {i + 1}
                            </span>
                            <div>
                              <span className="font-semibold text-foreground">{section.title}</span>
                              {lessons.length > 0 && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {lessons.length} lesson{lessons.length !== 1 && "s"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {section.sectionPrice && (
                              <span className="text-xs font-semibold text-primary">
                                ₹{parseFloat(section.sectionPrice).toFixed(0)}
                              </span>
                            )}
                            <ChevronDown
                              className={cn(
                                "size-5 text-muted-foreground transition-transform duration-300",
                                openSection === i && "rotate-180",
                              )}
                            />
                          </div>
                        </button>
                        <div
                          className={cn(
                            "grid transition-all duration-300",
                            openSection === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                          )}
                        >
                          <div className="overflow-hidden">
                            <div className="border-t border-border/50">
                              {lessons.length > 0 ? (
                                <ul className="divide-y divide-border/30">
                                  {lessons.map((lesson) => {
                                    const canPreview = lesson.isFreePreview || isAccessible;
                                    const LessonIcon =
                                      lesson.type === "VIDEO" ? Play : lesson.type === "QUIZ" ? HelpCircle : FileText;

                                    function handleLockedClick() {
                                      if (!canPreview) {
                                        toast.info("Enroll in this course to access this lesson");
                                      }
                                    }

                                    return (
                                      <li
                                        key={lesson.lessonId}
                                        className={cn(
                                          "flex items-center justify-between px-5 py-3",
                                          !canPreview && "cursor-pointer",
                                        )}
                                        onClick={handleLockedClick}
                                      >
                                        <div className="flex items-center gap-3">
                                          <LessonIcon
                                            className={cn(
                                              "size-4 shrink-0",
                                              canPreview ? "text-primary" : "text-muted-foreground/50",
                                            )}
                                          />
                                          <span
                                            className={cn(
                                              "text-sm",
                                              canPreview ? "text-foreground" : "text-muted-foreground/60",
                                            )}
                                          >
                                            {lesson.title}
                                          </span>
                                          {lesson.isFreePreview && (
                                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                                              FREE
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {lesson.duration && (
                                            <span className="text-xs text-muted-foreground/50">
                                              {Math.ceil(lesson.duration / 60)} min
                                            </span>
                                          )}
                                          {canPreview && lesson.type === "VIDEO" && lesson.isFreePreview ? (
                                            <button
                                              onClick={() => openPreview(lesson.lessonId)}
                                              className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                                            >
                                              <Eye className="size-3" /> Preview
                                            </button>
                                          ) : !canPreview ? (
                                            <Lock className="size-3.5 text-muted-foreground/40" />
                                          ) : null}
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <div className="px-5 py-3">
                                  <p className="text-sm text-muted-foreground/60">
                                    Content available after enrollment
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === "related" && relatedCourses.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="mb-4 text-lg font-bold text-foreground">Related Courses</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {relatedCourses.map((rc) => (
                    <Link
                      key={rc.courseId}
                      href={`/courses/${rc.slug}`}
                      className="group block overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                    >
                      <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-primary/10 to-violet-500/5">
                        {rc.thumbnail ? (
                          <Image
                            src={rc.thumbnail}
                            alt={rc.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, 50vw"
                          />
                        ) : (
                          <BookOpen className="size-10 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="mb-2 line-clamp-2 font-bold text-foreground transition-colors group-hover:text-primary">
                          {rc.title}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {rc.instructor?.firstName} {rc.instructor?.lastName}
                          </span>
                          <span className="text-base font-bold text-primary">
                            {parseFloat(rc.price) === 0 ? "Free" : `₹${parseFloat(rc.price).toFixed(0)}`}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-lg">
              {course.thumbnail && (
                <div className="relative h-48 lg:hidden">
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    className="object-cover"
                    sizes="400px"
                    priority
                  />
                </div>
              )}

              <div className="p-6">
                <div className="mb-4 flex items-baseline gap-3">
                  <span className="text-3xl font-black text-foreground">
                    {price === 0 ? "Free" : `₹${price.toFixed(0)}`}
                  </span>
                  {comparePrice && price > 0 && (
                    <span className="text-lg text-muted-foreground line-through">
                      ₹{comparePrice.toFixed(0)}
                    </span>
                  )}
                  {discount && price > 0 && (
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                      {discount}% OFF
                    </span>
                  )}
                </div>

                {isEnrolled ? (
                  <Button className="mb-3 w-full" size="lg" asChild>
                    <Link href="/my-courses">
                      <CheckCircle2 className="size-4" />
                      Go to My Courses
                    </Link>
                  </Button>
                ) : isLoggedIn && price === 0 ? (
                  <Button
                    className="mb-3 w-full"
                    size="lg"
                    onClick={handleFreeEnroll}
                    disabled={freeEnroll.isPending}
                  >
                    {freeEnroll.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Enrolling...
                      </>
                    ) : (
                      "Enroll Now — Free"
                    )}
                  </Button>
                ) : isLoggedIn ? (
                  <Button className="mb-3 w-full" size="lg" asChild>
                    <Link href={`/checkout?courseId=${course.courseId}&itemType=COURSE`}>
                      Enroll Now
                    </Link>
                  </Button>
                ) : (
                  <Button className="mb-3 w-full" size="lg" asChild>
                    <Link href={`/login?redirect=/courses/${slug}`}>
                      Sign In to Enroll
                    </Link>
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="mb-5 w-full"
                  onClick={handleShare}
                >
                  <Share2 className="size-4" />
                  Share This Course
                </Button>

                <div className="space-y-3 border-t border-border/50 pt-4">
                  <h3 className="text-sm font-bold text-foreground">This course includes:</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <BookOpen className="size-4 shrink-0 text-primary" />
                    <span>{sections.length} sections, {totalLessons} lessons</span>
                  </div>
                  {course.level && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <BarChart3 className="size-4 shrink-0 text-primary" />
                      <span>{course.level} level</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Award className="size-4 shrink-0 text-primary" />
                    <span>Certificate of completion</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Lock className="size-4 shrink-0 text-primary" />
                    <span>Lifetime access</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {previewLessonId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={closePreview}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-3xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closePreview}
                className="absolute -top-10 right-0 flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
                aria-label="Close video preview"
              >
                Close <X className="size-4" />
              </button>
              <div
                className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-2xl select-none"
                onContextMenu={(e) => e.preventDefault()}
              >
                {previewLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="size-8 text-white animate-spin" />
                  </div>
                )}
                {previewUrl && (
                  <iframe
                    ref={previewIframeRef}
                    src={previewUrl}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="origin"
                  />
                )}
                {previewEnded && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm">
                    <Play className="size-12 text-primary mb-4" />
                    <p className="text-white text-lg font-semibold mb-2">Preview Ended</p>
                    <p className="text-white/60 text-sm mb-6 text-center px-4">
                      Enroll in this course to watch the full lesson
                    </p>
                    {isEnrolled ? (
                      <Button asChild>
                        <Link href="/my-courses">Go to My Courses</Link>
                      </Button>
                    ) : isLoggedIn && price === 0 ? (
                      <Button onClick={handleFreeEnroll} disabled={freeEnroll.isPending}>
                        {freeEnroll.isPending ? "Enrolling..." : "Enroll Now — Free"}
                      </Button>
                    ) : isLoggedIn ? (
                      <Button asChild>
                        <Link href={`/checkout?courseId=${course.courseId}&itemType=COURSE`}>
                          Enroll Now
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild>
                        <Link href={`/login?redirect=/courses/${slug}`}>Sign In to Enroll</Link>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
