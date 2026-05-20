"use client";
import { useState } from "react";
import { Clock, FileText, UserCheck, UserX } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { PageFilters } from "@/components/layout/page-filters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Badge } from "@/components/ui/badge";
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
import {
  useTeacherApplicationsList,
  useUpdateTeacherApplicationStatus,
} from "@/features/teacher-applications/hooks/use-teacher-applications";

export default function AdminTeacherApplicationsPage() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useTeacherApplicationsList({
    status: status === "all" ? undefined : status,
    search: search.trim() || undefined,
    page,
    limit: 20,
  });
  const updateStatus = useUpdateTeacherApplicationStatus();

  const applications = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <PageLayout
      subtitle="Console"
      header="Instructor applications"
      description="Approve or reject people applying to teach on grotutor."
      filters={
        <PageFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name or email…"
        >
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-full text-xs sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </PageFilters>
      }
    >
      {isLoading ? (
        <DataTableSkeleton columnCount={6} rowCount={10} />
      ) : applications.length === 0 ? (
        <EmptyState
          title="No applications"
          description="Instructor applications appear here as they come in."
          icon={<FileText className="h-12 w-12" />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-border/70">
                  <TableHead className="font-display text-xs">Name</TableHead>
                  <TableHead className="font-display text-xs">Email</TableHead>
                  <TableHead className="hidden font-display text-xs sm:table-cell">
                    Experience
                  </TableHead>
                  <TableHead className="font-display text-xs">Status</TableHead>
                  <TableHead className="hidden font-display text-xs md:table-cell">
                    Applied
                  </TableHead>
                  <TableHead className="text-right font-display text-xs">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow
                    key={app.applicationId}
                    className="border-b-border/60 transition-colors hover:bg-muted/40"
                  >
                    <TableCell className="font-medium text-foreground">
                      {app.fullName}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">
                      {app.email}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {app.experienceYears != null
                        ? `${app.experienceYears} yr`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {app.status === "PENDING" && (
                        <Badge
                          variant="secondary"
                          className="rounded-full text-[10px] uppercase tracking-widest"
                        >
                          <Clock className="mr-1 size-3" />
                          Pending
                        </Badge>
                      )}
                      {app.status === "APPROVED" && (
                        <Badge className="rounded-full bg-emerald-600 text-[10px] uppercase tracking-widest">
                          Approved
                        </Badge>
                      )}
                      {app.status === "REJECTED" && (
                        <Badge
                          variant="destructive"
                          className="rounded-full text-[10px] uppercase tracking-widest"
                        >
                          Rejected
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {app.status === "PENDING" ? (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updateStatus.isPending}
                            className="gap-1 text-emerald-700 dark:text-emerald-300"
                            onClick={() =>
                              updateStatus.mutate({
                                id: app.applicationId,
                                status: "APPROVED",
                              })
                            }
                          >
                            <UserCheck className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updateStatus.isPending}
                            className="gap-1 text-destructive"
                            onClick={() =>
                              updateStatus.mutate({
                                id: app.applicationId,
                                status: "REJECTED",
                              })
                            }
                          >
                            <UserX className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && pagination ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page <span className="text-foreground">{pagination.page}</span> of{" "}
                <span className="text-foreground">{totalPages}</span> ·{" "}
                {pagination.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
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
