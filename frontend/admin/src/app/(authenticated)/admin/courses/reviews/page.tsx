"use client";
import { useCourses } from "@/lib/hooks/use-courses";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
export default function AdminCourseReviewsPage() {
    const router = useRouter();
    const { data, isLoading } = useCourses({
        filters: { limit: 100 }
    });
    const pendingCourses = data?.data.filter(c => c.reviewStatus === 'PENDING_REVIEW') || [];
    return (<PageLayout header="Course Reviews" description="Review and approve instructor submitted courses.">
      <div className="space-y-2.5">
        {isLoading ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-48 rounded-lg" />))}
            </div>) : pendingCourses.length === 0 ? (<div className="text-center py-14 border rounded-lg bg-muted/10">
                <h3 className="text-lg font-medium">No Pending Reviews</h3>
                <p className="text-muted-foreground">All caught up! No courses are waiting for approval.</p>
            </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingCourses.map(course => (<Card key={course.courseId} className="flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-start mb-1">
                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                                    Pending Review
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    {course.submittedAt ? formatDistanceToNow(new Date(course.submittedAt), { addSuffix: true }) : 'Recently'}
                                </span>
                            </div>
                            <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                            <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-2.5">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-4 w-4"/>
                                <span>{course.instructor?.firstName} {course.instructor?.lastName}</span>
                            </div>
                             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <FileText className="h-4 w-4"/>
                                <span>{course.sections?.length || 0} Sections</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => router.push(`/admin/courses/reviews/${course.courseId}`)}>
                                Review Course
                            </Button>
                        </CardFooter>
                    </Card>))}
            </div>)}
      </div>
    </PageLayout>);
}
