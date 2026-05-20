"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, MoreHorizontal, Pencil, Trash2, BookOpen } from "lucide-react";
import { useState, useCallback } from "react";
import { useBooksAdmin, useDeleteBook } from "@/features/books/hooks/use-books";
import { BookFormDialog } from "@/features/books/components/book-form-dialog";
import type { Book } from "@/features/books/types";

export default function AdminBooksPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Book | null>(null);
  const { data: booksData, isLoading } = useBooksAdmin({ limit: 50 });
  const deleteItem = useDeleteBook();

  const items = booksData?.data ?? [];

  const handleEdit = useCallback((item: Book) => {
    setEditing(item);
    setFormOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((item: Book) => {
    setDeletingItem(item);
    setConfirmOpen(true);
  }, []);

  const onConfirmDelete = useCallback(() => {
    if (deletingItem) deleteItem.mutate(deletingItem.bookId);
  }, [deletingItem, deleteItem]);

  return (
    <PageLayout
      subtitle="Catalogue"
      header="Books"
      description="The book catalogue — available for purchase by learners."
      actions={
        <Button size="sm" onClick={handleCreate} className="gap-1.5">
          <Plus className="size-3.5" />
          Add book
        </Button>
      }
    >
      {isLoading ? (
        <DataTableSkeleton columnCount={7} rowCount={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No books yet"
          description="Add your first book to the catalogue."
          icon={<BookOpen className="h-12 w-12" />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-border/70">
                  <TableHead className="font-display text-xs">Title</TableHead>
                  <TableHead className="hidden font-display text-xs md:table-cell">Author</TableHead>
                  <TableHead className="hidden font-display text-xs lg:table-cell">Price</TableHead>
                  <TableHead className="hidden font-display text-xs lg:table-cell">Format</TableHead>
                  <TableHead className="font-display text-xs">Status</TableHead>
                  <TableHead className="hidden font-display text-xs sm:table-cell">Active</TableHead>
                  <TableHead className="text-right font-display text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.bookId} className="border-b-border/60 transition-colors hover:bg-muted/40">
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {item.author}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {parseFloat(item.price) === 0 ? (
                        <span className="text-green-600 font-medium">Free</span>
                      ) : (
                        <span>₹{parseFloat(item.price).toFixed(0)}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {item.format || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          item.status === "PUBLISHED"
                            ? "bg-green-500"
                            : item.status === "ARCHIVED"
                              ? "bg-gray-500"
                              : "bg-yellow-500"
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {item.isActive ? (
                        <Badge className="rounded-full bg-emerald-600 text-[10px] uppercase tracking-widest">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-full text-[10px] uppercase tracking-widest">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
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
          </div>
        </div>
      )}

      <BookFormDialog open={formOpen} onOpenChange={setFormOpen} book={editing} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Book"
        description={`Delete "${deletingItem?.title}"? This cannot be undone.`}
        onConfirm={onConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </PageLayout>
  );
}
