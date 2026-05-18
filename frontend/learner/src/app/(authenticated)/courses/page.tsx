"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  X,
  BookOpen,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { Pagination } from "@/components/ui/pagination";
import { useCourses } from "@/lib/hooks/use-courses";
import { useCategories } from "@/lib/hooks/use-categories";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Course } from "@/lib/api/services/courses";

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low → High", value: "price-asc" },
  { label: "Price: High → Low", value: "price-desc" },
  { label: "A → Z", value: "title-asc" },
];

const LEVEL_OPTIONS = [
  { label: "Beginner", value: "BEGINNER" },
  { label: "Intermediate", value: "INTERMEDIATE" },
  { label: "Advanced", value: "ADVANCED" },
];

function sortCourses(data: Course[], sortKey: string): Course[] {
  const sorted = [...data];
  switch (sortKey) {
    case "price-asc":
      return sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    case "price-desc":
      return sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    case "title-asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return sorted;
  }
}

function CoursesContent() {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category") ?? undefined;
  const urlSearch = searchParams.get("search") ?? "";

  const [search, setSearch] = useState(urlSearch);
  const [categoryId, setCategoryId] = useState<string | undefined>(urlCategory);
  const [level, setLevel] = useState<string | undefined>();
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [sortOpen, setSortOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const { data: categories } = useCategories();
  const { data: coursesData, isLoading } = useCourses({
    categoryId,
    search: debouncedSearch || undefined,
    level: level || undefined,
    page,
    limit: 12,
    status: "PUBLISHED",
  });

  const rawCourses = coursesData?.data ?? [];
  const pagination = coursesData?.pagination;

  const courses = useMemo(() => {
    return sortCourses(rawCourses, sort);
  }, [rawCourses, sort]);

  function handleClearFilters() {
    setSearch("");
    setCategoryId(undefined);
    setLevel(undefined);
    setSort("newest");
    setPage(1);
  }

  function handleCategoryChange(id: string | undefined) {
    setCategoryId(id);
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const hasFilters = !!categoryId || !!level || !!search;
  const selectedCategory = categories?.find((c) => c.categoryId === categoryId);
  const parentCategories = categories?.filter((c) => !c.parentCategoryId) ?? [];

  return (
    <>
      <section className="relative">
        <div className="mx-auto bg-[#000052] py-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-3 py-1 text-3xl font-semibold text-white">
              Our Courses Available
            </span>
            <h1 className="mt-3 text-3xl text-white tracking-tight sm:text-4xl md:text-5xl">
              Find Your Perfect Course
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white md:text-base">
              Explore our catalog, master new skills, and accelerate your
              career.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
            <button
              onClick={() => handleCategoryChange(undefined)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                !categoryId
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-border/60 bg-white/40 backdrop-blur-sm text-muted-foreground hover:border-primary/40 hover:text-primary",
              )}
            >
              All
            </button>
            {parentCategories.map((cat) => (
              <button
                key={cat.categoryId}
                onClick={() =>
                  handleCategoryChange(
                    categoryId === cat.categoryId ? undefined : cat.categoryId,
                  )
                }
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                  categoryId === cat.categoryId
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-border/60 bg-white/40 backdrop-blur-sm text-muted-foreground hover:border-primary/40 hover:text-primary",
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">
                  {pagination?.total ?? 0}
                </strong>{" "}
                courses
                {selectedCategory && (
                  <span className="ml-1">
                    {" "}
                    in{" "}
                    <span className="font-medium text-primary">
                      {selectedCategory.name}
                    </span>
                  </span>
                )}
              </p>
              {isLoading && (
                <Loader2 className="size-3.5 animate-spin text-primary" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {LEVEL_OPTIONS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => {
                    setLevel(level === l.value ? undefined : l.value);
                    setPage(1);
                  }}
                  className={cn(
                    "hidden rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all sm:inline-block",
                    level === l.value
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground/70 hover:text-primary",
                  )}
                >
                  {l.label}
                </button>
              ))}
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-muted-foreground/70 hover:text-primary text-xs h-8"
                >
                  <X className="mr-1 size-3" /> Clear
                </Button>
              )}
              <div className="relative">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => setSortOpen(!sortOpen)}
                  className="gap-1.5 h-8 text-xs"
                >
                  <SlidersHorizontal className="size-3" />{" "}
                  {SORT_OPTIONS.find((s) => s.value === sort)?.label}
                  <ChevronDown className="size-3" />
                </Button>
                <AnimatePresence>
                  {sortOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setSortOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute right-0 top-full z-40 mt-1 w-44 rounded-xl border border-border/60 bg-white/80 p-1 shadow-lg backdrop-blur-xl"
                      >
                        {SORT_OPTIONS.map((s) => (
                          <button
                            key={s.value}
                            onClick={() => {
                              setSort(s.value);
                              setSortOpen(false);
                              setPage(1);
                            }}
                            className={cn(
                              "w-full rounded-lg px-3 py-2 text-left text-xs transition-all",
                              sort === s.value
                                ? "bg-primary/10 font-semibold text-primary"
                                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-xl" />
              ))}
            </div>
          ) : courses.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {courses.map((course, i) => (
                <motion.div
                  key={course.courseId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: Math.min(i * 0.03, 0.4),
                  }}
                >
                  <Link
                    href={`/courses/${course.slug}`}
                    className="group block"
                  >
                    <div className="rounded-xl p-[1.5px] bg-transparent transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-primary/60 group-hover:via-violet-500/50 group-hover:to-primary/60 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:shadow-primary/10">
                      <div className="rounded-[10px] overflow-hidden bg-white/50 backdrop-blur-md border border-border/60 group-hover:border-transparent">
                        <div className="relative h-28 sm:h-32 overflow-hidden bg-gradient-to-br from-primary/10 to-violet-500/5">
                          {course.thumbnail ? (
                            <Image
                              src={course.thumbnail}
                              alt={course.title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <BookOpen className="size-8 text-primary/25" />
                            </div>
                          )}
                          {course.level && (
                            <span
                              className={cn(
                                "absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                course.level === "BEGINNER"
                                  ? "bg-emerald-500/90 text-white"
                                  : course.level === "INTERMEDIATE"
                                    ? "bg-amber-500/90 text-white"
                                    : "bg-red-500/90 text-white",
                              )}
                            >
                              {course.level}
                            </span>
                          )}
                        </div>
                        <div className="p-2.5">
                          {course.category && (
                            <p className="text-[9px] font-semibold uppercase tracking-wide text-primary">
                              {course.category.name}
                            </p>
                          )}
                          <h3 className="mt-0.5 line-clamp-2 text-xs font-bold leading-snug transition-colors group-hover:text-primary">
                            {course.title}
                          </h3>
                          {course.instructor && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground/70 truncate">
                              {course.instructor.firstName}{" "}
                              {course.instructor.lastName}
                            </p>
                          )}
                          <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2">
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs font-bold">
                                ₹{parseFloat(course.price).toFixed(0)}
                              </span>
                              {course.compareAtPrice && (
                                <span className="text-[10px] text-muted-foreground/50 line-through">
                                  ₹
                                  {parseFloat(course.compareAtPrice).toFixed(0)}
                                </span>
                              )}
                            </div>
                            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                              View
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-10 text-center"
            >
              <div className="flex size-20 items-center justify-center rounded-full bg-muted/30">
                <Search className="size-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-semibold">No courses found</p>
              <p className="max-w-sm text-sm text-muted-foreground/70">
                Try adjusting your search or filters.
              </p>
              <Button
                size="sm"
                variant="glass"
                onClick={handleClearFilters}
                className="mt-2"
              >
                Reset All Filters
              </Button>
            </motion.div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function CoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <CoursesContent />
    </Suspense>
  );
}
