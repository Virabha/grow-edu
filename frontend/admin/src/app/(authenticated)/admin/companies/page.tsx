"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Building2 as BuildingIcon, Building2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useCompanies } from "@/features/companies/hooks/use-companies";
import type { Company } from "@/features/companies/types";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PageFilters } from "@/components/layout/page-filters";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { useDeleteCompany } from "@/features/companies/hooks/use-companies";
import { EditCompanyDialog } from "@/features/companies/components/edit-company-dialog";
import { useDebounce } from "@/hooks/use-debounce";
export default function CompanyManagementPage() {
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const [page, setPage] = useState(1);
    const limit = 20;
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const { data: companiesData, isLoading, isFetching } = useCompanies({
        enabled: true,
        filters: {
            search: debouncedSearch || undefined,
            page,
            limit,
        },
    });
    const deleteCompany = useDeleteCompany();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
    const handleEditClick = (company: Company) => {
        setEditingCompany(company);
        setIsEditOpen(true);
    };
    const handleDeleteClick = useCallback((company: Company) => {
        setDeletingCompany(company);
        setConfirmOpen(true);
    }, []);
    const onConfirmDelete = useCallback(async () => {
        if (deletingCompany) {
            try { await deleteCompany.mutateAsync(deletingCompany.id); } catch {}
        }
    }, [deletingCompany, deleteCompany]);
    return (<PageLayout header="Company Management" description="Manage corporate accounts and their enrollments." actions={<Button onClick={() => {
                toast.info("Add company feature coming soon. You'll be able to create new corporate accounts.");
            }}>
          <BuildingIcon className="h-4 w-4 mr-2"/>
          Add Company
        </Button>} filters={
        <PageFilters search={search} onSearchChange={setSearch} searchPlaceholder="Search companies..." />
      }>
        {isLoading ? (<DataTableSkeleton columnCount={5} rowCount={8} />) : !companiesData?.data?.length ? (<EmptyState title="No companies found" description="Corporate accounts will appear here once created." icon={<Building2 className="h-12 w-12"/>}/>) : (<><Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Name</TableHead>
                      <TableHead className="min-w-[150px] hidden sm:table-cell">Email</TableHead>
                      <TableHead className="min-w-[100px] hidden md:table-cell">Phone</TableHead>
                      <TableHead className="min-w-[100px] hidden lg:table-cell">Created</TableHead>
                      <TableHead className="text-right min-w-[140px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companiesData.data.map((company: Company) => (<TableRow key={company.id}>
                          <TableCell className="font-medium">
                            {company.name}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell truncate max-w-[200px]">{company.email || "N/A"}</TableCell>
                          <TableCell className="hidden md:table-cell">{company.phone || "N/A"}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {new Date(company.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditClick(company)}>
                                Edit
                              </Button>
                              <Button variant="destructive" size="sm" disabled={deleteCompany.isPending} onClick={() => handleDeleteClick(company)}>
                                <span className="hidden sm:inline">{deleteCompany.isPending ? "Deleting..." : "Delete"}</span>
                                <span className="sm:hidden">Del</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          {companiesData.pagination.totalPages > 1 && (<div className="flex items-center justify-between px-4 py-3 border rounded-lg">
              <span className="text-sm text-muted-foreground">
                Page {companiesData.pagination.page} of {companiesData.pagination.totalPages} ({companiesData.pagination.total} total)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isFetching}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(companiesData.pagination.totalPages, p + 1))} disabled={page === companiesData.pagination.totalPages || isFetching}>
                  Next
                </Button>
              </div>
            </div>)}
          </>)}

        <EditCompanyDialog open={isEditOpen} onOpenChange={setIsEditOpen} company={editingCompany}/>
        <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Delete Company" description={`Are you sure you want to delete ${deletingCompany?.name}?`} onConfirm={onConfirmDelete} confirmText="Delete" variant="destructive"/>
    </PageLayout>);
}
