"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, BarChart3, Plus, Trash2 } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SecureImage } from "@/components/ui/secure-image";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  useCourses,
  useDeleteCourse,
} from "@/features/courses/hooks/use-courses";
import { useAuthStore } from "@/lib/store/auth-store";
import type { Course } from "@/lib/api/services/courses";

type ReviewStatusVariant =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | "PUBLISHED";

const STATUS_STYLES: Record<ReviewStatusVariant, string> = {
  DRAFT: "border-border bg-muted text-muted-foreground",
  UNDER_REVIEW:
    "border-blue-300/40 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200",
  CHANGES_REQUESTED:
    "border-amber-300/40 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
  REJECTED: "border-destructive/30 bg-destructive/5 text-destructive",
  PUBLISHED:
    "border-emerald-300/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
};

const STATUS_LABELS: Record<ReviewStatusVariant, string> = {
  DRAFT: "Draft",
  UNDER_REVIEW: "Under review",
  CHANGES_REQUESTED: "Changes requested",
  REJECTED: "Rejected",
  PUBLISHED: "Published",
};

function getStatusVariant(course: Course): ReviewStatusVariant {
  if (course.reviewStatus === "APPROVED") return "PUBLISHED";
  if (course.reviewStatus === "PENDING_REVIEW") return "UNDER_REVIEW";
  if (course.reviewStatus === "CHANGES_REQUESTED") return "CHANGES_REQUESTED";
  if (course.reviewStatus === "REJECTED") return "REJECTED";
  return "DRAFT";
}

function CourseCard({
  course,
  onDelete,
  deleting,
}: {
  course: Course;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const variant = getStatusVariant(course);
  const isPublished = variant === "PUBLISHED";
  const isPending = variant === "UNDER_REVIEW";
  const reviewerNote =
    variant === "CHANGES_REQUESTED" || variant === "REJECTED"
      ? course.rejectionReason || course.reviewNotes
      : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_16px_40px_-20px_rgba(28,25,23,0.18)]">
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {course.thumbnail ? (
          <SecureImage
            src={course.thumbnail}
            alt={course.title}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground/40">
            <BookOpen className="size-10" />
          </div>
        )}
        <span
          className={cn(
            "absolute right-3 top-3 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest",
            STATUS_STYLES[variant],
          )}
        >
          {STATUS_LABELS[variant]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display line-clamp-2 text-lg font-medium leading-snug text-foreground">
          {course.title}
        </h3>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {course.description || "No description provided."}
        </p>
        {reviewerNote && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] leading-relaxed text-destructive">
            <span className="font-semibold uppercase tracking-widest">
              Admin note ·{" "}
            </span>
            {reviewerNote}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 flex-1"
          >
            <Link href={`/instructor/courses/${course.courseId}/edit`}>
              Edit
            </Link>
          </Button>
          {isPublished && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="gap-1.5"
              aria-label="Analytics"
            >
              <Link href={`/instructor/courses/${course.courseId}/analytics`}>
                <BarChart3 className="size-3.5" />
              </Link>
            </Button>
          )}
          {!isPublished && !isPending && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deleting}
                  aria-label="Delete course"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this course?</AlertDialogTitle>
                  <AlertDialogDescription>
                    &ldquo;{course.title}&rdquo; will be permanently removed.
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(course.courseId)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </article>
  );
}

export default function InstructorCourseManagementPage() {
  const { user } = useAuthStore();
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | ReviewStatusVariant>("all");
  const deleteCourse = useDeleteCourse();

  const { data: coursesData, isLoading } = useCourses({
    enabled: !!user?.id,
    filters: { instructorId: user?.id, limit: 100 },
  });

  const courses = coursesData?.data ?? [];

  const filteredCourses = useMemo(() => {
    const term = search.trim().toLowerCase();
    return courses.filter((c) => {
      const matchesSearch =
        !term ||
        c.title.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term);
      const matchesFilter = filter === "all" || getStatusVariant(c) === filter;
      return matchesSearch && matchesFilter;
    });
  }, [courses, search, filter]);

  const onDelete = async (courseId: string) => {
    setDeletingCourseId(courseId);
    try {
      await deleteCourse.mutateAsync(courseId);
    } finally {
      setDeletingCourseId(null);
    }
  };

  return (
    <PageLayout
      subtitle="Studio"
      header="My courses"
      description="Drafts, published, and everything in between."
      actions={
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/instructor/courses/new">
            <Plus className="size-3.5" />
            New course
          </Link>
        </Button>
      }
      filters={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search your courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs sm:w-72"
          />
          <Select
            value={filter}
            onValueChange={(v) => setFilter(v as typeof filter)}
          >
            <SelectTrigger className="h-8 w-full text-xs sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              <SelectItem value="DRAFT">Drafts</SelectItem>
              <SelectItem value="UNDER_REVIEW">Under review</SelectItem>
              <SelectItem value="CHANGES_REQUESTED">
                Changes requested
              </SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Create your first course to start teaching learners."
          icon={<BookOpen className="h-12 w-12" />}
          action={{
            label: "Create course",
            onClick: () =>
              (window.location.href = "/instructor/courses/new"),
          }}
        />
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          title="No matches"
          description="Try a different search term or filter."
          icon={<BookOpen className="h-12 w-12" />}
          action={{
            label: "Clear filters",
            onClick: () => {
              setSearch("");
              setFilter("all");
            },
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.courseId}
              course={course}
              onDelete={onDelete}
              deleting={deletingCourseId === course.courseId}
            />
          ))}
        </div>
      )}

      {/* Helper link to creating a course */}
      {!isLoading && courses.length > 0 && (
        <div className="mt-8 flex items-center justify-center">
          <Link
            href="/instructor/courses/new"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Create another course
            <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </PageLayout>
  );
}
