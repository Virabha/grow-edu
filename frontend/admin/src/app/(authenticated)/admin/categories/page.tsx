"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { PageFilters } from "@/components/layout/page-filters";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { Plus, MoreHorizontal, Pencil, Trash2, Power, PowerOff, Layers } from "lucide-react";
import { useState, useCallback } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAdminCategories, useDeleteCategory, useToggleCategoryStatus } from "@/features/categories/admin/hooks";
import type { AdminCategory } from "@/features/categories/admin/types";
import { CategoryFormDialog } from "@/features/categories/admin/category-form-dialog";
import { SecureImage } from "@/components/ui/secure-image";

export default function AdminCategoriesPage() {
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [parentFilter, setParentFilter] = useState<string>("all");
    const [page, setPage] = useState(1);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<AdminCategory | null>(null);

    // Fetch all categories (no parent filter) to build a parent name lookup
    const { data: allData } = useAdminCategories({ limit: 200 });
    const allCategories = allData?.data || [];
    const parentNameMap = new Map(
        allCategories.filter((c) => !c.parentCategoryId).map((c) => [c.categoryId, c.name])
    );
    const rootCategories = allCategories.filter((c) => !c.parentCategoryId);

    const { data, isLoading, isFetching } = useAdminCategories({
        search: debouncedSearch || undefined,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active",
        parentCategoryId: parentFilter === "all" ? undefined : parentFilter,
        page,
        limit: 50,
    });
    const toggleStatus = useToggleCategoryStatus();
    const deleteCategory = useDeleteCategory();
    const categories = data?.data || [];
    const pagination = data?.pagination;
    const handleEdit = (c: AdminCategory) => {
        setEditing(c);
        setFormOpen(true);
    };
    const handleCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<AdminCategory | null>(null);
    const handleDelete = useCallback((c: AdminCategory) => {
        setDeletingItem(c);
        setConfirmOpen(true);
    }, []);
    const onConfirmDelete = useCallback(() => {
        if (deletingItem) deleteCategory.mutate(deletingItem.categoryId);
    }, [deletingItem, deleteCategory]);
    return (<PageLayout subtitle="Catalogue" header="Categories" description="Categories that organise courses and coupon scopes." actions={
        <Button size="sm" onClick={handleCreate} className="gap-1.5">
          <Plus className="size-3.5"/>
          Add category
        </Button>
      } filters={
        <PageFilters search={search} onSearchChange={setSearch} searchPlaceholder="Search categories…">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-full text-xs sm:w-[160px]">
              <SelectValue placeholder="Status"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={parentFilter} onValueChange={setParentFilter}>
            <SelectTrigger className="h-8 w-full text-xs sm:w-[180px]">
              <SelectValue placeholder="Parent"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="root">Root only</SelectItem>
              {rootCategories.map((c) => (
                <SelectItem key={c.categoryId} value={c.categoryId}>
                  {c.name} (subs)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PageFilters>
      }>
        {isLoading ? (<DataTableSkeleton columnCount={7} rowCount={10}/>) : categories.length === 0 ? (<EmptyState title="No categories yet" description="Create your first category to organise courses." icon={<Layers className="h-12 w-12"/>}/>) : (<div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className={cn("overflow-x-auto", isFetching && "pointer-events-none opacity-50")}>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-border/70">
                      <TableHead className="font-display text-xs">Image</TableHead>
                      <TableHead className="font-display text-xs">Name</TableHead>
                      <TableHead className="hidden font-display text-xs md:table-cell">Parent</TableHead>
                      <TableHead className="hidden font-display text-xs lg:table-cell">Slug</TableHead>
                      <TableHead className="hidden font-display text-xs sm:table-cell">Courses</TableHead>
                      <TableHead className="hidden font-display text-xs lg:table-cell">Order</TableHead>
                      <TableHead className="font-display text-xs">Status</TableHead>
                      <TableHead className="text-right font-display text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((c) => (<TableRow key={c.categoryId} className="border-b-border/60 transition-colors hover:bg-muted/40">
                        <TableCell>
                          {c.imageUrl ? (
                            <SecureImage src={c.imageUrl} alt={c.name} className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">--</div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {c.parentCategoryId && <span className="text-muted-foreground mr-1">&#8627;</span>}
                          {c.name}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {c.parentCategoryId ? parentNameMap.get(c.parentCategoryId) || "—" : "—"}
                        </TableCell>
                        <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">{c.slug}</TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{c.coursesCount ?? 0}</TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{c.displayOrder ?? 0}</TableCell>
                        <TableCell>
                          {c.isActive ? (<Badge className="rounded-full bg-emerald-600 text-[10px] uppercase tracking-widest">Active</Badge>) : (<Badge variant="secondary" className="rounded-full text-[10px] uppercase tracking-widest">Inactive</Badge>)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4"/>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(c)}>
                                <Pencil className="h-4 w-4 mr-2"/>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleStatus.mutate({
                    categoryId: c.categoryId,
                    activate: !c.isActive,
                })}>
                                {c.isActive ? (<>
                                    <PowerOff className="h-4 w-4 mr-2"/>
                                    Deactivate
                                  </>) : (<>
                                    <Power className="h-4 w-4 mr-2"/>
                                    Activate
                                  </>)}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(c)}>
                                <Trash2 className="h-4 w-4 mr-2"/>
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>))}
                  </TableBody>
                </Table>
              </div>
            {pagination && pagination.totalPages > 1 && (<div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Page <span className="text-foreground">{pagination.page}</span> of <span className="text-foreground">{pagination.totalPages}</span>
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagination.page === 1}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page === pagination.totalPages}>
                    Next
                  </Button>
                </div>
              </div>)}
          </div>)}

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editing}/>
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Delete Category" description={`Delete category "${deletingItem?.name}"? This is a soft delete.`} onConfirm={onConfirmDelete} confirmText="Delete" variant="destructive"/>
    </PageLayout>);
}
