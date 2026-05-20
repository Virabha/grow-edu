"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
  title: string;
  /** Optional short label shown in the mobile pill row. */
  short?: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  /** If provided, completed/upcoming step pills are clickable. */
  onSelect?: (step: number) => void;
  className?: string;
}

/**
 * Renders TWO layouts:
 *  - lg and up: vertical sidebar inside parent .lg\:block container
 *  - below lg: a horizontal scrollable pill row
 *
 * Compose the layout in the parent — pass `variant`.
 */
export function WizardStepperSidebar({
  steps,
  currentStep,
  onSelect,
}: WizardStepperProps) {
  return (
    <ol className="relative space-y-1 border-l border-border/80 pl-5">
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        const clickable = onSelect && (isCompleted || isActive);

        return (
          <li key={step.title} className="relative">
            {(isActive || isCompleted) && (
              <motion.div
                layoutId="wizard-step-rail"
                className="absolute -left-[21px] top-0 h-full w-[2px] bg-primary"
                transition={{ duration: 0.3 }}
              />
            )}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelect(stepNum)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                isActive
                  ? "text-foreground"
                  : isCompleted
                    ? "text-foreground/80 hover:text-foreground"
                    : "text-muted-foreground",
                clickable && "cursor-pointer",
              )}
            >
              <span
                className={cn(
                  "font-display flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium",
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <Check className="size-3.5" />
                ) : (
                  String(stepNum).padStart(2, "0")
                )}
              </span>
              <span
                className={cn(
                  "truncate font-medium",
                  isActive && "text-foreground",
                )}
              >
                {step.title}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function WizardStepperPills({
  steps,
  currentStep,
  onSelect,
}: WizardStepperProps) {
  return (
    <div className="relative -mx-3 sm:mx-0">
      <ol className="flex gap-2 overflow-x-auto px-3 py-1 sm:px-0 scrollbar-hide">
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;
          const clickable = onSelect && (isCompleted || isActive);
          return (
            <li key={step.title}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onSelect(stepNum)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : isCompleted
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border bg-background text-muted-foreground",
                  clickable && "cursor-pointer hover:border-primary/40",
                )}
              >
                <span className="font-display text-[11px] italic">
                  {String(stepNum).padStart(2, "0")}
                </span>
                <span>{step.short ?? step.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
