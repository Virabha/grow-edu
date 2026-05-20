"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle, Layers, Search } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CourseCardSkeleton } from "@/components/cards/course-card-skeleton";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SecureImage } from "@/components/ui/secure-image";
import { useEnrollments } from "@/lib/hooks/use-enrollments";
import { useAuthStore } from "@/lib/store/auth-store";

const STATUSES = [
  { value: "all", label: "All status" },
  { value: "ACTIVE", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REVOKED", label: "Revoked" },
] as const;

export default function MyCoursesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data: enrollmentsData, isLoading } = useEnrollments({
    enabled: true,
    filters: {
      userId: user?.id,
      status: statusFilter === "all" ? undefined : statusFilter,
      page,
      limit: 12,
    },
  });

  const pagination = enrollmentsData?.pagination;
  const enrollments = enrollmentsData?.data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return enrollments;
    const needle = search.toLowerCase();
    return enrollments.filter((e) =>
      (e.course?.title ?? "").toLowerCase().includes(needle),
    );
  }, [enrollments, search]);

  return (
    <PageLayout
      header="My Courses"
      description="Continue your learning journey with your enrolled courses."
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search your courses…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-9 pl-8 text-sm"
              aria-label="Search enrolled courses"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-full text-sm sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No courses found"
            description={
              search
                ? "No courses match your search. Try different keywords."
                : "Start your learning journey by enrolling in a course."
            }
            icon={<BookOpen className="size-12" />}
            action={
              search
                ? undefined
                : {
                    label: "Browse courses",
                    onClick: () => router.push("/courses"),
                  }
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((enrollment) => (
              <Card
                key={enrollment.enrollmentId}
                className="group overflow-hidden py-0 gap-0 transition-shadow hover:shadow-lg"
              >
                <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                  {enrollment.course?.thumbnail ? (
                    <SecureImage
                      src={enrollment.course.thumbnail}
                      alt={enrollment.course?.title || "Course thumbnail"}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <BookOpen className="size-10 text-primary/30" />
                    </div>
                  )}
                  {enrollment.accessType === "SECTION" && (
                    <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      <Layers className="size-2.5" />
                      Partial
                    </div>
                  )}
                </div>
                <CardContent className="space-y-1.5 px-3 pb-2.5 pt-0">
                  <div>
                    <h3 className="line-clamp-2 text-sm font-semibold">
                      {enrollment.course?.title || "Unknown course"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {enrollment.accessType === "SECTION"
                        ? "Purchased"
                        : "Enrolled"}{" "}
                      {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </p>
                  </div>

                  {enrollment.accessType === "SECTION" &&
                    enrollment.accessedSections &&
                    enrollment.accessedSections.length > 0 && (
                      <div
                        className="rounded bg-amber-50 px-1.5 py-1 text-[10px] text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                        title={`Sections: ${enrollment.accessedSections
                          .map((s) => s.title)
                          .join(", ")}`}
                      >
                        <span className="font-medium">
                          {enrollment.accessedSections.length} section
                          {enrollment.accessedSections.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}

                  <div className="flex flex-wrap items-center gap-1.5">
                    {enrollment.accessType === "SECTION" ? (
                      <StatusChip tone="amber" icon={<Layers className="size-2.5" />}>
                        Section
                      </StatusChip>
                    ) : (
                      <>
                        {enrollment.status === "ACTIVE" && (
                          <StatusChip tone="blue">In progress</StatusChip>
                        )}
                        {enrollment.status === "COMPLETED" && (
                          <StatusChip
                            tone="green"
                            icon={<CheckCircle className="size-2.5" />}
                          >
                            Done
                          </StatusChip>
                        )}
                        {enrollment.status === "REVOKED" && (
                          <StatusChip tone="red">Revoked</StatusChip>
                        )}
                      </>
                    )}
                  </div>

                  <Link
                    href={`/courses/${enrollment.courseId}/watch`}
                    className="block"
                  >
                    <Button
                      className="h-8 w-full text-xs"
                      size="sm"
                      variant={
                        enrollment.status === "COMPLETED"
                          ? "outline"
                          : "default"
                      }
                    >
                      {enrollment.accessType === "SECTION"
                        ? "Watch"
                        : enrollment.status === "COMPLETED"
                          ? "Review"
                          : "Resume"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {pagination && (pagination.totalPages ?? 0) > 1 && (
          <div className="mt-6">
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
    </PageLayout>
  );
}

function StatusChip({
  tone,
  icon,
  children,
}: {
  tone: "blue" | "green" | "red" | "amber";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneClass = {
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
    green:
      "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
    red: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
    amber:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${toneClass}`}
    >
      {icon}
      {children}
    </span>
  );
}
