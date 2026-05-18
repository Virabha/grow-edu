"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, MoreHorizontal, Pencil, Trash2, Power, PowerOff, Image as ImageIcon } from "lucide-react";
import { useState, useCallback } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BackButton } from "@/components/ui/back-button";
import { useBannersAdmin, useDeleteBanner, useToggleBannerStatus } from "@/features/cms/hooks/use-cms";
import { BannerFormDialog } from "@/features/cms/components/banner-form-dialog";
import type { Banner } from "@/features/cms/types";

export default function AdminBannersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const { data: banners = [], isLoading } = useBannersAdmin();
  const deleteBanner = useDeleteBanner();
  const toggleStatus = useToggleBannerStatus();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null);
  const handleDeleteClick = useCallback((b: Banner) => {
    setDeletingBanner(b);
    setConfirmOpen(true);
  }, []);
  const onConfirmDelete = useCallback(() => {
    if (deletingBanner) deleteBanner.mutate(deletingBanner.bannerId);
  }, [deletingBanner, deleteBanner]);
  return (
    <PageLayout header="Banners" description="Manage hero banners and promos on the learner site." actions={<BackButton href="/admin/landing" label="Back to Landing" />}>
      <div className="space-y-2.5">
        <div className="flex justify-end">
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Add Banner</Button>
        </div>
        {isLoading ? <DataTableSkeleton columnCount={5} rowCount={5} /> : banners.length === 0 ? (
          <EmptyState title="No banners" description="Add a banner to show on the learner homepage." icon={<ImageIcon className="h-12 w-12" />} />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banners.map((b) => (
                    <TableRow key={b.bannerId}>
                      <TableCell className="font-medium">{b.title}</TableCell>
                      <TableCell>{b.imageUrl ? <a href={b.imageUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm">View</a> : "-"}</TableCell>
                      <TableCell>{b.displayOrder}</TableCell>
                      <TableCell>
                        {b.isActive ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditing(b); setFormOpen(true); }}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus.mutate({ bannerId: b.bannerId, activate: !b.isActive })}>
                              {b.isActive ? (
                                <><PowerOff className="h-4 w-4 mr-2" /> Deactivate</>
                              ) : (
                                <><Power className="h-4 w-4 mr-2" /> Activate</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(b)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
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
      </div>
      <BannerFormDialog open={formOpen} onOpenChange={setFormOpen} banner={editing} />
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Delete Banner" description="Delete this banner? This action cannot be undone." onConfirm={onConfirmDelete} confirmText="Delete" variant="destructive"/>
    </PageLayout>
  );
}
