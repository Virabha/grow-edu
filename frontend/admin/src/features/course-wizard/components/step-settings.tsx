"use client";
import { useCourseWizard } from "../store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { useState } from "react";
import { toast } from "sonner";
import { useUpdateCourse } from "@/features/courses/hooks/use-courses";
type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export function StepSettings() {
    const { nextStep, prevStep, courseId } = useCourseWizard();
    const updateCourse = useUpdateCourse();
    const [status, setStatus] = useState<CourseStatus>("DRAFT");
    const onNext = async () => {
        try {
            await updateCourse.mutateAsync({
                id: courseId!,
                dto: {
                    status,
                },
            });
            toast.success("Settings saved successfully!");
            nextStep();
        }
        catch (e) {
            toast.error("Failed to save settings");
        }
    };
    return (<Card>
      <CardHeader>
        <CardTitle>Course Settings</CardTitle>
        <CardDescription>
          Visibility settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">



        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => {
            if (value === "DRAFT" ||
                value === "PUBLISHED" ||
                value === "ARCHIVED") {
                setStatus(value);
            }
        }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft (Private)</SelectItem>
              <SelectItem value="PUBLISHED">Published (Public)</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={prevStep}>
            Back
          </Button>
          <Button onClick={onNext}>Continue</Button>
        </div>
      </CardContent>
    </Card>);
}
