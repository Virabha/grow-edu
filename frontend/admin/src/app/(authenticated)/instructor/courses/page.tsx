"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { Plus, BookOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCourses, useDeleteCourse } from "@/features/courses/hooks/use-courses";
import { useAuthStore } from "@/lib/store/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { motion } from "framer-motion";
import Link from "next/link";
import { SecureImage } from "@/components/ui/secure-image";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { useState } from "react";
export default function InstructorCourseManagementPage() {
    const { user } = useAuthStore();
    const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
    const deleteCourse = useDeleteCourse();
    const { data: coursesData, isLoading } = useCourses({
        enabled: !!user?.id,
        filters: {
            instructorId: user?.id,
            limit: 100,
        },
    });
    const handleDeleteCourse = async (courseId: string) => {
        try {
            setDeletingCourseId(courseId);
            await deleteCourse.mutateAsync(courseId);
        }
        finally {
            setDeletingCourseId(null);
        }
    };
    return (<PageLayout header="My Courses" subtitle="Course Management" description="Manage and edit your courses." actions={<Link href="/instructor/courses/new">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2"/>
            <span className="hidden sm:inline">New Course</span>
            <span className="sm:hidden">New</span>
          </Button>
        </Link>}>
      {isLoading ? (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (<motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.4 }}>
              <Card className="overflow-hidden">
                <Skeleton className="aspect-video w-full"/>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4 mb-2"/>
                  <Skeleton className="h-4 w-full mb-1"/>
                  <Skeleton className="h-4 w-5/6"/>
                  <Skeleton className="h-5 w-20 mt-3 rounded-full"/>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1 rounded-md"/>
                    <Skeleton className="h-9 flex-1 rounded-md"/>
                  </div>
                </CardContent>
              </Card>
            </motion.div>))}
        </motion.div>) : !coursesData?.data || coursesData.data.length === 0 ? (<EmptyState title="No courses yet" description="Create your first course to start teaching." icon={<BookOpen className="h-12 w-12"/>} action={{
                label: "Create Course",
                onClick: () => (window.location.href = "/instructor/courses/new"),
            }}/>) : (<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {coursesData.data.map((course) => {
                const isRejected = course.reviewStatus === 'REJECTED';
                const isChangesRequested = course.reviewStatus === 'CHANGES_REQUESTED';
                const isPending = course.reviewStatus === 'PENDING_REVIEW';
                const isApproved = course.reviewStatus === 'APPROVED';
                let statusLabel: string = course.status;
                let statusColor = "bg-gray-100 text-gray-800";
                if (isApproved) {
                    statusLabel = "PUBLISHED";
                    statusColor = "bg-green-100 text-green-800 border-green-200";
                }
                else if (isPending) {
                    statusLabel = "UNDER REVIEW";
                    statusColor = "bg-blue-100 text-blue-800 border-blue-200";
                }
                else if (isChangesRequested) {
                    statusLabel = "CHANGES REQUESTED";
                    statusColor = "bg-orange-100 text-orange-800 border-orange-200";
                }
                else if (isRejected) {
                    statusLabel = "REJECTED";
                    statusColor = "bg-red-100 text-red-800 border-red-200";
                }
                else {
                    statusLabel = "DRAFT";
                    statusColor = "bg-gray-100 text-gray-800 border-gray-200";
                }
                return (<Card key={course.courseId} className="hover:shadow-lg transition-shadow flex flex-col">
                {course.thumbnail ? (<div className="aspect-video w-full overflow-hidden rounded-t-lg relative">
                    <SecureImage src={course.thumbnail} alt={course.title} className="h-full w-full object-cover"/>
                    <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${statusColor}`}>
                              {statusLabel}
                        </span>
                    </div>
                  </div>) : (<div className="aspect-video w-full bg-muted flex items-center justify-center rounded-t-lg relative">
                      <BookOpen className="text-muted-foreground h-10 w-10"/>
                       <div className="absolute top-2 right-2">
                         <span className={`px-2 py-1 text-xs font-medium rounded border ${statusColor}`}>
                              {statusLabel}
                         </span>
                    </div>
                  </div>)}
                
                <CardHeader>
                  <CardTitle className="line-clamp-2 leading-tight">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">
                    {course.description || "No description provided."}
                  </CardDescription>

                  {(isRejected || isChangesRequested) && (course.rejectionReason || course.reviewNotes) && (<div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400 rounded border border-red-100 dark:border-red-900/50">
                          <strong>Admin Feedback:</strong> {course.rejectionReason || course.reviewNotes}
                      </div>)}
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <div className="flex gap-2">
                    <Link href={`/instructor/courses/${course.courseId}/edit`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm">
                        Edit
                      </Button>
                    </Link>
                    {isApproved && (<Link href={`/instructor/courses/${course.courseId}/analytics`} className="flex-1">
                          <Button variant="outline" className="w-full" size="sm">
                          Analytics
                          </Button>
                      </Link>)}
                    {!isApproved && !isPending && (<AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" disabled={deletingCourseId === course.courseId}>
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Course?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{course.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCourse(course.courseId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>)}
                  </div>
                </CardContent>
              </Card>);
            })}
        </div>)}
    </PageLayout>);
}
