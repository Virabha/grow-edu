"use client";

import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCourses } from "@/lib/hooks/use-courses";
import { useCategories } from "@/lib/hooks/use-categories";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { Course } from "@/lib/api/services/courses";

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price · Low to high", value: "price-asc" },
  { label: "Price · High to low", value: "price-desc" },
  { label: "Title · A to Z", value: "title-asc" },
] as const;

const LEVEL_OPTIONS = [
  { label: "Beginner", value: "BEGINNER" },
  { label: "Intermediate", value: "INTERMEDIATE" },
  { label: "Advanced", value: "ADVANCED" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];

function sortCourses(courses: Course[], key: SortKey): Course[] {
  const cloned = [...courses];
  switch (key) {
    case "price-asc":
      return cloned.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    case "price-desc":
      return cloned.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    case "title-asc":
      return cloned.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return cloned;
  }
}

function CoursesContent() {
  const params = useSearchParams();

  const [search, setSearch] = useState(params.get("search") ?? "");
  const [categoryId, setCategoryId] = useState<string | undefined>(
    params.get("category") ?? undefined,
  );
  const [level, setLevel] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 400);

  const { data: categories } = useCategories();
  const { data: coursesData, isLoading, isFetching } = useCourses({
    categoryId,
    search: debouncedSearch.trim() || undefined,
    level,
    page,
    limit: 12,
    status: "PUBLISHED",
  });

  const rawCourses = coursesData?.data ?? [];
  const pagination = coursesData?.pagination;

  const courses = useMemo(
    () => sortCourses(rawCourses, sort),
    [rawCourses, sort],
  );

  const parentCategories = useMemo(
    () => categories?.filter((c) => !c.parentCategoryId) ?? [],
    [categories],
  );

  const selectedCategory = parentCategories.find(
    (c) => c.categoryId === categoryId,
  );
  const hasFilters = !!categoryId || !!level || !!debouncedSearch;

  function resetFilters() {
    setSearch("");
    setCategoryId(undefined);
    setLevel(undefined);
    setSort("newest");
    setPage(1);
  }

  function selectCategory(id: string | undefined) {
    setCategoryId(id);
    setPage(1);
  }

  return (
    <>
      <section className="relative overflow-hidden bg-foreground py-10 text-background sm:py-14">
        <Image
          src="/images/landing/books.jpg"
          alt=""
          fill
          sizes="100vw"
          priority
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/85 via-foreground/65 to-foreground/45" />
        <div className="absolute inset-0 bg-primary/15 mix-blend-multiply" />
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mx-auto max-w-2xl text-center"
          >
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-background/70">
              <span className="inline-block h-px w-6 bg-background/30" />
              The catalogue
              <span className="inline-block h-px w-6 bg-background/30" />
            </p>
            <h1 className="font-display mt-3 text-3xl font-medium leading-[1.05] tracking-tight sm:text-4xl md:text-5xl">
              Find the course that{" "}
              <em className="text-primary">fits you.</em>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-background/80 sm:text-base">
              Expert-led programmes across academics, executive courses, and
              languages.
            </p>

            <form
              className="mx-auto mt-6 flex max-w-xl items-center gap-2 rounded-full border border-white/20 bg-white/95 p-1.5 pl-4 shadow-lg backdrop-blur"
              onSubmit={(e) => e.preventDefault()}
              role="search"
            >
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search courses, topics, instructors…"
                aria-label="Search courses"
                className="h-9 flex-1 border-0 bg-transparent px-1 text-sm text-foreground shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  aria-label="Clear search"
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </form>
          </motion.div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto py-2.5">
            <button
              type="button"
              onClick={() => selectCategory(undefined)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                !categoryId
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
              )}
            >
              All
            </button>
            {parentCategories.map((cat) => {
              const active = categoryId === cat.categoryId;
              return (
                <button
                  key={cat.categoryId}
                  type="button"
                  onClick={() =>
                    selectCategory(active ? undefined : cat.categoryId)
                  }
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
                  )}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground sm:text-sm">
              <span className="font-display text-base text-foreground">
                {pagination?.total ?? 0}
              </span>{" "}
              course{(pagination?.total ?? 0) === 1 ? "" : "s"}
              {selectedCategory && (
                <span>
                  {" "}
                  in{" "}
                  <span className="text-foreground">
                    {selectedCategory.name}
                  </span>
                </span>
              )}
              {debouncedSearch.trim() && (
                <span>
                  {" "}
                  matching{" "}
                  <span className="text-foreground">
                    &ldquo;{debouncedSearch.trim()}&rdquo;
                  </span>
                </span>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={level ?? "__all__"}
                onValueChange={(v) => {
                  setLevel(v === "__all__" ? undefined : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All levels</SelectItem>
                  {LEVEL_OPTIONS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sort}
                onValueChange={(v) => {
                  setSort(v as SortKey);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[170px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <CardGridSkeleton />
          ) : courses.length > 0 ? (
            <div
              className={cn(
                "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
                isFetching && "opacity-70 transition-opacity",
              )}
            >
              {courses.map((course) => (
                <CourseCard key={course.courseId} course={course} />
              ))}
            </div>
          ) : (
            <EmptyState onReset={resetFilters} hasFilters={hasFilters} />
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => {
                  setPage(p);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function CourseCard({ course }: { course: Course }) {
  const price = parseFloat(course.price);
  const compareAt = course.compareAtPrice
    ? parseFloat(course.compareAtPrice)
    : null;
  const discount =
    compareAt && compareAt > price
      ? Math.round(((compareAt - price) / compareAt) * 100)
      : null;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="size-8 text-muted-foreground/30" />
          </div>
        )}
        {discount !== null && discount > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">
            −{discount}%
          </span>
        )}
        {course.level && (
          <span
            className={cn(
              "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              course.level === "BEGINNER" &&
                "bg-emerald-500/95 text-white",
              course.level === "INTERMEDIATE" &&
                "bg-amber-500/95 text-white",
              course.level === "ADVANCED" && "bg-rose-500/95 text-white",
              course.level === "ALL_LEVELS" &&
                "bg-primary/90 text-primary-foreground",
            )}
          >
            {course.level === "ALL_LEVELS" ? "All" : course.level}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {course.category && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            {course.category.name}
          </p>
        )}
        <h3 className="font-display line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary">
          {course.title}
        </h3>
        {course.instructor && (
          <p className="truncate text-[11px] text-muted-foreground">
            {[course.instructor.firstName, course.instructor.lastName]
              .filter(Boolean)
              .join(" ") || course.instructor.email}
          </p>
        )}

        <div className="mt-auto flex items-baseline justify-between gap-2 border-t border-border/60 pt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-base font-medium text-foreground">
              ₹{price.toFixed(0)}
            </span>
            {compareAt && compareAt > price && (
              <span className="text-[11px] text-muted-foreground line-through">
                ₹{compareAt.toFixed(0)}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-primary">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="mt-3 h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean;
  onReset: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center"
    >
      <div className="grid size-16 place-items-center rounded-full bg-muted">
        <Search className="size-7 text-muted-foreground/50" />
      </div>
      <p className="font-display text-lg font-medium">No courses found.</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Try adjusting your search or filters."
          : "We're working on adding more programmes — check back soon."}
      </p>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onReset} className="mt-2">
          Clear filters
        </Button>
      )}
    </motion.div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <CoursesContent />
    </Suspense>
  );
}

function PageFallback() {
  return (
    <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <CardGridSkeleton />
    </div>
  );
}
