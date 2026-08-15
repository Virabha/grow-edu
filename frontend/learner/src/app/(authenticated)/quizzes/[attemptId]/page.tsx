"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Minus, Target, Timer, X } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuizAttempt } from "@/lib/hooks/use-quiz-attempts";
import { cn } from "@/lib/utils";
import { getApiError } from "@/lib/api/errors";
import { formatDateTime, formatDuration } from "@/lib/format";

export default function QuizAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = use(params);
  const { data: attempt, isLoading, isError, error } = useQuizAttempt(attemptId);

  if (isError || (!isLoading && !attempt)) {
    return (
      <PageLayout header="Quiz attempt">
        <EmptyState
          title="We could not find that attempt"
          description={getApiError(error, "It may have been removed.").message}
          icon={<Target className="size-10" />}
        />
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href="/quizzes">
            <ArrowLeft className="mr-1 size-3.5" />
            Back to attempts
          </Link>
        </Button>
      </PageLayout>
    );
  }

  if (isLoading || !attempt) {
    return (
      <PageLayout header="Quiz attempt">
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </PageLayout>
    );
  }

  const unanswered = attempt.answers.filter((a) => a.chosenIndex === null).length;

  return (
    <PageLayout
      subtitle={attempt.courseTitle}
      header={attempt.quizTitle}
      description={`${attempt.lessonTitle} · attempt ${attempt.attemptNo}, submitted ${formatDateTime(attempt.submittedAt)}`}
    >
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 text-xs">
          <Link href="/quizzes">
            <ArrowLeft className="mr-1 size-3.5" />
            All attempts
          </Link>
        </Button>

        {/* Result band */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 sm:grid-cols-4">
          <Summary
            label="Score"
            value={`${attempt.scorePercent}%`}
            hint={
              attempt.passed
                ? `Pass mark ${attempt.passMark}%`
                : `Needed ${attempt.passMark}%`
            }
            tone={attempt.passed ? "pass" : "fail"}
          />
          <Summary
            label="Correct"
            value={`${attempt.correctCount}/${attempt.totalQuestions}`}
            hint={unanswered > 0 ? `${unanswered} left blank` : "All answered"}
          />
          <Summary
            label="Time taken"
            value={formatDuration(attempt.durationSeconds)}
            hint={
              attempt.totalQuestions > 0
                ? `${Math.round(attempt.durationSeconds / attempt.totalQuestions)}s per question`
                : "No questions"
            }
          />
          <Summary
            label="Result"
            value={attempt.passed ? "Passed" : "Failed"}
            hint={`Attempt ${attempt.attemptNo}`}
            tone={attempt.passed ? "pass" : "fail"}
          />
        </div>

        <ol className="space-y-2">
          {attempt.answers.map((answer, index) => {
            const correct = answer.chosenIndex === answer.correctIndex;
            const skipped = answer.chosenIndex === null;

            return (
              <li key={answer.questionId}>
                <Card className="py-3">
                  <CardContent className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
                          skipped
                            ? "bg-muted text-muted-foreground"
                            : correct
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
                        )}
                        aria-hidden="true"
                      >
                        {skipped ? (
                          <Minus className="size-3" />
                        ) : correct ? (
                          <Check className="size-3" />
                        ) : (
                          <X className="size-3" />
                        )}
                      </span>
                      <h2 className="text-sm font-medium leading-snug">
                        <span className="text-muted-foreground">
                          Question {index + 1}.
                        </span>{" "}
                        {answer.question}
                        <span className="sr-only">
                          {" — "}
                          {skipped
                            ? "not answered"
                            : correct
                              ? "answered correctly"
                              : "answered incorrectly"}
                        </span>
                      </h2>
                    </div>

                    <ul className="space-y-1 sm:ml-7">
                      {answer.options.map((option, optionIndex) => {
                        const isCorrect = optionIndex === answer.correctIndex;
                        const isChosen = optionIndex === answer.chosenIndex;

                        return (
                          <li
                            key={option}
                            className={cn(
                              "flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-sm",
                              isCorrect
                                ? "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-900/20"
                                : isChosen
                                  ? "border-red-500/50 bg-red-50 dark:bg-red-900/20"
                                  : "border-transparent",
                            )}
                          >
                            <span className="mt-0.5 w-4 shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            <span className="flex-1">{option}</span>
                            {isChosen && (
                              <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Your answer
                              </span>
                            )}
                            {isCorrect && !isChosen && (
                              <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                                Correct
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    <p className="rounded-md bg-muted/50 px-2.5 py-2 text-sm leading-relaxed text-muted-foreground sm:ml-7">
                      {answer.explanation}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="outline" size="sm">
            <Link href={`/courses/${attempt.courseId}/watch`}>
              <Timer className="mr-1.5 size-3.5" />
              Back to the course
            </Link>
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

function Summary({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "pass" | "fail";
}) {
  return (
    <div className="bg-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-2xl font-medium leading-none tabular-nums",
          tone === "pass" && "text-emerald-700 dark:text-emerald-400",
          tone === "fail" && "text-red-700 dark:text-red-400",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
