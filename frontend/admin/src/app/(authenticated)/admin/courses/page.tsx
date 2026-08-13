"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { PageFilters } from "@/components/layout/page-filters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useCourses } from "@/features/courses/hooks/use-courses";
import type { CourseFilters } from "@/features/courses/types";

type StatusFilterValue = "all" | "DRAFT" | "PUBLISHED" | "ARCHIVED";

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED:
    "border-emerald-300/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
  DRAFT: "border-border bg-muted text-muted-foreground",
  ARCHIVED: "border-border bg-muted text-muted-foreground",
};

const REVIEW_STYLES: Record<string, string> = {
  PENDING_REVIEW:
    "border-amber-300/40 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
  APPROVED:
    "border-emerald-300/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
  CHANGES_REQUESTED:
    "border-amber-300/40 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
  REJECTED: "border-destructive/30 bg-destructive/5 text-destructive",
};

function StatusBadge({
  label,
  styles,
}: {
  label: string;
  styles: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest",
        styles,
      )}
    >
      {label}
    </span>
  );
}

export default function AdminCourseManagementPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const getStatusFilter = (): CourseFilters["status"] =>
    statusFilter === "all" ? undefined : statusFilter;

  const { data, isLoading, isError, isFetching } = useCourses({
    enabled: true,
    filters: {
      search: debouncedSearch || undefined,
      status: getStatusFilter(),
      page,
      limit,
    },
  });

  const totalPages = data?.pagination?.totalPages ?? 1;
  const currentPage = data?.pagination?.page ?? 1;
  const courses = data?.data ?? [];

  return (
    <PageLayout
      subtitle="Catalogue"
      header="Courses"
      description="Every course on the platform — published, draft, and archived."
      filters={
        <PageFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search courses…"
        >
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              if (
                v === "all" ||
                v === "DRAFT" ||
                v === "PUBLISHED" ||
                v === "ARCHIVED"
              ) {
                setStatusFilter(v);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="h-8 w-full text-xs sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </PageFilters>
      }
    >
      {isLoading && !isFetching ? (
        <DataTableSkeleton columnCount={6} rowCount={8} />
      ) : isError ? (
        <EmptyState
          title="Couldn't load courses"
          description="Try refreshing the page."
          illustration="/illustrations/no_data.svg"
        />
      ) : courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Once instructors create courses, they'll appear here."
          illustration="/illustrations/no_data.svg"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div
            className={cn(
              "overflow-x-auto",
              isFetching && "pointer-events-none opacity-50",
            )}
          >
            <Table>
              <TableHeader>
                <TableRow className="border-b-border/70">
                  <TableHead className="font-display text-xs">Title</TableHead>
                  <TableHead className="hidden font-display text-xs md:table-cell">
                    Category
                  </TableHead>
                  <TableHead className="hidden font-display text-xs lg:table-cell">
                    Instructor
                  </TableHead>
                  <TableHead className="font-display text-xs">
                    Status
                  </TableHead>
                  <TableHead className="font-display text-xs">
                    Review
                  </TableHead>
                  <TableHead className="hidden font-display text-xs sm:table-cell">
                    Price
                  </TableHead>
                  <TableHead className="hidden font-display text-xs lg:table-cell">
                    Created
                  </TableHead>
                  <TableHead className="text-right font-display text-xs">
                    Open
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow
                    key={course.courseId}
                    className="cursor-pointer border-b-border/60 transition-colors hover:bg-muted/40"
                    onClick={() => router.push(`/admin/courses/${course.courseId}`)}
                  >
                    <TableCell className="font-medium text-foreground">
                      {course.title}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {course.category?.name || "—"}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {course.instructor
                        ? [course.instructor.firstName, course.instructor.lastName]
                            .filter(Boolean)
                            .join(" ") || course.instructor.email
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={course.status}
                        styles={STATUS_STYLES[course.status] ?? "border-border bg-muted text-muted-foreground"}
                      />
                    </TableCell>
                    <TableCell>
                      {course.reviewStatus && (
                        <StatusBadge
                          label={course.reviewStatus.replace("_", " ")}
                          styles={
                            REVIEW_STYLES[course.reviewStatus] ??
                            "border-border bg-muted text-muted-foreground"
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap font-display text-sm sm:table-cell">
                      ₹{parseFloat(course.price).toFixed(2)}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        aria-label="View course"
                      >
                        <Link href={`/admin/courses/${course.courseId}`}>
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page <span className="text-foreground">{currentPage}</span> of{" "}
                <span className="text-foreground">{totalPages}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isFetching}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || isFetching}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </PageLayout>
  );
}
