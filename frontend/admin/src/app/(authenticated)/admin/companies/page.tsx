"use client";
import { useCallback, useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "@/components/layout/page-layout";
import { PageFilters } from "@/components/layout/page-filters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import {
  useCompanies,
  useDeleteCompany,
} from "@/features/companies/hooks/use-companies";
import type { Company } from "@/features/companies/types";
import { EditCompanyDialog } from "@/features/companies/components/edit-company-dialog";

export default function CompanyManagementPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, isFetching } = useCompanies({
    enabled: true,
    filters: { search: debouncedSearch || undefined, page, limit },
  });
  const deleteCompany = useDeleteCompany();

  const onDelete = useCallback(async () => {
    if (!deletingCompany) return;
    try {
      await deleteCompany.mutateAsync(deletingCompany.id);
    } catch {
      // toast handled in hook
    }
  }, [deletingCompany, deleteCompany]);

  const companies = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <PageLayout
      subtitle="Console"
      header="Companies"
      description="Corporate accounts and their enrolment licences."
      actions={
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => toast.info("Add company coming soon.")}
        >
          <Building2 className="size-3.5" />
          Add company
        </Button>
      }
      filters={
        <PageFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search companies…"
        />
      }
    >
      {isLoading ? (
        <DataTableSkeleton columnCount={5} rowCount={8} />
      ) : companies.length === 0 ? (
        <EmptyState
          title="No companies yet"
          description="Corporate accounts appear here once created."
          icon={<Building2 className="h-12 w-12" />}
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
                  <TableHead className="font-display text-xs">Name</TableHead>
                  <TableHead className="hidden font-display text-xs sm:table-cell">
                    Email
                  </TableHead>
                  <TableHead className="hidden font-display text-xs md:table-cell">
                    Phone
                  </TableHead>
                  <TableHead className="hidden font-display text-xs lg:table-cell">
                    Created
                  </TableHead>
                  <TableHead className="text-right font-display text-xs">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow
                    key={company.id}
                    className="border-b-border/60 transition-colors hover:bg-muted/40"
                  >
                    <TableCell className="font-display font-medium text-foreground">
                      {company.name}
                    </TableCell>
                    <TableCell className="hidden max-w-[260px] truncate text-sm text-muted-foreground sm:table-cell">
                      {company.email || "—"}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {company.phone || "—"}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingCompany(company);
                            setIsEditOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={deleteCompany.isPending}
                          onClick={() => {
                            setDeletingCompany(company);
                            setConfirmOpen(true);
                          }}
                        >
                          {deleteCompany.isPending ? "Deleting…" : "Delete"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && data?.pagination ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page <span className="text-foreground">{data.pagination.page}</span> of{" "}
                <span className="text-foreground">{totalPages}</span> ·{" "}
                {data.pagination.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isFetching}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <EditCompanyDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        company={editingCompany}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete company"
        description={`Delete "${deletingCompany?.name}"? This cannot be undone.`}
        onConfirm={onDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </PageLayout>
  );
}
