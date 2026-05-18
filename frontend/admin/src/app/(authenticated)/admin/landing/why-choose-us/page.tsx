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
import { Plus, MoreHorizontal, Pencil, Trash2, Award } from "lucide-react";
import { useState, useCallback } from "react";
import { useWhyChooseUsAdmin, useDeleteWhyChooseUs } from "@/features/cms/hooks/use-cms";
import { WhyChooseFormDialog } from "@/features/cms/components/why-choose-form-dialog";
import { BackButton } from "@/components/ui/back-button";
import type { WhyChooseUs } from "@/features/cms/types";

export default function AdminWhyChooseUsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WhyChooseUs | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<WhyChooseUs | null>(null);
  const { data: items = [], isLoading } = useWhyChooseUsAdmin();
  const deleteItem = useDeleteWhyChooseUs();

  const handleEdit = useCallback((item: WhyChooseUs) => {
    setEditing(item);
    setFormOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((item: WhyChooseUs) => {
    setDeletingItem(item);
    setConfirmOpen(true);
  }, []);

  const onConfirmDelete = useCallback(() => {
    if (deletingItem) deleteItem.mutate(deletingItem.id);
  }, [deletingItem, deleteItem]);

  return (
    <PageLayout
      header="Why Choose Us"
      description="Manage trust points shown on the landing page."
      actions={
        <div className="flex items-center gap-2">
          <BackButton href="/admin/landing" />
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <DataTableSkeleton columnCount={5} rowCount={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No items found"
          description="Add your first trust point."
          icon={<Award className="h-12 w-12" />}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Icon</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell max-w-[250px]">Description</TableHead>
                  <TableHead className="w-[80px]">Order</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.iconName}</TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-[250px] truncate text-muted-foreground">
                      {item.description || "-"}
                    </TableCell>
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

      <WhyChooseFormDialog open={formOpen} onOpenChange={setFormOpen} item={editing} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Item"
        description={`Delete "${deletingItem?.title}"? This cannot be undone.`}
        onConfirm={onConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </PageLayout>
  );
}
