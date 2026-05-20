"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { BookOpen, CheckCircle, Search, Layers } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useEnrollments } from "@/lib/hooks/use-enrollments";
import { useAuthStore } from "@/lib/store/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { CourseCardSkeleton } from "@/components/cards/course-card-skeleton";
import { Pagination } from "@/components/ui/pagination";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SecureImage } from "@/components/ui/secure-image";
export default function MyCoursesPage() {
  const [mounted, setMounted] = useState(false);
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  useEffect(() => {
    setMounted(true);
  }, []);
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
  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
    <PageLayout
      header="My Courses"
      description="Continue your learning journey with your enrolled courses."
    >
      <div className="space-y-4">
        <div className="flex gap-2 sm:gap-3 flex-col sm:flex-row">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 h-9 text-sm"
            />
          </div>
          {mounted ? (
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="REVOKED">Revoked</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="w-full sm:w-[160px]">
              <div className="h-9 w-full bg-muted animate-pulse rounded-md" />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-full">
                <CourseCardSkeleton />
              </div>
            ))}
          </div>
        ) : !enrollmentsData?.data || enrollmentsData.data.length === 0 ? (
          <EmptyState
            title="No courses found"
            description={
              search
                ? "No courses match your search. Try different keywords."
                : "Start your learning journey by enrolling in a course."
            }
            icon={<BookOpen className="h-12 w-12" />}
            action={
              !search
                ? {
                    label: "Browse Courses",
                    onClick: () => (window.location.href = "/courses"),
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {enrollmentsData.data
              .filter((enrollment) => {
                if (search) {
                  const courseTitle =
                    enrollment.course?.title.toLowerCase() || "";
                  return courseTitle.includes(search.toLowerCase());
                }
                return true;
              })
              .map((enrollment) => (
                <Card
                  key={enrollment.enrollmentId}
                  className="overflow-hidden hover:shadow-lg transition-shadow group py-0 gap-0"
                >
                  <div className="h-32 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 relative">
                    {enrollment.course?.thumbnail ? (
                      <SecureImage
                        src={enrollment.course.thumbnail}
                        alt={enrollment.course?.title || "Course thumbnail"}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-primary/30" />
                      </div>
                    )}
                    {enrollment.accessType === "SECTION" && (
                      <div className="absolute top-1.5 right-1.5 bg-amber-500/90 text-white px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5">
                        <Layers className="h-2.5 w-2.5" />
                        Partial
                      </div>
                    )}
                  </div>
                  <CardContent className="px-3 pt-0 pb-2.5 space-y-1.5">
                    <div>
                      <h3 className="font-semibold text-sm line-clamp-2 mb-0.5">
                        {enrollment.course?.title || "Unknown Course"}
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
                          className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-1 rounded"
                          title={`Sections: ${enrollment.accessedSections.map((s) => s.title).join(", ")}`}
                        >
                          <span className="font-medium">
                            {enrollment.accessedSections.length} section{enrollment.accessedSections.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {enrollment.accessType === "SECTION" ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded flex items-center gap-0.5">
                          <Layers className="h-2.5 w-2.5" />
                          Section
                        </span>
                      ) : (
                        <>
                          {enrollment.status === "ACTIVE" && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded">
                              In Progress
                            </span>
                          )}
                          {enrollment.status === "COMPLETED" && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded flex items-center gap-0.5">
                              <CheckCircle className="h-2.5 w-2.5" />
                              Done
                            </span>
                          )}
                          {enrollment.status === "REVOKED" && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded">
                              Revoked
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <Link
                      href={`/courses/${enrollment.courseId}/watch`}
                      className="block"
                    >
                      <Button
                        className="w-full h-8 text-xs"
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

        {pagination && (pagination.totalPages ?? 0) > 1 ? (
          <div className="mt-6">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(newPage) => {
                setPage(newPage);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        ) : null}
      </div>
    </PageLayout>
    </div>
  );
}
