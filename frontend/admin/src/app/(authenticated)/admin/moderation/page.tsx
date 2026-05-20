"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useCourses, useApproveCourse, useRejectCourse, } from "@/features/courses/hooks/use-courses";
import type { Course } from "@/lib/api/services/courses";
import type { AxiosError } from "axios";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PageFilters } from "@/components/layout/page-filters";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
export default function ContentModerationPage() {
    const [search, setSearch] = useState("");
    const [courseToApprove, setCourseToApprove] = useState<string | null>(null);
    const [courseToReject, setCourseToReject] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const { data: coursesData, isLoading } = useCourses({
        enabled: true,
        filters: {
            status: "DRAFT",
            limit: 100,
        },
    });
    const approveCourse = useApproveCourse();
    const rejectCourse = useRejectCourse();
    const handleSearchChange = (value: string) => setSearch(value);
    const handleApprove = async (courseId: string) => {
        try {
            await approveCourse.mutateAsync({ id: courseId, publish: true });
            setCourseToApprove(null);
            toast.success("Course approved successfully!");
        }
        catch (error: unknown) {
            const err = error as AxiosError<{ message?: string }>;
            const message = err?.response?.data?.message || err?.message || "Failed to approve course";
            toast.error(message);
        }
    };
    const handleReject = async (courseId: string) => {
        if (!rejectionReason.trim())
            return;
        try {
            await rejectCourse.mutateAsync({ id: courseId, reason: rejectionReason });
            setCourseToReject(null);
            setRejectionReason("");
            toast.success("Course rejected successfully");
        }
        catch (error: unknown) {
            const err = error as AxiosError<{ message?: string }>;
            const message = err?.response?.data?.message || err?.message || "Failed to reject course";
            toast.error(message);
        }
    };
    const coursesArray = coursesData?.data || [];
    const filteredCourses = coursesArray.filter((course: Course) => {
        const isPending = course.reviewStatus === "PENDING_REVIEW";
        if (!isPending)
            return false;
        if (search) {
            return course.title.toLowerCase().includes(search.toLowerCase());
        }
        return true;
    });
    return (<PageLayout subtitle="Console" header="Moderation" description="Approve or reject courses awaiting review." filters={
        <PageFilters search={search} onSearchChange={handleSearchChange} searchPlaceholder="Search pending courses…" />
      }>
        {isLoading ? (<div className="space-y-2">
            <DataTableSkeleton columnCount={5} rowCount={6} />
          </div>) : filteredCourses.length === 0 ? (<EmptyState title="No pending reviews" description="There are no courses currently waiting for review." icon={<div className="relative h-40 w-40">
                <Image src="/illustrations/no_data.svg" alt="No pending reviews" fill className="object-contain"/>
              </div>}/>) : (<div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-border/70">
                      <TableHead className="font-display text-xs">Course</TableHead>
                      <TableHead className="hidden font-display text-xs md:table-cell">Instructor</TableHead>
                      <TableHead className="hidden font-display text-xs sm:table-cell">Submitted</TableHead>
                      <TableHead className="text-right font-display text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCourses.map((course: Course) => (<TableRow key={course.courseId} className="border-b-border/60 transition-colors hover:bg-muted/40">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="line-clamp-1">{course.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {course.category?.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {course.instructor
                    ? `${course.instructor.firstName || ""} ${course.instructor.lastName || ""}`.trim() || course.instructor.email
                    : "N/A"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {course.submittedAt
                    ? new Date(course.submittedAt).toLocaleDateString()
                    : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 sm:gap-2 flex-wrap">
                            <Link href={`/learner/courses/${course.courseId}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 sm:mr-1"/>
                                <span className="hidden sm:inline">Review</span>
                              </Button>
                            </Link>
                            <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => {
                    setCourseToApprove(course.courseId);
                }} disabled={approveCourse.isPending}>
                              <CheckCircle className="h-4 w-4 sm:mr-1"/>
                              <span className="hidden sm:inline">Approve</span>
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => {
                    setCourseToReject(course.courseId);
                    setRejectionReason("");
                }} disabled={rejectCourse.isPending}>
                              <XCircle className="h-4 w-4 sm:mr-1"/>
                              <span className="hidden sm:inline">Reject</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>))}
                  </TableBody>
                </Table>
              </div>
            </div>)}

      <AlertDialog open={!!courseToApprove} onOpenChange={(open) => !open && setCourseToApprove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Course?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve and publish this course? It will become visible to all students immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
            if (courseToApprove)
                handleApprove(courseToApprove);
        }}>
              Approve & Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!courseToReject} onOpenChange={(open) => !open && setCourseToReject(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reject Course</DialogTitle>
                <DialogDescription>
                    Please provide a reason for rejecting this course. The instructor will see this feedback.
                </DialogDescription>
            </DialogHeader>
            <div className="py-2">
                <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="e.g., The audio quality in Module 2 is too low..." className="min-h-[100px]"/>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setCourseToReject(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => {
            if (courseToReject)
                handleReject(courseToReject);
        }} disabled={rejectCourse.isPending || !rejectionReason.trim()}>
                    {rejectCourse.isPending ? "Rejecting..." : "Reject Course"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>);
}
