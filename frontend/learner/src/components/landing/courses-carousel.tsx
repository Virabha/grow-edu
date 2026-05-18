"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import { useCourses } from "@/lib/hooks/use-courses";
import { useCategories } from "@/lib/hooks/use-categories";
import { cn } from "@/lib/utils";

const levelColors: Record<string, string> = {
  BEGINNER: "bg-emerald-100 text-emerald-700",
  INTERMEDIATE: "bg-amber-100 text-amber-700",
  ADVANCED: "bg-red-100 text-red-700",
  ALL_LEVELS: "bg-slate-100 text-slate-700",
};

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (Number.isNaN(num)) return price;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L+`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K+`;
  return `₹${Math.round(num).toLocaleString()}`;
}

export function CoursesCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    dragFree: false,
    slidesToScroll: 1,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: categoriesData = [] } = useCategories();
  const { data: coursesResponse, isLoading } = useCourses(
    {
      categoryId: activeCategoryId ?? undefined,
      limit: 12,
      status: "PUBLISHED",
    },
    true,
  );

  const courses = useMemo(
    () => coursesResponse?.data ?? [],
    [coursesResponse?.data],
  );
  const categoryFilters = useMemo(
    () => [
      { categoryId: null as string | null, label: "All" },
      ...categoriesData
        .slice(0, 5)
        .map((c) => ({ categoryId: c.categoryId as string, label: c.name })),
    ],
    [categoriesData],
  );

  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => emblaApi?.scrollNext(), 4000);
  }, [emblaApi]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = null;
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    startAutoplay();
    return () => {
      emblaApi.off("select", onSelect);
      stopAutoplay();
    };
  }, [emblaApi, startAutoplay, stopAutoplay]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
      setScrollSnaps(emblaApi.scrollSnapList());
      setSelectedIndex(0);
    }
  }, [activeCategoryId, courses.length, emblaApi]);

  return (
    <section
      className="py-10 md:py-14"
      aria-labelledby="courses-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{}}
          transition={{ duration: 0.5 }}
          className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Featured Courses
            </p>
            <h2
              id="courses-heading"
              className="section-heading mt-1 text-xl font-bold text-foreground sm:text-2xl md:text-3xl"
            >
              Most Popular Courses
            </h2>
          </div>
          <Link
            href="/courses"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            See all courses <ArrowRight className="size-3.5" />
          </Link>
        </motion.div>

        <div className="mb-5 flex flex-wrap gap-2">
          {categoryFilters.map((f) => (
            <button
              key={f.label}
              onClick={() => setActiveCategoryId(f.categoryId)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                activeCategoryId === f.categoryId
                  ? "border-primary bg-primary text-white"
                  : "border-border/60 bg-white/50 backdrop-blur-sm text-muted-foreground hover:border-primary/50 hover:text-primary",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <div
            className="relative"
            onMouseEnter={stopAutoplay}
            onMouseLeave={startAutoplay}
          >
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex gap-4">
                {(courses.length ? courses : []).map((course) => {
                  const instructorName = course.instructor
                    ? [course.instructor.firstName, course.instructor.lastName]
                        .filter(Boolean)
                        .join(" ")
                    : "Instructor";
                  const level = (course.level ?? "ALL_LEVELS") as string;
                  return (
                    <div
                      key={course.courseId}
                      className="min-w-0 shrink-0 basis-full sm:basis-1/2 lg:basis-1/3"
                    >
                      <Link
                        href={`/courses/${course.slug}`}
                        className="group block h-full overflow-hidden rounded-xl border border-border/80 bg-white/50 backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:border-primary/30"
                      >
                        <div className="relative flex h-40 items-center justify-center overflow-hidden bg-muted">
                          {course.thumbnail ? (
                            <Image
                              src={course.thumbnail}
                              alt={course.title}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              unoptimized={course.thumbnail.startsWith("http")}
                            />
                          ) : (
                            <BookOpen className="size-12 text-muted-foreground/40" />
                          )}
                          <span
                            className={cn(
                              "absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              levelColors[level] ?? levelColors.ALL_LEVELS,
                            )}
                          >
                            {level.replace("_", " ")}
                          </span>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                              {course.category?.name ?? "Course"}
                            </p>
                            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="size-3 fill-amber-400 text-amber-400" />
                              <span>5</span>
                            </div>
                          </div>
                          <h3 className="line-clamp-2 text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                            {course.title}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            By {instructorName}
                          </p>

                          <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
                            <span className="font-bold text-foreground">
                              {formatPrice(course.price)}
                            </span>
                            {course.compareAtPrice &&
                              parseFloat(course.compareAtPrice) >
                                parseFloat(course.price) && (
                                <span className="text-xs text-muted-foreground line-through">
                                  {formatPrice(course.compareAtPrice)}
                                </span>
                              )}
                            <span className="ml-auto flex items-center gap-0.5 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                              <BookOpen className="size-3" /> Enroll
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute -left-3 top-1/2 -translate-y-1/2 hidden size-8 items-center justify-center rounded-full border border-border bg-white shadow-md transition-all hover:border-primary/50 hover:shadow-lg md:flex"
              aria-label="Previous"
            >
              <ChevronLeft className="size-4 text-foreground" />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="absolute -right-3 top-1/2 -translate-y-1/2 hidden size-8 items-center justify-center rounded-full border border-border bg-white shadow-md transition-all hover:border-primary/50 hover:shadow-lg md:flex"
              aria-label="Next"
            >
              <ChevronRight className="size-4 text-foreground" />
            </button>
          </div>
        )}

        {scrollSnaps.length > 1 && (
          <div className="mt-5 flex justify-center gap-1.5">
            {scrollSnaps.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === selectedIndex
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-border hover:bg-muted-foreground/40",
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{}}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-8 flex justify-center"
        >
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-full border-2 border-primary px-6 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary hover:text-white"
          >
            VIEW ALL COURSES
            <ArrowRight className="size-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
