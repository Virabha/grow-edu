"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { useCourseWizard } from "../store";
import { useUpdateCourse, useCourse } from "@/features/courses/hooks/use-courses";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { WizardShell } from "./wizard-shell";

interface DynamicListProps {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
}

function DynamicList({ label, placeholder, items, onChange }: DynamicListProps) {
  const handleAdd = () => onChange([...items, ""]);
  const handleRemove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const handleChange = (i: number, v: string) => {
    const next = [...items];
    next[i] = v;
    onChange(next);
  };
  const handleKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "Enter" && (items[i] ?? "").trim() !== "") {
      e.preventDefault();
      if (i === items.length - 1) handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </Label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="group flex gap-2">
            <Input
              value={item}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              placeholder={placeholder}
              autoFocus={i === items.length - 1 && i > 0}
            />
            {items.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(i)}
                aria-label="Remove"
                className="shrink-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100 sm:opacity-0"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="gap-1.5 border-dashed text-primary"
      >
        <Plus className="size-3.5" />
        Add another
      </Button>
    </div>
  );
}

export function StepAudience() {
  const { nextStep, prevStep, courseId } = useCourseWizard();
  const updateCourse = useUpdateCourse();
  const { data: course, isLoading } = useCourse({
    enabled: true,
    courseId: courseId ?? undefined,
  });

  const [outcomes, setOutcomes] = useState<string[]>([""]);
  const [audience, setAudience] = useState<string[]>([""]);
  const [prereqs, setPrereqs] = useState<string[]>([""]);

  useEffect(() => {
    if (!course) return;
    if (course.learningOutcomes?.length) setOutcomes(course.learningOutcomes);
    if (course.targetAudience?.length) setAudience(course.targetAudience);
    if (course.requirements?.length) setPrereqs(course.requirements);
  }, [course]);

  const onContinue = async () => {
    if (!courseId) return;
    try {
      const filteredOutcomes = outcomes.filter((s) => s.trim() !== "");
      const filteredAudience = audience.filter((s) => s.trim() !== "");
      const filteredPrereqs = prereqs.filter((s) => s.trim() !== "");
      await updateCourse.mutateAsync({
        id: courseId,
        dto: {
          learningOutcomes: filteredOutcomes.length ? filteredOutcomes : undefined,
          targetAudience: filteredAudience.length ? filteredAudience : undefined,
          requirements: filteredPrereqs.length ? filteredPrereqs : undefined,
        },
      });
      toast.success("Audience saved.");
      nextStep();
    } catch {
      toast.error("Couldn't save audience.");
    }
  };

  if (isLoading) {
    return (
      <WizardShell
        step={3}
        eyebrow="Target audience"
        title={<>Who is this <em className="text-primary">for?</em></>}
        hideBack
      >
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </WizardShell>
    );
  }

  return (
    <WizardShell
      step={3}
      eyebrow="Target audience"
      title={<>Who is this <em className="text-primary">for?</em></>}
      description="Tell prospective learners exactly what they'll get and what they need to know first."
      onBack={prevStep}
      onContinue={onContinue}
      loading={updateCourse.isPending}
    >
      <div className="space-y-4">
        <DynamicList
          label="What learners will be able to do"
          placeholder="e.g. Build a full-stack app from scratch"
          items={outcomes}
          onChange={setOutcomes}
        />
        <DynamicList
          label="Who this course is for"
          placeholder="e.g. Beginners interested in web development"
          items={audience}
          onChange={setAudience}
        />
        <DynamicList
          label="Prerequisites (if any)"
          placeholder="e.g. Basic HTML & CSS"
          items={prereqs}
          onChange={setPrereqs}
        />
      </div>
    </WizardShell>
  );
}
