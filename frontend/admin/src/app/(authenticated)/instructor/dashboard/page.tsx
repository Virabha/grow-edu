"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { useInstructorStats } from "@/lib/hooks/use-instructor";
import type { InstructorStats } from "@/lib/api/services/instructor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookOpen, IndianRupee, TrendingUp, PlusCircle, FileEdit, AlertCircle, Trash2, Video, } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useDeleteCourse } from "@/features/courses/hooks/use-courses";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { useState } from "react";
export default function InstructorDashboardPage() {
    const { data: stats, isLoading } = useInstructorStats();
    const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
    const deleteCourse = useDeleteCourse();
    const handleDeleteCourse = async (courseId: string) => {
        try {
            setDeletingCourseId(courseId);
            await deleteCourse.mutateAsync(courseId);
        }
        finally {
            setDeletingCourseId(null);
        }
    };
    if (isLoading) {
        return (<PageLayout header="Instructor Dashboard">
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-32"/>
          <Skeleton className="h-32"/>
          <Skeleton className="h-32"/>
        </div>
      </PageLayout>);
    }
    const statCards = [
        {
            title: "Total Students",
            value: stats?.totalStudents || 0,
            icon: Users,
            description: "Across all courses",
        },
        {
            title: "Total Courses",
            value: stats?.totalCourses || 0,
            icon: BookOpen,
            description: "Created courses",
        },
        {
            title: "Total Revenue",
            value: `₹${(stats?.totalRevenue || 0).toFixed(2)}`,
            icon: IndianRupee,
            description: "Lifetime earnings",
        },
    ];
    return (<PageLayout header="Dashboard">
      
      <div className="grid gap-3 sm:gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mb-3 sm:mb-4">
        {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (<Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground"/>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>);
        })}
      </div>

      
      <div className="grid gap-3 sm:gap-3 grid-cols-1 lg:grid-cols-3">
        
        <Card className="lg:col-span-2 order-2 lg:order-1">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">Recent Courses</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/instructor/courses">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {stats?.recentCourses && stats.recentCourses.length > 0 ? (stats.recentCourses.map((course) => (<div key={course.courseId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b last:border-0 pb-3 last:pb-0">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-medium leading-none text-sm sm:text-base truncate">{course.title}</p>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                        <Badge variant={course.status === "PUBLISHED"
                ? "default"
                : course.status === "DRAFT"
                    ? "secondary"
                    : "outline"} className="text-[10px] px-1 py-0 h-5">
                          {course.status}
                        </Badge>
                        <span>{course.enrollmentCount || 0} students</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/instructor/courses/${course.courseId}/edit`}>
                          <FileEdit className="h-3 w-3 sm:mr-2"/>
                          <span className="hidden sm:inline">Edit</span>
                        </Link>
                      </Button>
                      {course.status === "DRAFT" && (<AlertDialog>
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
                  </div>))) : (<div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground mb-2"/>
                  <p className="text-muted-foreground text-sm">
                    No courses created yet.
                  </p>
                  <Button variant="link" asChild className="mt-2">
                    <Link href="/instructor/courses/new">
                      Create your first course
                    </Link>
                  </Button>
                </div>)}
            </div>
          </CardContent>
        </Card>

        
        <Card className="order-1 lg:order-2">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button className="w-full justify-start text-sm" asChild>
              <Link href="/instructor/courses/new">
                <PlusCircle className="mr-2 h-4 w-4"/>
                Create New Course
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start text-sm" asChild>
              <Link href="/instructor/courses">
                <BookOpen className="mr-2 h-4 w-4"/>
                Manage Courses
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start text-sm" asChild>
              <Link href="/instructor/videos">
                <Video className="mr-2 h-4 w-4"/>
                View All Videos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>);
}
