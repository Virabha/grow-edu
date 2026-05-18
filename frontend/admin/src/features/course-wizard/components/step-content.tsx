"use client";
import { useCourseWizard } from "../store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CourseBuilder } from "@/features/courses/components/course-builder";
export function StepContent() {
    const { nextStep, prevStep, courseId } = useCourseWizard();
    return (<Card className="min-h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>Add Lesson Content</CardTitle>
        <CardDescription>
          Now that your structure is ready, upload videos, write text, and create quizzes.
          Click the "Edit" (pencil) icon on any lesson to add content.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {courseId ? (<div className="flex-1 border rounded-md p-4 bg-muted/10">
             <CourseBuilder courseId={courseId}/>
          </div>) : (<div className="text-center py-12 text-muted-foreground">
            Please complete the Basic Details step first to generate a Course ID.
          </div>)}

        <div className="flex justify-between pt-3 mt-auto">
          <Button variant="outline" onClick={prevStep}>
            Back
          </Button>
          <Button onClick={nextStep}>
            Continue to Settings
          </Button>
        </div>
      </CardContent>
    </Card>);
}
