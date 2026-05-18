"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { PageFilters } from "@/components/layout/page-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { UserCheck, UserX, Clock, FileText } from "lucide-react";
import { useState } from "react";
import { useTeacherApplicationsList, useUpdateTeacherApplicationStatus } from "@/features/teacher-applications/hooks/use-teacher-applications";

export default function AdminTeacherApplicationsPage() {
  const [status, setStatus] = useState<string>("all");
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

  return (
    <PageLayout header="Instructor Applications" description="Review and approve or reject instructor applications." filters={
        <PageFilters search={search} onSearchChange={setSearch} searchPlaceholder="Search by name or email...">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-[140px]">
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
      }>
        {isLoading ? (
          <DataTableSkeleton columnCount={6} rowCount={10} />
        ) : applications.length === 0 ? (
          <EmptyState title="No applications" description="Instructor applications will appear here." icon={<FileText className="h-12 w-12" />} />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.applicationId}>
                      <TableCell className="font-medium">{app.fullName}</TableCell>
                      <TableCell>{app.email}</TableCell>
                      <TableCell>{app.experienceYears != null ? `${app.experienceYears} yr` : "-"}</TableCell>
                      <TableCell>
                        {app.status === "PENDING" && <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>}
                        {app.status === "APPROVED" && <Badge className="bg-green-600">Approved</Badge>}
                        {app.status === "REJECTED" && <Badge variant="destructive">Rejected</Badge>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(app.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {app.status === "PENDING" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="default" className="text-green-600" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: app.applicationId, status: "APPROVED" })}>
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: app.applicationId, status: "REJECTED" })}>
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </Card>
        )}
    </PageLayout>
  );
}
