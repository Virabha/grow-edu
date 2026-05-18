"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCourse, useApproveCourse, useRejectCourse, useRequestCourseChanges } from "@/lib/hooks/use-courses";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertOctagon, RefreshCw, FileText, Video as VideoIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SecureVideoPlayer } from "@/components/ui/secure-video-player";
export default function AdminCourseReviewDetailPage() {
    const { courseId } = useParams<{
        courseId: string;
    }>();
    const router = useRouter();
    const { data: course, isLoading } = useCourse({ id: courseId });
    const approveMutation = useApproveCourse();
    const rejectMutation = useRejectCourse();
    const requestChangeMutation = useRequestCourseChanges();
    const [notes, setNotes] = useState("");
    const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
    if (isLoading) {
        return (<PageLayout header="Loading..." description="Reviewing submission">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2 space-y-2.5">
                    <Skeleton className="h-64 rounded-lg" />
                    <Skeleton className="h-48 rounded-lg" />
                </div>
                <Skeleton className="h-72 rounded-lg" />
            </div>
        </PageLayout>);
    }
    if (!course)
        return <div>Course not found</div>;
    const handleApprove = async () => {
        if (!course?.courseId) {
            toast.error("Course ID not found");
            return;
        }
        try {
            await approveMutation.mutateAsync({ id: course.courseId, publish: true });
            toast.success("Course approved and published");
            router.push("/admin/courses/reviews");
        }
        catch (error: unknown) {
            const err = error as AxiosError<{ message?: string }>;
            const message = err?.response?.data?.message || err?.message || "Failed to approve course";
            toast.error(message);
        }
    };
    const handleReject = async () => {
        if (!notes)
            return toast.error("Please provide a rejection reason");
        if (!course?.courseId) {
            toast.error("Course ID not found");
            return;
        }
        try {
            await rejectMutation.mutateAsync({ id: course.courseId, reason: notes });
            toast.success("Course rejected");
            router.push("/admin/courses/reviews");
        }
        catch (error: unknown) {
            const err = error as AxiosError<{ message?: string }>;
            const message = err?.response?.data?.message || err?.message || "Failed to reject course";
            toast.error(message);
        }
    };
    const handleRequestChanges = async () => {
        if (!notes)
            return toast.error("Please provide feedback notes");
        if (!course?.courseId) {
            toast.error("Course ID not found");
            return;
        }
        try {
            await requestChangeMutation.mutateAsync({ id: course.courseId, notes });
            toast.success("Changes requested");
            router.push("/admin/courses/reviews");
        }
        catch (error: unknown) {
            const err = error as AxiosError<{ message?: string }>;
            const message = err?.response?.data?.message || err?.message || "Failed to request changes";
            toast.error(message);
        }
    };
    return (<PageLayout header={course.title} description={`Reviewing submission by ${course.instructor?.firstName} ${course.instructor?.lastName}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        
        <div className="lg:col-span-2 space-y-2.5">
            <Card>
                <CardHeader>
                    <CardTitle>Course Content</CardTitle>
                    <CardDescription>Review all sections and lessons. Click video lessons to watch.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {course.sections?.map(section => (<AccordionItem key={section.sectionId} value={section.sectionId}>
                                <AccordionTrigger>{section.title}</AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2 pt-2">
                                        {section.lessons?.map(lesson => (<div key={lesson.lessonId} className="border rounded-md p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2 font-medium">
                                                        {lesson.type === 'VIDEO' ? <VideoIcon size={16}/> : <FileText size={16}/>}
                                                        {lesson.title}
                                                    </div>
                                                    <Badge variant="outline">{lesson.type}</Badge>
                                                </div>
                                                
                                                
                                                {lesson.type === 'VIDEO' && (<div className="mt-2">
                                                       <SecureVideoPlayer lessonId={lesson.lessonId} showStatus={true}/>
                                                    </div>)}
                                                
                                                
                                                {lesson.type === 'TEXT' && (<div className="bg-muted p-2 rounded text-sm max-h-40 overflow-y-auto mt-2">
                                                        {lesson.textContent}
                                                    </div>)}
                                            </div>))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>))}
                    </Accordion>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Course Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                    <div>
                        <Label className="text-muted-foreground">Description</Label>
                        <p className="mt-1">{course.description}</p>
                    </div>
                     <div>
                        <Label className="text-muted-foreground">Price</Label>
                        <p className="mt-1">₹{course.price}</p>
                    </div>
                     <div>
                        <Label className="text-muted-foreground">Category</Label>
                        <p className="mt-1">{course.category?.name}</p>
                    </div>
                </CardContent>
            </Card>
        </div>

        
        <div className="space-y-2.5">
             <Card>
                <CardHeader>
                    <CardTitle>Review Actions</CardTitle>
                    <CardDescription>Make a decision on this submission.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                    <div className="space-y-1.5">
                        <Label>Review Notes / Rejection Reason</Label>
                        <Textarea placeholder="Add feedback for the instructor..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={5}/>
                    </div>

                    <div className="space-y-2 pt-2">
                        <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                            <CheckCircle className="mr-2 h-4 w-4"/> Approve & Publish
                        </Button>
                        
                        <Button className="w-full" variant="outline" onClick={handleRequestChanges}>
                            <RefreshCw className="mr-2 h-4 w-4"/> Request Changes
                        </Button>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="w-full" variant="destructive">
                                    <AlertOctagon className="mr-2 h-4 w-4"/> Reject Course
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Reject Course?</DialogTitle>
                                    <DialogDescription>
                                        This will mark the course as rejected. The instructor will have to start over or contact support. 
                                        Use "Request Changes" if you just want edits.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button variant="outline">Cancel</Button>
                                    <Button variant="destructive" onClick={handleReject}>Confirm Reject</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </PageLayout>);
}
