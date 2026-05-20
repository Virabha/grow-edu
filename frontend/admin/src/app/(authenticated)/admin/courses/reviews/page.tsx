"use client";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, CheckCircle2, FileText, User } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useCourses } from "@/lib/hooks/use-courses";

export default function AdminCourseReviewsPage() {
  const router = useRouter();
  const { data, isLoading } = useCourses({ filters: { limit: 100 } });

  const pendingCourses =
    data?.data?.filter((c) => c.reviewStatus === "PENDING_REVIEW") ?? [];

  return (
    <PageLayout
      subtitle="Moderation"
      header="Course reviews"
      description="Courses submitted for approval, in arrival order."
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : pendingCourses.length === 0 ? (
        <EmptyState
          title="All caught up"
          description="No courses are waiting for approval right now."
          icon={<CheckCircle2 className="h-12 w-12" />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pendingCourses.map((course) => (
            <article
              key={course.courseId}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_16px_40px_-20px_rgba(28,25,23,0.18)]"
            >
              <header className="border-b border-border/70 px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    Pending
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {course.submittedAt
                      ? formatDistanceToNow(new Date(course.submittedAt), {
                          addSuffix: true,
                        })
                      : "recently"}
                  </span>
                </div>
                <h3 className="font-display mt-3 line-clamp-2 text-lg font-medium leading-snug text-foreground">
                  {course.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {course.description}
                </p>
              </header>

              <dl className="space-y-2 px-5 py-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="size-3.5" />
                  {[course.instructor?.firstName, course.instructor?.lastName]
                    .filter(Boolean)
                    .join(" ") ||
                    course.instructor?.email ||
                    "Unknown instructor"}
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="size-3.5" />
                  {course.sections?.length ?? 0} section
                  {course.sections?.length === 1 ? "" : "s"}
                </div>
              </dl>

              <footer className="mt-auto border-t border-border/70 px-5 py-3">
                <Button
                  className="w-full gap-1.5"
                  onClick={() =>
                    router.push(`/admin/courses/reviews/${course.courseId}`)
                  }
                >
                  Review course
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
