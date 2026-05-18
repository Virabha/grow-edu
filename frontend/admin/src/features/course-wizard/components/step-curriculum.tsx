"use client";
import { useCourseWizard } from "../store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export function StepCurriculum() {
    const { nextStep, prevStep, courseId } = useCourseWizard();
    return (<Card>
      <CardHeader>
        <CardTitle>Curriculum</CardTitle>
        <CardDescription>
          Structure your course with modules and lessons.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {courseId && <CourseBuilder courseId={courseId}/>}
        
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={prevStep}>
            Back
          </Button>
          <Button onClick={nextStep}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>);
}
import { CourseBuilder } from "@/features/courses/components/course-builder";
