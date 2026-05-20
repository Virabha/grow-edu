"use client";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/page-transition";
import { useCourseWizard } from "@/features/course-wizard/store";
import { StepBasics } from "@/features/course-wizard/components/step-basics";
import { StepTeachingFormat } from "@/features/course-wizard/components/step-teaching-format";
import { StepAudience } from "@/features/course-wizard/components/step-audience";
import { StepCurriculum } from "@/features/course-wizard/components/step-curriculum";
import { StepContent } from "@/features/course-wizard/components/step-content";
import { StepSettings } from "@/features/course-wizard/components/step-settings";
import { StepPricing } from "@/features/course-wizard/components/step-pricing";
import { StepReview } from "@/features/course-wizard/components/step-review";
import {
  WizardStepperSidebar,
  WizardStepperPills,
  type WizardStep,
} from "@/features/course-wizard/components/wizard-stepper";
import { BackButton } from "@/components/ui/back-button";
import { Loader2 } from "lucide-react";

const steps: WizardStep[] = [
  { title: "Basics", short: "Basics" },
  { title: "Teaching format", short: "Format" },
  { title: "Target audience", short: "Audience" },
  { title: "Curriculum", short: "Curriculum" },
  { title: "Pricing", short: "Pricing" },
  { title: "Lesson content", short: "Content" },
  { title: "Settings", short: "Settings" },
  { title: "Review & submit", short: "Review" },
];

function CourseCreationContent() {
  const { currentStep, totalSteps, courseTitle, setStep } = useCourseWizard();

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepBasics />;
      case 2:
        return <StepTeachingFormat />;
      case 3:
        return <StepAudience />;
      case 4:
        return <StepCurriculum />;
      case 5:
        return <StepPricing />;
      case 6:
        return <StepContent />;
      case 7:
        return <StepSettings />;
      case 8:
        return <StepReview />;
      default:
        return <StepBasics />;
    }
  };

  return (
    <PageTransition>
      <div className="min-h-[calc(100dvh-4rem)] bg-background">
        {/* ── Top bar ───────────────────────────────────────────── */}
        <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <BackButton href="/instructor/courses" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  New course
                </p>
                <h1 className="font-display truncate text-base font-medium leading-tight text-foreground sm:text-lg">
                  {courseTitle || "Untitled course"}
                </h1>
              </div>
            </div>
            <p className="font-display shrink-0 text-xs italic text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </p>
          </div>

          {/* Mobile / tablet stepper */}
          <div className="border-t border-border/60 px-4 py-2 sm:px-6 lg:hidden">
            <WizardStepperPills
              steps={steps}
              currentStep={currentStep}
              onSelect={setStep}
            />
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────── */}
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:py-10">
          {/* Desktop sidebar */}
          <aside className="hidden lg:col-span-3 lg:block xl:col-span-3">
            <div className="sticky top-24 space-y-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  — Wizard —
                </p>
                <h2 className="font-display mt-2 text-2xl font-medium leading-tight tracking-tight text-foreground">
                  Build your course.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Each step saves a draft. You can come back anytime.
                </p>
              </div>
              <WizardStepperSidebar
                steps={steps}
                currentStep={currentStep}
                onSelect={setStep}
              />
            </div>
          </aside>

          {/* Step content */}
          <main className="lg:col-span-9 xl:col-span-9">
            <div className="mx-auto w-full max-w-3xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </PageTransition>
  );
}

export default function CourseCreationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center p-5">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CourseCreationContent />
    </Suspense>
  );
}
