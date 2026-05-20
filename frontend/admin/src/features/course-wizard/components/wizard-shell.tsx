"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardShellProps {
  step?: number;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  /** Continue button submits a wrapping form instead of firing onClick. */
  submitForm?: string;
  continueDisabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  hideBack?: boolean;
  /** Custom right-side actions (overrides default continue button). */
  rightActions?: ReactNode;
  /** Render outside the card (e.g. for Curriculum that uses its own surface). */
  bare?: boolean;
  className?: string;
}

export function WizardShell({
  step,
  eyebrow = "Course wizard",
  title,
  description,
  children,
  onBack,
  onContinue,
  continueLabel = "Continue",
  submitForm,
  continueDisabled = false,
  loading = false,
  loadingLabel = "Saving…",
  hideBack = false,
  rightActions,
  bare = false,
  className,
}: WizardShellProps) {
  const ContinueButton = rightActions ? (
    <>{rightActions}</>
  ) : onContinue || submitForm ? (
    <Button
      type={submitForm ? "submit" : "button"}
      form={submitForm}
      onClick={submitForm ? undefined : onContinue}
      disabled={continueDisabled || loading}
      className="group h-11 gap-2 rounded-full px-6"
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          {continueLabel}
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </>
      )}
    </Button>
  ) : null;

  return (
    <div className={cn("space-y-5", className)}>
      <header className="space-y-2">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {typeof step === "number" && (
            <span className="font-display text-sm italic text-primary">
              {String(step).padStart(2, "0")}
            </span>
          )}
          <span className="inline-block h-px w-8 bg-border" />
          {eyebrow}
        </div>
        <h2 className="font-display text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </header>

      {bare ? (
        children
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          {children}
        </div>
      )}

      <footer className="flex items-center justify-between gap-3 pt-1">
        {!hideBack && onBack ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={loading}
            className="h-11 gap-2 rounded-full px-4 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
        ) : (
          <span />
        )}
        {ContinueButton}
      </footer>
    </div>
  );
}
