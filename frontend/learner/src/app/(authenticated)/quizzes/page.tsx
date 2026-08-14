"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Target, Timer } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ResultChip } from "@/components/ui/result-chip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuizAttempts } from "@/lib/hooks/use-quiz-attempts";
import { formatDateTime, formatDuration } from "@/lib/format";

const RESULTS = [
  { value: "all", label: "All results" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
] as const;

export default function QuizzesPage() {
  const [result, setResult] = useState<"all" | "passed" | "failed">("all");
  const [courseId, setCourseId] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuizAttempts({
    result,
    courseId,
    page,
    limit: 10,
  });

  const attempts = data?.data ?? [];
  const pagination = data?.pagination;

  // Course filter options come from what the learner has actually attempted.
  const unfiltered = useQuizAttempts({ page: 1, limit: 100 });
  const courseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const attempt of unfiltered.data?.data ?? []) {
      seen.set(attempt.courseId, attempt.courseTitle);
    }
    return Array.from(seen, ([id, title]) => ({ id, title }));
  }, [unfiltered.data]);

  const filtersActive = result !== "all" || courseId !== "all";

  return (
    <PageLayout
      subtitle="Assessments"
      header="Attempted quizzes"
      description="Every quiz you have submitted, what you scored, and where you went wrong."
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={courseId}
            onValueChange={(value) => {
              setCourseId(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-full text-sm sm:w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courseOptions.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={result}
            onValueChange={(value) => {
              setResult(value as "all" | "passed" | "failed");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-full text-sm sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESULTS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isError ? (
          <EmptyState
            title="We could not load your attempts"
            description={
              error instanceof Error ? error.message : "Please try again."
            }
            icon={<Target className="size-10" />}
            action={{ label: "Try again", onClick: () => void refetch() }}
          />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[74px] w-full rounded-xl" />
            ))}
          </div>
        ) : attempts.length === 0 ? (
          <EmptyState
            title={
              filtersActive ? "No attempts match those filters" : "No quizzes yet"
            }
            description={
              filtersActive
                ? "Try a different course or result filter."
                : "Submit a quiz inside a course and the result will show up here."
            }
            icon={<Target className="size-10" />}
            action={
              filtersActive
                ? {
                    label: "Clear filters",
                    onClick: () => {
                      setResult("all");
                      setCourseId("all");
                      setPage(1);
                    },
                  }
                : undefined
            }
          />
        ) : (
          <ul className="space-y-2">
            {attempts.map((attempt) => (
              <li
                key={attempt.attemptId}
                className="rounded-xl border border-border/70 bg-card/85 p-3 transition-shadow hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <ScoreDial
                    score={attempt.scorePercent}
                    passed={attempt.passed}
                  />

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium">
                      {attempt.quizTitle}
                    </h3>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {attempt.courseTitle} · {attempt.lessonTitle}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span>
                        {attempt.correctCount}/{attempt.totalQuestions} correct
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Timer className="size-3" />
                        {formatDuration(attempt.durationSeconds)}
                      </span>
                      <span>Attempt {attempt.attemptNo}</span>
                      <span>{formatDateTime(attempt.submittedAt)}</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <ResultChip
                      passed={attempt.passed}
                      failLabel={`Below ${attempt.passMark}% pass mark`}
                    />
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                    >
                      <Link href={`/quizzes/${attempt.attemptId}`}>
                        Review
                        <ChevronRight className="ml-0.5 size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
      </div>
    </PageLayout>
  );
}

/**
 * The score as a ring rather than a number in a box — at a glance the fill is
 * the comparison, and the colour only ever says pass or fail.
 */
function ScoreDial({ score, passed }: { score: number; passed: boolean }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div className="relative size-12 shrink-0">
      <svg viewBox="0 0 44 44" className="size-full -rotate-90" aria-hidden="true">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          strokeWidth="3.5"
          className="stroke-muted"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          className={
            passed
              ? "stroke-emerald-600 dark:stroke-emerald-400"
              : "stroke-red-600 dark:stroke-red-400"
          }
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium tabular-nums">
        {score}%
      </span>
    </div>
  );
}
