"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useCourseWizard } from "../store";
import { useUpdateCourse } from "@/features/courses/hooks/use-courses";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WizardShell } from "./wizard-shell";

type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

const options: {
  value: CourseStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "DRAFT",
    label: "Draft",
    description: "Only you can see this course. Use while still building.",
  },
  {
    value: "PUBLISHED",
    label: "Published",
    description: "Listed publicly once review approves it.",
  },
  {
    value: "ARCHIVED",
    label: "Archived",
    description: "Hidden from learners but kept in your records.",
  },
];

export function StepSettings() {
  const { nextStep, prevStep, courseId } = useCourseWizard();
  const updateCourse = useUpdateCourse();
  const [status, setStatus] = useState<CourseStatus>("DRAFT");

  const onContinue = async () => {
    if (!courseId) return;
    try {
      await updateCourse.mutateAsync({ id: courseId, dto: { status } });
      toast.success("Settings saved.");
      nextStep();
    } catch {
      toast.error("Couldn't save settings.");
    }
  };

  return (
    <WizardShell
      step={7}
      eyebrow="Visibility"
      title={
        <>
          Who can <em className="text-primary">see this?</em>
        </>
      }
      description="Choose visibility now or come back to it later."
      onBack={prevStep}
      onContinue={onContinue}
      loading={updateCourse.isPending}
    >
      <div className="space-y-2">
        <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Status
        </Label>
        <RadioGroup
          value={status}
          onValueChange={(v: CourseStatus) => setStatus(v)}
          className="space-y-2"
        >
          {options.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`status-${opt.value}`}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <RadioGroupItem
                id={`status-${opt.value}`}
                value={opt.value}
                className="mt-0.5"
              />
              <div>
                <p className="font-display text-base font-medium text-foreground">
                  {opt.label}
                </p>
                <p className="text-sm text-muted-foreground">{opt.description}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>
    </WizardShell>
  );
}
