"use client";
import { useState } from "react";
import { toast } from "sonner";

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
import { useEnrollments } from "@/features/enrollments/hooks/use-enrollments";
import type { Enrollment } from "@/features/enrollments/types";
import { EditEnrollmentDialog } from "@/features/enrollments/components/edit-enrollment-dialog";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:
    "border-blue-300/40 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200",
  COMPLETED:
    "border-emerald-300/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
  REVOKED: "border-destructive/30 bg-destructive/5 text-destructive",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest",
        STATUS_STYLES[status] ?? "border-border bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

export default function EnrollmentManagementPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;
  const [editing, setEditing] = useState<Enrollment | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data, isLoading, isFetching } = useEnrollments({
    enabled: true,
    filters: {
      status: statusFilter === "all" ? undefined : statusFilter,
      search: debouncedSearch || undefined,
      page,
      limit,
    },
  });

  const enrollments = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;
  const currentPage = data?.pagination?.page ?? 1;

  return (
    <PageLayout
      subtitle="Console"
      header="Enrolments"
      description="Every learner-course pairing on the platform."
      filters={
        <PageFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by email or course…"
        >
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-full text-xs sm:w-[160px]">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="REVOKED">Revoked</SelectItem>
            </SelectContent>
          </Select>
        </PageFilters>
      }
    >
      {isLoading && !isFetching ? (
        <DataTableSkeleton columnCount={6} rowCount={8} />
      ) : enrollments.length === 0 ? (
        <EmptyState
          title="No enrolments yet"
          description="Enrolments land here once learners join courses."
          illustration="/illustrations/focused.svg"
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
                  <TableHead className="font-display text-xs">User</TableHead>
                  <TableHead className="font-display text-xs">Course</TableHead>
                  <TableHead className="hidden font-display text-xs md:table-cell">
                    Company
                  </TableHead>
                  <TableHead className="font-display text-xs">Status</TableHead>
                  <TableHead className="hidden font-display text-xs sm:table-cell">
                    Enrolled
                  </TableHead>
                  <TableHead className="text-right font-display text-xs">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment: Enrollment) => (
                  <TableRow
                    key={enrollment.enrollmentId}
                    className="cursor-pointer border-b-border/60 transition-colors hover:bg-muted/40"
                    onClick={() => {
                      setEditing(enrollment);
                      setIsEditOpen(true);
                    }}
                  >
                    <TableCell className="font-medium text-foreground">
                      {enrollment.user
                        ? [
                            enrollment.user.firstName,
                            enrollment.user.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ") || enrollment.user.email
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-sm text-foreground">
                      {enrollment.course?.title || "Unknown course"}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {enrollment.company?.name || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={enrollment.status} />
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                      {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(enrollment);
                          setIsEditOpen(true);
                        }}
                      >
                        Manage
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

      <EditEnrollmentDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        enrollment={editing}
      />
    </PageLayout>
  );
}
