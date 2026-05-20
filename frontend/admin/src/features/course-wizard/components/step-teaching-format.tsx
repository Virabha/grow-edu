"use client";
import { useState } from "react";
import { Video, FileText, CheckSquare } from "lucide-react";
import { useCourseWizard } from "../store";
import { AnimatedRadioCard } from "@/components/ui/animated-radio-card";
import { WizardShell } from "./wizard-shell";

interface Formats {
  video: boolean;
  text: boolean;
  quiz: boolean;
}

export function StepTeachingFormat() {
  const { nextStep, prevStep } = useCourseWizard();
  const [formats, setFormats] = useState<Formats>({
    video: true,
    text: false,
    quiz: false,
  });
  const [error, setError] = useState<string | null>(null);

  const toggle = (key: keyof Formats) => {
    setFormats((prev) => ({ ...prev, [key]: !prev[key] }));
    if (error) setError(null);
  };

  const onContinue = () => {
    if (!formats.video && !formats.text && !formats.quiz) {
      setError("Pick at least one teaching format.");
      return;
    }
    nextStep();
  };

  return (
    <WizardShell
      step={2}
      eyebrow="Teaching format"
      title={
        <>
          How will you <em className="text-primary">teach this?</em>
        </>
      }
      description="Pick the content types you'll include. You can add more later."
      onBack={prevStep}
      onContinue={onContinue}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Formats <span className="text-destructive">*</span>
          </p>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <AnimatedRadioCard
            selected={formats.video}
            onClick={() => toggle("video")}
            title="Video lessons"
            description="Pre-recorded lectures for self-paced learning."
            icon={<Video className="size-5" />}
            className="h-full"
          />
          <AnimatedRadioCard
            selected={formats.text}
            onClick={() => toggle("text")}
            title="Text & articles"
            description="Written guides, reference notes, and worksheets."
            icon={<FileText className="size-5" />}
            className="h-full"
          />
          <AnimatedRadioCard
            selected={formats.quiz}
            onClick={() => toggle("quiz")}
            title="Quizzes"
            description="Assessments that test retention and recall."
            icon={<CheckSquare className="size-5" />}
            className="h-full"
          />
        </div>
      </div>
    </WizardShell>
  );
}
