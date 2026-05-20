"use client";
import { useState } from "react";
import { toast } from "sonner";
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

  const toggle = (key: keyof Formats) =>
    setFormats((prev) => ({ ...prev, [key]: !prev[key] }));

  const onContinue = () => {
    if (!formats.video && !formats.text && !formats.quiz) {
      toast.error("Pick at least one teaching format.");
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
    </WizardShell>
  );
}
