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
import { Plus, MoreHorizontal, Pencil, Trash2, MessageSquare, Star } from "lucide-react";
import { useState, useCallback } from "react";
import { useTestimonialsAdmin, useDeleteTestimonial } from "@/features/cms/hooks/use-cms";
import { TestimonialFormDialog } from "@/features/cms/components/testimonial-form-dialog";
import { BackButton } from "@/components/ui/back-button";
import type { Testimonial } from "@/features/cms/types";

export default function AdminTestimonialsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Testimonial | null>(null);
  const { data: items = [], isLoading } = useTestimonialsAdmin();
  const deleteItem = useDeleteTestimonial();

  const handleEdit = useCallback((item: Testimonial) => {
    setEditing(item);
    setFormOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((item: Testimonial) => {
    setDeletingItem(item);
    setConfirmOpen(true);
  }, []);

  const onConfirmDelete = useCallback(() => {
    if (deletingItem) deleteItem.mutate(deletingItem.testimonialId);
  }, [deletingItem, deleteItem]);

  return (
    <PageLayout
      header="Testimonials"
      description="Manage student testimonials shown on the landing page."
      actions={
        <div className="flex items-center gap-2">
          <BackButton href="/admin/landing" />
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Testimonial
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <DataTableSkeleton columnCount={6} rowCount={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No testimonials found"
          description="Add your first testimonial."
          icon={<MessageSquare className="h-12 w-12" />}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead className="hidden lg:table-cell max-w-[250px]">Text</TableHead>
                  <TableHead className="w-[80px]">Rating</TableHead>
                  <TableHead className="w-[80px]">Order</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.testimonialId}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {[item.role, item.company].filter(Boolean).join(", ") || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[250px] truncate text-muted-foreground">
                      {item.text}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{item.rating}</span>
                      </div>
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

      <TestimonialFormDialog open={formOpen} onOpenChange={setFormOpen} testimonial={editing} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Testimonial"
        description={`Delete "${deletingItem?.name}"'s testimonial? This cannot be undone.`}
        onConfirm={onConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </PageLayout>
  );
}
