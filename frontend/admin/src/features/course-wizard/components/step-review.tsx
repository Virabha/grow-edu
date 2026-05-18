"use client";
import { useCourseWizard } from "../store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useSubmitCourseForReview, useCourse } from "@/lib/hooks/use-courses";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
export function StepReview() {
    const { prevStep, courseId } = useCourseWizard();
    const router = useRouter();
    const { data: course, isLoading: isLoadingCourse } = useCourse({ id: courseId || undefined });
    const submitForReview = useSubmitCourseForReview();
    const getValidationErrors = () => {
        const errors: string[] = [];
        if (!course)
            return errors;
        if (!course.sections || course.sections.length === 0) {
            errors.push("Add at least one section");
        }
        else {
            const hasLesson = course.sections.some(s => s.lessons && s.lessons.length > 0);
            if (!hasLesson) {
                errors.push("Add at least one lesson or quiz");
            }
            const coursePrice = Number(course.price || 0);
            for (const section of course.sections) {
                if ((section.priceType === "INDIVIDUAL" || section.priceType === "BOTH") && !section.sectionPrice) {
                    errors.push(`Section "${section.title}" needs a price (it's set as individually purchasable)`);
                }
                if (section.sectionPrice && coursePrice > 0 && Number(section.sectionPrice) > coursePrice) {
                    errors.push(`Section "${section.title}" price (₹${section.sectionPrice}) exceeds course price (₹${coursePrice})`);
                }
            }
        }
        return errors;
    };
    const validationErrors = getValidationErrors();
    const handleSubmit = async () => {
        if (!courseId)
            return;
        try {
            await submitForReview.mutateAsync(courseId);
            toast.success("Course submitted for review!");
            router.push("/instructor/courses");
        }
        catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            const errorMessage = err?.response?.data?.message ||
                err?.message ||
                "Failed to submit course. Please check all requirements.";
            toast.error(errorMessage, {
                duration: 6000,
                description: "Please review your course and ensure all requirements are met."
            });
        }
    };
    if (isLoadingCourse) {
        return (<div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
          </div>);
    }
    const isPending = course?.reviewStatus === 'PENDING_REVIEW';
    const isApproved = course?.reviewStatus === 'APPROVED';
    const isChangesRequested = course?.reviewStatus === 'CHANGES_REQUESTED';
    const isRejected = course?.reviewStatus === 'REJECTED';
    return (<Card>
      <CardHeader>
        <CardTitle>Review & Submit</CardTitle>
        <CardDescription>
            {isPending ? "Your course is under review." : "You're almost done! Submit your course for approval."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        
        {validationErrors.length > 0 && !isPending && !isApproved && (<Alert variant="destructive">
                <AlertCircle className="h-4 w-4"/>
                <AlertTitle>Cannot Submit - Please Fix These Issues:</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                        {validationErrors.map((error, idx) => (<li key={idx}>{error}</li>))}
                    </ul>
                </AlertDescription>
            </Alert>)}

        {isChangesRequested && (<Alert variant="destructive">
                <AlertCircle className="h-4 w-4"/>
                <AlertTitle>Changes Requested</AlertTitle>
                <AlertDescription>
                    Admin Note: {course?.reviewNotes || course?.rejectionReason || "Please review the feedback and resubmit."}
                </AlertDescription>
            </Alert>)}

        {isRejected && (<Alert variant="destructive">
                <AlertCircle className="h-4 w-4"/>
                <AlertTitle>Course Rejected</AlertTitle>
                <AlertDescription>
                    Reason: {course?.rejectionReason}
                </AlertDescription>
            </Alert>)}

        <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-muted/10">
            {isPending ? (<div className="text-center space-y-2">
                    <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto"/>
                    <h3 className="text-xl font-semibold">Under Review</h3>
                    <p className="text-muted-foreground">Our team is reviewing your course. You will be notified once updates are available.</p>
                 </div>) : isApproved ? (<div className="text-center space-y-2">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto"/>
                    <h3 className="text-xl font-semibold">Course Published!</h3>
                    <p className="text-muted-foreground">Your course is live and available to students.</p>
                </div>) : (<div className="text-center space-y-2.5">
                     <div className="space-y-2">
                        <h3 className="text-xl font-semibold">Ready to submit?</h3>
                        <p className="text-muted-foreground">
                            Ensure you have added all lessons, quizzes, and resources before submitting.
                        </p>
                    </div>
                    <ul className="text-left text-sm space-y-2 bg-background p-4 rounded border inline-block min-w-[300px]">
                        <li className="flex items-center gap-2">
                            <CheckCircle2 className={course?.sections?.length ? "text-green-500" : "text-gray-300"} size={16}/>
                            <span className={!course?.sections?.length ? "text-destructive" : ""}>
                              Sections added ({course?.sections?.length || 0})
                              {!course?.sections?.length && " - Required"}
                            </span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 className={course?.sections?.some(s => s.lessons?.length > 0) ? "text-green-500" : "text-gray-300"} size={16}/>
                            <span className={!course?.sections?.some(s => s.lessons?.length > 0) ? "text-destructive" : ""}>
                              Lessons added
                              {!course?.sections?.some(s => s.lessons?.length > 0) && " - Required"}
                            </span>
                        </li>
                         <li className="flex items-center gap-2">
                            <CheckCircle2 className={course?.thumbnail ? "text-green-500" : "text-gray-300"} size={16}/>
                            <span className={!course?.thumbnail ? "text-muted-foreground" : ""}>
                              Thumbnail uploaded
                              {!course?.thumbnail && " - Recommended"}
                            </span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 className={course?.price && Number(course.price) >= 0 ? "text-green-500" : "text-gray-300"} size={16}/>
                            Price set (₹{course?.price || "0"})
                        </li>
                    </ul>
                </div>)}
        </div>

      </CardContent>
      <CardFooter className="justify-between">
          <Button variant="outline" onClick={prevStep}>
            Back
          </Button>
          <div className="gap-2 flex">
            
            {!isPending && !isApproved && (<Button onClick={handleSubmit} disabled={submitForReview.isPending || validationErrors.length > 0}>
                    {submitForReview.isPending ? "Submitting..." : isChangesRequested ? "Resubmit for Review" : "Submit for Approval"}
                </Button>)}
             {(isPending || isApproved) && (<Button variant="outline" onClick={() => router.push("/instructor/courses")}>
                     Return to Dashboard
                 </Button>)}
          </div>
      </CardFooter>
    </Card>);
}
