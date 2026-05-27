"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { PageFilters } from "@/components/layout/page-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  useBatches,
  useDeleteBatch,
} from "@/features/batches/hooks/use-batches";
import { BatchFormDialog } from "@/features/batches/components/batch-form-dialog";
import type { Batch, BatchStatus } from "@/features/batches/types";

const STATUS_TONE: Record<BatchStatus, string> = {
  DRAFT: "bg-zinc-500",
  UPCOMING: "bg-amber-500",
  ONGOING: "bg-emerald-600",
  COMPLETED: "bg-blue-600",
  ARCHIVED: "bg-zinc-400",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminBatchesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Batch | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BatchStatus | "ALL">("ALL");

  const { data, isLoading } = useBatches({
    search: search || undefined,
    status: status === "ALL" ? undefined : status,
    limit: 50,
  });
  const removeBatch = useDeleteBatch();

  const items = data?.data ?? [];

  const handleCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((batch: Batch) => {
    setEditing(batch);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((batch: Batch) => {
    setDeleting(batch);
    setConfirmOpen(true);
  }, []);

  const onConfirmDelete = useCallback(() => {
    if (deleting) removeBatch.mutate(deleting.batchId);
  }, [deleting, removeBatch]);

  return (
    <PageLayout
      subtitle="Cohorts"
      header="Batches"
      description="Live cohorts with schedules, recordings, and dedicated student rosters."
      actions={
        <Button size="sm" onClick={handleCreate} className="gap-1.5">
          <Plus className="size-3.5" />
          New batch
        </Button>
      }
    >
      <PageFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search title, exam…"
        className="mb-4"
      >
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as BatchStatus | "ALL")}
        >
          <SelectTrigger className="h-8 text-xs sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="UPCOMING">Upcoming</SelectItem>
            <SelectItem value="ONGOING">Ongoing</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </PageFilters>

      {isLoading ? (
        <DataTableSkeleton columnCount={6} rowCount={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No batches yet"
          description="Create your first cohort to start scheduling live classes and uploading recordings."
          icon={<GraduationCap className="h-12 w-12" />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-border/70">
                  <TableHead className="font-display text-xs">Batch</TableHead>
                  <TableHead className="hidden font-display text-xs md:table-cell">
                    Target exam
                  </TableHead>
                  <TableHead className="hidden font-display text-xs lg:table-cell">
                    Dates
                  </TableHead>
                  <TableHead className="hidden font-display text-xs lg:table-cell">
                    Price
                  </TableHead>
                  <TableHead className="font-display text-xs">Status</TableHead>
                  <TableHead className="text-right font-display text-xs">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((b) => (
                  <TableRow
                    key={b.batchId}
                    className="border-b-border/60 transition-colors hover:bg-muted/40"
                  >
                    <TableCell>
                      <Link
                        href={`/admin/batches/${b.batchId}`}
                        className="font-medium hover:underline"
                      >
                        {b.title}
                      </Link>
                      {b.shortDescription && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {b.shortDescription}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {b.targetExam ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {formatDate(b.startDate)} – {formatDate(b.endDate)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {b.price === 0 ? (
                        <span className="font-medium text-green-600">Free</span>
                      ) : (
                        <span>
                          {b.currency} {b.price.toFixed(0)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_TONE[b.status]}>
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/batches/${b.batchId}`}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Manage
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(b)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(b)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <BatchFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        batch={editing}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete batch"
        description={`Delete "${deleting?.title}"? Enrolled students will lose access.`}
        onConfirm={onConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </PageLayout>
  );
}
