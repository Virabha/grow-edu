"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  ArrowUpRight,
  BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import { useBatches } from "@/lib/hooks/use-batches";
import { useCategories } from "@/lib/hooks/use-categories";
import { cn } from "@/lib/utils";

const deliveryLabels: Record<string, string> = {
  LIVE: "Live",
  RECORDED: "Recorded",
  HYBRID: "Live + recorded",
};

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (Number.isNaN(num)) return price;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`;
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
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: categoriesData = [] } = useCategories();
  const { data: batchesResponse, isLoading } = useBatches(
    {
      categoryId: activeCategoryId ?? undefined,
      limit: 12,
    },
    true,
  );

  const courses = useMemo(
    () => batchesResponse?.data ?? [],
    [batchesResponse?.data],
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
    autoplayRef.current = setInterval(() => emblaApi?.scrollNext(), 4500);
  }, [emblaApi]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = null;
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    const onReInit = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onReInit);
    startAutoplay();
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onReInit);
      stopAutoplay();
    };
  }, [emblaApi, startAutoplay, stopAutoplay]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [activeCategoryId, courses.length, emblaApi]);

  return (
    <section
      className="bg-muted/40 py-20 md:py-24"
      aria-labelledby="courses-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="max-w-xl">
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="font-display text-base italic text-primary">
                02
              </span>
              <span className="inline-block h-px w-8 bg-border" />
              Featured this term
            </div>
            <h2
              id="courses-heading"
              className="font-display mt-4 text-3xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-4xl md:text-5xl"
            >
              Courses our students keep <em className="text-primary">finishing</em>.
            </h2>
          </div>
          <Link
            href="/courses"
            className="group inline-flex shrink-0 items-center gap-2 self-start border-b border-foreground pb-1 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary sm:self-end"
          >
            See all courses
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        <div className="mb-8 flex flex-wrap gap-2">
          {categoryFilters.map((f) => (
            <button
              key={f.label}
              onClick={() => setActiveCategoryId(f.categoryId)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-medium transition-all",
                activeCategoryId === f.categoryId
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-80 animate-pulse rounded-2xl bg-card"
              />
            ))}
          </div>
        ) : (
          <div
            className="relative"
            onMouseEnter={stopAutoplay}
            onMouseLeave={startAutoplay}
          >
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex gap-5">
                {courses.map((course) => {
                  const lead = course.teachers?.[0];
                  const instructorName = lead
                    ? [lead.firstName, lead.lastName].filter(Boolean).join(" ")
                    : "Instructor";
                  return (
                    <div
                      key={course.batchId}
                      className="min-w-0 shrink-0 basis-full sm:basis-1/2 lg:basis-1/3"
                    >
                      <Link
                        href={`/batches/${course.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_50px_-20px_rgba(28,25,23,0.2)]"
                      >
                        <div className="relative aspect-[5/3] overflow-hidden bg-muted">
                          {course.thumbnail ? (
                            <Image
                              src={course.thumbnail}
                              alt={course.title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              sizes="(max-width: 1024px) 100vw, 33vw"
                              unoptimized={course.thumbnail.startsWith("http")}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <BookOpen className="size-12 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 py-3">
                            <span className="rounded-full bg-background/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-foreground backdrop-blur-md">
                              {deliveryLabels[course.deliveryMode] ?? "Live"}
                            </span>
                            <span className="flex items-center gap-1 rounded-full bg-foreground/75 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                              <Star className="size-3 fill-amber-300 text-amber-300" />
                              5.0
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                            {course.targetExam ?? "Batch"}
                          </p>
                          <h3 className="font-display mt-1.5 line-clamp-2 text-lg font-medium leading-snug text-foreground transition-colors group-hover:text-primary sm:text-xl">
                            {course.title}
                          </h3>
                          <p className="mt-2 text-xs text-muted-foreground">
                            with{" "}
                            <span className="font-medium text-foreground/80">
                              {instructorName}
                            </span>
                          </p>

                          <div className="mt-auto flex items-baseline justify-between gap-3 border-t border-border/70 pt-4">
                            <div className="flex items-baseline gap-2">
                              <span className="font-display text-xl font-medium text-foreground">
                                {formatPrice(String(course.price))}
                              </span>
                              {course.compareAtPrice !== null &&
                                course.compareAtPrice > course.price && (
                                  <span className="text-xs text-muted-foreground line-through">
                                    {formatPrice(String(course.compareAtPrice))}
                                  </span>
                                )}
                            </div>
                            <span className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                              <ArrowUpRight className="size-4" />
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
              className="absolute -left-3 top-1/2 hidden -translate-y-1/2 size-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-all hover:border-primary hover:text-primary md:flex"
              aria-label="Previous"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="absolute -right-3 top-1/2 hidden -translate-y-1/2 size-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-all hover:border-primary hover:text-primary md:flex"
              aria-label="Next"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}

        {courses.length > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {courses.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  i === selectedIndex
                    ? "w-8 bg-foreground"
                    : "w-2 bg-foreground/20 hover:bg-foreground/40",
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
