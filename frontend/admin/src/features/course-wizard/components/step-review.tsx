"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useCourseWizard } from "../store";
import { useSubmitCourseForReview, useCourse } from "@/lib/hooks/use-courses";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WizardShell } from "./wizard-shell";

function ChecklistItem({
  done,
  required,
  children,
}: {
  done: boolean;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <CheckCircle2
        className={cn(
          "mt-0.5 size-4 shrink-0",
          done
            ? "text-primary"
            : required
              ? "text-destructive"
              : "text-muted-foreground/40",
        )}
      />
      <span
        className={cn(
          done
            ? "text-foreground"
            : required
              ? "text-destructive"
              : "text-muted-foreground",
        )}
      >
        {children}
        {!done && required && (
          <span className="ml-1 text-[11px] uppercase tracking-widest">
            · required
          </span>
        )}
      </span>
    </li>
  );
}

export function StepReview() {
  const { prevStep, courseId } = useCourseWizard();
  const router = useRouter();
  const { data: course, isLoading } = useCourse({ id: courseId ?? undefined });
  const submitForReview = useSubmitCourseForReview();

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!course) return errs;
    if (!course.sections?.length) {
      errs.push("Add at least one section.");
    } else {
      const hasLesson = course.sections.some((s) => s.lessons?.length);
      if (!hasLesson) errs.push("Add at least one lesson or quiz.");
      const coursePrice = Number(course.price || 0);
      for (const section of course.sections) {
        if (
          (section.priceType === "INDIVIDUAL" ||
            section.priceType === "BOTH") &&
          !section.sectionPrice
        ) {
          errs.push(
            `Section "${section.title}" needs a price (it's individually purchasable).`,
          );
        }
        if (
          section.sectionPrice &&
          coursePrice > 0 &&
          Number(section.sectionPrice) > coursePrice
        ) {
          errs.push(
            `Section "${section.title}" price (₹${section.sectionPrice}) exceeds course price (₹${coursePrice}).`,
          );
        }
      }
    }
    return errs;
  }, [course]);

  const handleSubmit = async () => {
    if (!courseId) return;
    try {
      await submitForReview.mutateAsync(courseId);
      toast.success("Course submitted for review.");
      router.push("/instructor/courses");
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Submission failed — please re-check requirements.",
      );
    }
  };

  if (isLoading) {
    return (
      <WizardShell
        step={8}
        eyebrow="Review & submit"
        title={<>Almost <em className="text-primary">there.</em></>}
        hideBack
      >
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </WizardShell>
    );
  }

  const isPending = course?.reviewStatus === "PENDING_REVIEW";
  const isApproved = course?.reviewStatus === "APPROVED";
  const isChangesRequested = course?.reviewStatus === "CHANGES_REQUESTED";
  const isRejected = course?.reviewStatus === "REJECTED";

  const hasSections = !!course?.sections?.length;
  const hasLessons = !!course?.sections?.some((s) => s.lessons?.length);
  const hasThumbnail = !!course?.thumbnail;
  const hasPrice = course?.price != null && Number(course.price) >= 0;

  const showSubmit = !isPending && !isApproved;
  const showReturn = isPending || isApproved;

  return (
    <WizardShell
      step={8}
      eyebrow="Review & submit"
      title={
        isPending ? (
          <>Under <em className="text-primary">review.</em></>
        ) : isApproved ? (
          <>Course <em className="text-primary">approved.</em></>
        ) : (
          <>Ready to <em className="text-primary">submit?</em></>
        )
      }
      description={
        isPending
          ? "Our team is checking your course. We'll email you once there's an update."
          : isApproved
            ? "Your course is live and discoverable to learners."
            : "Make sure your curriculum and content are ready. Once submitted, you can still respond to admin feedback."
      }
      onBack={isApproved ? undefined : prevStep}
      hideBack={isApproved}
      rightActions={
        <div className="flex flex-wrap items-center gap-2">
          {showSubmit && (
            <Button
              onClick={handleSubmit}
              disabled={submitForReview.isPending || validationErrors.length > 0}
              className="h-11 gap-2 rounded-full px-6"
            >
              {submitForReview.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting…
                </>
              ) : isChangesRequested ? (
                "Resubmit for review"
              ) : (
                "Submit for approval"
              )}
            </Button>
          )}
          {showReturn && (
            <Button
              variant="outline"
              onClick={() => router.push("/instructor/courses")}
              className="h-11 rounded-full px-6"
            >
              Return to courses
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-3">
        {validationErrors.length > 0 && showSubmit && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Resolve these before submitting</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {validationErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {isChangesRequested && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Changes requested</AlertTitle>
            <AlertDescription>
              {course?.reviewNotes ||
                course?.rejectionReason ||
                "Please review the feedback and resubmit."}
            </AlertDescription>
          </Alert>
        )}

        {isRejected && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Course rejected</AlertTitle>
            <AlertDescription>
              {course?.rejectionReason || "Please see admin notes."}
            </AlertDescription>
          </Alert>
        )}

        {isPending ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/30 px-6 py-10 text-center">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="font-display text-lg font-medium text-foreground">
              Your course is queued.
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Reviews are typically completed within 48 hours. We&apos;ll email
              you the moment there&apos;s an update.
            </p>
          </div>
        ) : isApproved ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-6 py-10 text-center">
            <CheckCircle2 className="size-10 text-primary" />
            <p className="font-display text-lg font-medium text-foreground">
              Live.
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Learners can now find and enrol in your course.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Pre-submission checklist
            </p>
            <ul className="mt-3 space-y-2.5 rounded-xl border border-border bg-background p-5">
              <ChecklistItem done={hasSections} required>
                Sections added ({course?.sections?.length ?? 0})
              </ChecklistItem>
              <ChecklistItem done={hasLessons} required>
                At least one lesson or quiz
              </ChecklistItem>
              <ChecklistItem done={hasThumbnail}>
                Thumbnail uploaded
              </ChecklistItem>
              <ChecklistItem done={hasPrice}>
                Price set (₹{course?.price ?? "0"})
              </ChecklistItem>
            </ul>
          </div>
        )}
      </div>
    </WizardShell>
  );
}
