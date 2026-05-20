"use client";
import { useCourseWizard } from "../store";
import { CourseBuilder } from "@/features/courses/components/course-builder";
import { WizardShell } from "./wizard-shell";

export function StepContent() {
  const { nextStep, prevStep, courseId } = useCourseWizard();

  return (
    <WizardShell
      step={6}
      eyebrow="Lesson content"
      title={
        <>
          Fill in the <em className="text-primary">lessons.</em>
        </>
      }
      description="Click the edit (pencil) icon on any lesson to upload videos, write text, or build quizzes."
      onBack={prevStep}
      onContinue={nextStep}
      continueLabel="Continue to settings"
      bare
    >
      {courseId ? (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <CourseBuilder courseId={courseId} />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="font-display text-lg font-medium text-foreground">
            No course draft yet.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Go back and finish the Basics step first.
          </p>
        </div>
      )}
    </WizardShell>
  );
}
