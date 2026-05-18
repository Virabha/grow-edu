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
import { FileText, Trash2 } from "lucide-react";
import { useState } from "react";
import { useServiceApplications, useServicesAdmin, useDeleteServiceApplication } from "@/features/cms/hooks/use-cms";
import { ApplicationDetailSheet } from "@/features/cms/components/application-detail-sheet";
import type { ApplicationStatus } from "@/features/cms/types";

function getStatusVariant(status: ApplicationStatus) {
  switch (status) {
    case "NEW": return "secondary" as const;
    case "REVIEWED": return "outline" as const;
    case "CONTACTED": return "default" as const;
    case "ACCEPTED": return "default" as const;
    case "REJECTED": return "destructive" as const;
    default: return "secondary" as const;
  }
}

export default function ServiceApplicationsPage() {
  const [status, setStatus] = useState<string>("all");
  const [serviceId, setServiceId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: servicesData } = useServicesAdmin();
  const services = servicesData ?? [];

  const { data, isLoading } = useServiceApplications({
    status: status === "all" ? undefined : status,
    serviceId: serviceId === "all" ? undefined : serviceId,
    search: search.trim() || undefined,
    page,
    limit: 20,
  });
  const deleteApp = useDeleteServiceApplication();

  const applications = data?.data ?? [];
  const pagination = data?.pagination;

  function openDetail(id: string) {
    setSelectedId(id);
    setSheetOpen(true);
  }

  return (
    <PageLayout
      header="Service Applications"
      description="View and manage service application submissions."
      filters={
        <PageFilters search={search} onSearchChange={setSearch} searchPlaceholder="Search by name or email...">
          <Select value={serviceId} onValueChange={(v) => { setServiceId(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-[180px]">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {services.map((s) => (
                <SelectItem key={s.serviceId} value={s.serviceId}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="REVIEWED">Reviewed</SelectItem>
              <SelectItem value="CONTACTED">Contacted</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
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
          description="Service applications will appear here when learners submit forms."
          icon={<FileText className="h-12 w-12" />}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow
                    key={app.applicationId}
                    className="cursor-pointer"
                    onClick={() => openDetail(app.applicationId)}
                  >
                    <TableCell className="font-medium">{app.applicantName}</TableCell>
                    <TableCell>{app.applicantEmail}</TableCell>
                    <TableCell className="text-muted-foreground">{app.serviceTitle ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(app.status as ApplicationStatus)}>
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={deleteApp.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this application?")) {
                            deleteApp.mutate(app.applicationId);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <ApplicationDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        applicationId={selectedId}
      />
    </PageLayout>
  );
}
