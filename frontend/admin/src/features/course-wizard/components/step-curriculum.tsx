"use client";
import { useCourseWizard } from "../store";
import { CourseBuilder } from "@/features/courses/components/course-builder";
import { WizardShell } from "./wizard-shell";

export function StepCurriculum() {
  const { nextStep, prevStep, courseId } = useCourseWizard();

  return (
    <WizardShell
      step={4}
      eyebrow="Curriculum"
      title={
        <>
          Build the <em className="text-primary">structure.</em>
        </>
      }
      description="Add sections and lessons. You'll fill in their content in the next step."
      onBack={prevStep}
      onContinue={nextStep}
      bare
    >
      {courseId ? (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <CourseBuilder courseId={courseId} />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="font-display text-lg font-medium text-foreground">
            Finish the Basics step first.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            We need a course draft before you can add sections.
          </p>
        </div>
      )}
    </WizardShell>
  );
}
