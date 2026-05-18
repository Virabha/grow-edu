"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, MoreHorizontal, Pencil, Trash2, Briefcase } from "lucide-react";
import { useState, useCallback } from "react";
import { useServicesAdmin, useDeleteService } from "@/features/cms/hooks/use-cms";
import { ServiceFormDialog } from "@/features/cms/components/service-form-dialog";
import { BackButton } from "@/components/ui/back-button";
import type { Service } from "@/features/cms/types";

export default function AdminServicesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Service | null>(null);
  const { data: items = [], isLoading } = useServicesAdmin();
  const deleteItem = useDeleteService();

  const handleEdit = useCallback((item: Service) => {
    setEditing(item);
    setFormOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((item: Service) => {
    setDeletingItem(item);
    setConfirmOpen(true);
  }, []);

  const onConfirmDelete = useCallback(() => {
    if (deletingItem) deleteItem.mutate(deletingItem.serviceId);
  }, [deletingItem, deleteItem]);

  return (
    <PageLayout
      header="Services"
      description="Manage services shown on the learner site."
      actions={
        <div className="flex items-center gap-2">
          <BackButton href="/admin/landing" />
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Service
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <DataTableSkeleton columnCount={6} rowCount={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No services found"
          description="Add your first service."
          icon={<Briefcase className="h-12 w-12" />}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Slug</TableHead>
                  <TableHead className="hidden lg:table-cell max-w-[250px]">Description</TableHead>
                  <TableHead className="w-[80px]">Icon</TableHead>
                  <TableHead className="w-[80px]">Order</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.serviceId}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                      {item.slug}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[250px] truncate text-muted-foreground">
                      {item.description || "-"}
                    </TableCell>
                    <TableCell className="text-sm">{item.iconName || "-"}</TableCell>
                    <TableCell>{item.displayOrder}</TableCell>
                    <TableCell>
                      {item.isActive ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(item)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ServiceFormDialog open={formOpen} onOpenChange={setFormOpen} service={editing} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Service"
        description={`Delete "${deletingItem?.title}"? This cannot be undone.`}
        onConfirm={onConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </PageLayout>
  );
}
