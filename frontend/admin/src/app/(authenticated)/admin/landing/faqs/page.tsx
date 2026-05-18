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
import { Plus, MoreHorizontal, Pencil, Trash2, HelpCircle } from "lucide-react";
import { useState, useCallback } from "react";
import { useFaqsAdmin, useDeleteFaq } from "@/features/cms/hooks/use-cms";
import { FaqFormDialog } from "@/features/cms/components/faq-form-dialog";
import { BackButton } from "@/components/ui/back-button";
import type { Faq } from "@/features/cms/types";

export default function AdminFaqsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Faq | null>(null);
  const { data: faqs = [], isLoading } = useFaqsAdmin();
  const deleteFaq = useDeleteFaq();

  const handleEdit = useCallback((faq: Faq) => {
    setEditing(faq);
    setFormOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((faq: Faq) => {
    setDeletingItem(faq);
    setConfirmOpen(true);
  }, []);

  const onConfirmDelete = useCallback(() => {
    if (deletingItem) deleteFaq.mutate(deletingItem.faqId);
  }, [deletingItem, deleteFaq]);

  return (
    <PageLayout
      header="FAQs"
      description="Manage frequently asked questions on the learner site."
      actions={
        <div className="flex items-center gap-2">
          <BackButton href="/admin/landing" />
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add FAQ
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <DataTableSkeleton columnCount={5} rowCount={5} />
      ) : faqs.length === 0 ? (
        <EmptyState
          title="No FAQs found"
          description="Add your first FAQ to help learners."
          icon={<HelpCircle className="h-12 w-12" />}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="max-w-[300px]">Question</TableHead>
                  <TableHead className="max-w-[300px] hidden md:table-cell">Answer</TableHead>
                  <TableHead className="w-[80px]">Order</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faqs.map((faq) => (
                  <TableRow key={faq.faqId}>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {faq.question}
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[300px] truncate text-muted-foreground">
                      {faq.answer}
                    </TableCell>
                    <TableCell>{faq.displayOrder}</TableCell>
                    <TableCell>
                      {faq.isActive ? (
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
                          <DropdownMenuItem onClick={() => handleEdit(faq)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(faq)}
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

      <FaqFormDialog open={formOpen} onOpenChange={setFormOpen} faq={editing} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete FAQ"
        description={`Delete "${deletingItem?.question}"? This cannot be undone.`}
        onConfirm={onConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </PageLayout>
  );
}
