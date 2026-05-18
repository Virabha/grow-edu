"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { PageFilters } from "@/components/layout/page-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { useCourses } from "@/features/courses/hooks/use-courses";
import type { Course } from "@/features/courses/types";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CourseFilters } from "@/features/courses/types";
type StatusFilterValue = "all" | "DRAFT" | "PUBLISHED" | "ARCHIVED";
import { useDebounce } from "@/hooks/use-debounce";
export default function AdminCourseManagementPage() {
    const [mounted, setMounted] = useState(false);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [page, setPage] = useState(1);
    const limit = 20;
    useEffect(() => {
        setMounted(true);
    }, []);
    const getStatusFilter = (): CourseFilters["status"] => {
        if (statusFilter === "all")
            return undefined;
        return statusFilter;
    };
    const handleStatusFilterChange = (value: string) => {
        if (value === "all" ||
            value === "DRAFT" ||
            value === "PUBLISHED" ||
            value === "ARCHIVED") {
            setStatusFilter(value);
            setPage(1);
        }
    };
    const { data: coursesData, isLoading, isError, isFetching, } = useCourses({
        enabled: true,
        filters: {
            search: debouncedSearch || undefined,
            status: getStatusFilter(),
            categoryId: categoryFilter === "all" ? undefined : categoryFilter,
            page,
            limit,
        },
    });
    const totalPages = coursesData?.pagination?.totalPages || 1;
    const currentPage = coursesData?.pagination?.page || 1;
    return (<PageLayout header="Course Management" description="Manage all courses, approve content, and moderate listings." filters={
        <PageFilters search={search} onSearchChange={setSearch} searchPlaceholder="Search courses...">
          {mounted ? (<>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="h-8 text-xs w-full sm:w-[140px]">
                  <SelectValue placeholder="All Status"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 text-xs w-full sm:w-[140px]">
                  <SelectValue placeholder="All Categories"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                </SelectContent>
              </Select>
            </>) : (<>
              <Skeleton className="w-full sm:w-[140px] h-8"/>
              <Skeleton className="w-full sm:w-[140px] h-8"/>
            </>)}
        </PageFilters>
      }>
        {isLoading && !isFetching ? (<div className="space-y-2">
            <DataTableSkeleton columnCount={6} rowCount={8} />
          </div>) : isError ? (<EmptyState title="Error loading courses" description="There was a problem loading the courses. Please try again." illustration="/illustrations/no_data.svg"/>) : !coursesData?.data || coursesData.data.length === 0 ? (<EmptyState title="No courses found" description="Courses will appear here once instructors create them." illustration="/illustrations/no_data.svg"/>) : (<Card>
            <CardContent className="p-0">
              <div className={cn("overflow-x-auto", isFetching && "opacity-50 pointer-events-none")}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Title</TableHead>
                      <TableHead className="min-w-[120px] hidden md:table-cell">
                        Category
                      </TableHead>
                      <TableHead className="min-w-[150px] hidden lg:table-cell">
                        Instructor
                      </TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[150px]">
                        Review Status
                      </TableHead>
                      <TableHead className="min-w-[100px] hidden sm:table-cell">
                        Price
                      </TableHead>
                      <TableHead className="min-w-[100px] hidden lg:table-cell">
                        Created
                      </TableHead>
                      <TableHead className="text-right min-w-[60px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coursesData.data.map((course) => (<TableRow key={course.courseId}>
                        <TableCell className="font-medium">
                          {course.title}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {course.category?.name || "N/A"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {course.instructor
                    ? `${course.instructor.firstName || ""} ${course.instructor.lastName || ""}`.trim() || course.instructor.email
                    : "N/A"}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded ${course.status === "PUBLISHED"
                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                    : course.status === "DRAFT"
                        ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                        : "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200"}`}>
                            {course.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {course.reviewStatus && (<span className={cn("px-2 py-1 text-xs rounded border", course.reviewStatus === "PENDING_REVIEW"
                        ? "bg-orange-100 text-orange-800 border-orange-200"
                        : course.reviewStatus === "APPROVED"
                            ? "bg-green-50 text-green-800 border-green-200"
                            : "bg-gray-50 text-gray-600 border-gray-200")}>
                              {course.reviewStatus.replace("_", " ")}
                            </span>)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          ₹{parseFloat(course.price).toFixed(2)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {new Date(course.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/courses/${course.courseId}`}>
                            <Button variant="ghost" size="icon" title="View & Review">
                              <Eye className="size-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            {totalPages > 1 && (<div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || isFetching}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || isFetching}>
                    Next
                  </Button>
                </div>
              </div>)}
          </Card>)}
    </PageLayout>);
}
