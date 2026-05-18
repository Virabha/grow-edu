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
      header="Books"
      description="Manage books available for purchase."
      actions={
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" /> Add Book
        </Button>
      }
    >
      {isLoading ? (
        <DataTableSkeleton columnCount={7} rowCount={5} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No books found"
          description="Add your first book."
          icon={<BookOpen className="h-12 w-12" />}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Author</TableHead>
                  <TableHead className="hidden lg:table-cell">Price</TableHead>
                  <TableHead className="hidden lg:table-cell">Format</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[80px]">Active</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.bookId}>
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
