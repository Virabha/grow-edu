"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { useEnrollments } from "@/features/enrollments/hooks/use-enrollments";
import type { Enrollment } from "@/features/enrollments/types";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PageFilters } from "@/components/layout/page-filters";
import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { EditEnrollmentDialog } from "@/features/enrollments/components/edit-enrollment-dialog";
export default function EnrollmentManagementPage() {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 20;
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(
    null,
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const {
    data: enrollmentsData,
    isLoading,
    isFetching,
  } = useEnrollments({
    enabled: true,
    filters: {
      status: statusFilter === "all" ? undefined : statusFilter,
      search: debouncedSearch || undefined,
      page,
      limit,
    },
  });
  const handleEditClick = (enrollment: Enrollment) => {
    setEditingEnrollment(enrollment);
    setIsEditOpen(true);
  };
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };
  const totalPages = enrollmentsData?.pagination?.totalPages || 1;
  const currentPage = enrollmentsData?.pagination?.page || 1;
  return (
    <PageLayout
      header="Enrollment Management"
      description="View and manage all course enrollments across the platform."
      filters={
        <PageFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search enrollments..."
        >
          {mounted ? (
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 text-xs w-full sm:w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="REVOKED">Revoked</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Skeleton className="w-full sm:w-[140px] h-8" />
          )}
        </PageFilters>
      }
    >
      {isLoading && !isFetching ? (
        <DataTableSkeleton columnCount={6} rowCount={8} />
      ) : !enrollmentsData?.data || enrollmentsData.data.length === 0 ? (
        <EmptyState
          title="No enrollments found"
          description="Enrollments will appear here once users enroll in courses."
          illustration="/illustrations/focused.svg"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div
              className={cn(
                "overflow-x-auto",
                isFetching && "opacity-50 pointer-events-none",
              )}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">User</TableHead>
                    <TableHead className="min-w-[150px]">Course</TableHead>
                    <TableHead className="min-w-[100px] hidden md:table-cell">
                      Company
                    </TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="min-w-[100px] hidden sm:table-cell">
                      Enrolled
                    </TableHead>
                    <TableHead className="text-right min-w-[80px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollmentsData.data.map((enrollment: Enrollment) => (
                    <TableRow key={enrollment.enrollmentId}>
                      <TableCell className="font-medium">
                        {enrollment.user
                          ? `${enrollment.user.firstName || ""} ${enrollment.user.lastName || ""}`.trim() ||
                            enrollment.user.email
                          : "N/A"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {enrollment.course?.title || "Unknown Course"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {enrollment.company?.name || "N/A"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                            enrollment.status === "ACTIVE"
                              ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                              : enrollment.status === "COMPLETED"
                                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                          }`}
                        >
                          {enrollment.status}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(enrollment)}
                        >
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
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
          )}
        </Card>
      )}

      <EditEnrollmentDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        enrollment={editingEnrollment}
      />
    </PageLayout>
  );
}
