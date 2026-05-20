"use client";
import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "@/components/layout/page-layout";
import { PageFilters } from "@/components/layout/page-filters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
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

import { useEnrollments } from "@/features/enrollments/hooks/use-enrollments";
import type { Enrollment } from "@/features/enrollments/types";
import { useAuthStore } from "@/lib/store/auth-store";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:
    "border-blue-300/40 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200",
  COMPLETED:
    "border-emerald-300/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
  REVOKED: "border-destructive/30 bg-destructive/5 text-destructive",
};

export default function CorporateEnrollmentsPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useEnrollments({
    enabled: true,
    filters: {
      companyId: user?.companyId ?? undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      limit: 100,
    },
  });

  const filtered = (data?.data ?? []).filter((enrollment: Enrollment) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const courseTitle = enrollment.course?.title.toLowerCase() ?? "";
    const userName = [
      enrollment.user?.firstName,
      enrollment.user?.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return courseTitle.includes(term) || userName.includes(term);
  });

  return (
    <PageLayout
      subtitle="Corporate"
      header="Enrolments"
      description="Bulk-enrol your team or audit existing access."
      actions={
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => toast.info("Bulk enrolment via CSV coming soon.")}
        >
          <Plus className="size-3.5" />
          Bulk enrol
        </Button>
      }
      filters={
        <PageFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name or course…"
        >
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No enrolments"
          description="Bulk-enrol your team or wait for individual sign-ups."
          icon={<BookOpen className="h-12 w-12" />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-border/70">
                  <TableHead className="font-display text-xs">User</TableHead>
                  <TableHead className="font-display text-xs">Course</TableHead>
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
                {filtered.map((enrollment: Enrollment) => (
                  <TableRow
                    key={enrollment.enrollmentId}
                    className="border-b-border/60 transition-colors hover:bg-muted/40"
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
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest",
                          STATUS_STYLES[enrollment.status] ??
                            "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {enrollment.status}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                      {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          toast.info("Per-enrolment management coming soon.")
                        }
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
