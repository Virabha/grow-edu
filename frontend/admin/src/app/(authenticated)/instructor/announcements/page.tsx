"use client";

import { useState, useCallback } from "react";
import { Megaphone, Pencil, Trash2 } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  useMyAnnouncements,
  useDeleteAnnouncement,
} from "@/features/announcements/hooks/use-announcements";
import { AnnouncementFormSheet } from "@/features/announcements/components/announcement-form-sheet";
import type { CourseAnnouncementWithCourse } from "@/features/announcements/types";

export default function InstructorAnnouncementsPage() {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CourseAnnouncementWithCourse | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<CourseAnnouncementWithCourse | null>(
    null,
  );

  const { data, isLoading, isError, refetch } = useMyAnnouncements({
    page,
    limit: 20,
  });
  const deleteAnnouncement = useDeleteAnnouncement();

  const announcements = data?.data ?? [];
  const pagination = data?.pagination;

  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (announcement: CourseAnnouncementWithCourse) => {
    setEditing(announcement);
    setFormOpen(true);
  };

  const handleDeleteRequest = useCallback(
    (announcement: CourseAnnouncementWithCourse) => {
      setDeleting(announcement);
      setConfirmOpen(true);
    },
    [],
  );

  const onConfirmDelete = useCallback(() => {
    if (deleting) {
      deleteAnnouncement.mutate(deleting.announcementId);
    }
  }, [deleting, deleteAnnouncement]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <PageLayout
      subtitle="Studio"
      header="Announcements"
      description="Post updates to your enrolled students."
      actions={
        <Button size="sm" onClick={handleCreate} className="gap-1.5">
          <Megaphone className="size-3.5" />
          Create Announcement
        </Button>
      }
    >
      {isLoading ? (
        <DataTableSkeleton columnCount={5} rowCount={8} />
      ) : isError ? (
        <EmptyState
          title="Failed to load announcements"
          description="Something went wrong. Try again."
          icon={<Megaphone className="h-12 w-12" />}
          action={{ label: "Retry", onClick: () => void refetch() }}
        />
      ) : announcements.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          description="Post your first announcement to notify enrolled students."
          icon={<Megaphone className="h-12 w-12" />}
          action={{ label: "Create Announcement", onClick: handleCreate }}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-border/70">
                  <TableHead className="w-12 font-display text-xs">
                    No
                  </TableHead>
                  <TableHead className="font-display text-xs">Course</TableHead>
                  <TableHead className="font-display text-xs">Title</TableHead>
                  <TableHead className="font-display text-xs">Date</TableHead>
                  <TableHead className="text-right font-display text-xs">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((ann, idx) => (
                  <TableRow
                    key={ann.announcementId}
                    className="border-b-border/60 transition-colors hover:bg-muted/40"
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {((pagination?.page ?? 1) - 1) *
                        (pagination?.limit ?? 20) +
                        idx +
                        1}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm font-medium">
                      {ann.courseTitle}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-sm">
                      {ann.title}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(ann.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(ann)}
                          aria-label="Edit announcement"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRequest(ann)}
                          aria-label="Delete announcement"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page{" "}
                <span className="text-foreground">{pagination.page}</span> of{" "}
                <span className="text-foreground">{pagination.totalPages}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <AnnouncementFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        announcement={editing}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete announcement?"
        description={`"${deleting?.title ?? ""}" will be permanently removed and students will no longer see it.`}
        onConfirm={onConfirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </PageLayout>
  );
}
