"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Clock,
  Trophy,
  XCircle,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  useBatchBySlug,
  useBatchQuiz,
  useQuizLeaderboard,
  useStartQuizAttempt,
  useSubmitQuizAttempt,
} from "@/lib/hooks/use-batches";
import type { QuizAttempt, QuizQuestion } from "@/lib/api/services/batches";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTimer(ms: number): string {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${pad(min)}:${pad(sec)}`;
}

interface AttemptViewProps {
  batchId: string;
  attempt: QuizAttempt;
  questions: QuizQuestion[];
  onSubmitted: (a: QuizAttempt) => void;
}

function AttemptView({ batchId, attempt, questions, onSubmitted }: AttemptViewProps) {
  const submit = useSubmitQuizAttempt(batchId, attempt.quizId);
  const [answers, setAnswers] = useState<Record<string, unknown>>(attempt.answers);
  const [remainingMs, setRemainingMs] = useState<number>(
    new Date(attempt.expiresAt).getTime() - Date.now()
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemainingMs(new Date(attempt.expiresAt).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [attempt.expiresAt]);

  const doSubmit = useCallback(async () => {
    try {
      const result = await submit.mutateAsync({
        attemptId: attempt.attemptId,
        answers,
      });
      onSubmitted(result);
      toast.success("Submitted");
    } catch {
      toast.error("Failed to submit");
    }
  }, [answers, attempt.attemptId, submit, onSubmitted]);

  useEffect(() => {
    if (remainingMs <= 0 && attempt.status === "IN_PROGRESS") {
      void doSubmit();
    }
  }, [remainingMs, attempt.status, doSubmit]);

  return (
    <div className="space-y-4">
      <div className="sticky top-4 z-10 flex items-center justify-between rounded-2xl border border-border bg-card/95 p-3 backdrop-blur">
        <p className="flex items-center gap-2 text-sm">
          <Clock className="size-4 text-amber-500" />
          <span
            className={
              remainingMs < 60_000
                ? "font-mono font-bold text-destructive"
                : "font-mono"
            }
          >
            {formatTimer(remainingMs)}
          </span>
        </p>
        <Button size="sm" onClick={doSubmit} disabled={submit.isPending}>
          Submit
        </Button>
      </div>

      <ol className="space-y-3">
        {questions.map((q, idx) => (
          <li
            key={q.questionId}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">Q{idx + 1}</Badge>
              <Badge variant="secondary">{q.type}</Badge>
              <span className="text-xs text-muted-foreground">
                {Number(q.marks)} mark{Number(q.marks) === 1 ? "" : "s"}
              </span>
            </div>
            <p className="font-medium">{q.prompt}</p>

            {q.type === "MCQ_SINGLE" && (
              <div className="mt-3 space-y-2">
                {q.options.map((o) => (
                  <label
                    key={o.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2 transition-colors hover:bg-muted/40"
                  >
                    <input
                      type="radio"
                      name={q.questionId}
                      checked={answers[q.questionId] === o.id}
                      onChange={() =>
                        setAnswers((p) => ({ ...p, [q.questionId]: o.id }))
                      }
                    />
                    <span className="text-sm">{o.text}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === "MCQ_MULTI" && (
              <div className="mt-3 space-y-2">
                {q.options.map((o) => {
                  const current = (answers[q.questionId] as string[]) ?? [];
                  const checked = current.includes(o.id);
                  return (
                    <label
                      key={o.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2 transition-colors hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setAnswers((p) => {
                            const list = ((p[q.questionId] as string[]) ?? []).filter(
                              (id) => id !== o.id
                            );
                            return {
                              ...p,
                              [q.questionId]: e.target.checked ? [...list, o.id] : list,
                            };
                          });
                        }}
                      />
                      <span className="text-sm">{o.text}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === "NUMERICAL" && (
              <div className="mt-3">
                <Input
                  type="number"
                  step="any"
                  value={(answers[q.questionId] as number | string) ?? ""}
                  onChange={(e) =>
                    setAnswers((p) => ({
                      ...p,
                      [q.questionId]:
                        e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  placeholder="Numeric answer"
                />
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="flex justify-end">
        <Button onClick={doSubmit} disabled={submit.isPending}>
          Submit
        </Button>
      </div>
    </div>
  );
}

function ResultView(props: {
  batchId: string;
  quizId: string;
  attempt: QuizAttempt;
  questions: QuizQuestion[];
  passingPercent: number;
  showLeaderboard: boolean;
  showSolutions: boolean;
}) {
  const { batchId, quizId, attempt, questions, passingPercent, showLeaderboard, showSolutions } = props;
  const { data: leaderboard = [] } = useQuizLeaderboard(
    showLeaderboard ? batchId : null,
    showLeaderboard ? quizId : null
  );
  const score = attempt.score ? Number(attempt.score) : 0;
  const max = attempt.maxScore ? Number(attempt.maxScore) : 0;
  const pct = max > 0 ? (score / max) * 100 : 0;
  const passed = pct >= passingPercent;

  return (
    <div className="space-y-4">
      <section
        className={`rounded-2xl border-2 p-6 text-center ${
          passed
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-amber-500/30 bg-amber-500/5"
        }`}
      >
        {passed ? (
          <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
        ) : (
          <XCircle className="mx-auto size-12 text-amber-600" />
        )}
        <p className="mt-3 font-display text-3xl font-semibold">
          {score} / {max}
        </p>
        <p className="text-sm text-muted-foreground">
          {pct.toFixed(1)}% · {passed ? "Passed" : "Below passing"}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Correct</p>
            <p className="font-display text-lg font-semibold text-emerald-600">
              {attempt.correctCount ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Wrong</p>
            <p className="font-display text-lg font-semibold text-destructive">
              {attempt.wrongCount ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Skipped</p>
            <p className="font-display text-lg font-semibold">
              {attempt.skippedCount ?? 0}
            </p>
          </div>
        </div>
      </section>

      {showSolutions && (
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Solutions
          </h3>
          <ol className="space-y-3">
            {questions.map((q, idx) => {
              const userAnswer = attempt.answers[q.questionId];
              return (
                <li
                  key={q.questionId}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <p className="mb-2 font-medium">
                    Q{idx + 1}. {q.prompt}
                  </p>
                  {q.type !== "NUMERICAL" && (
                    <ul className="space-y-1 text-sm">
                      {q.options.map((o) => {
                        const isCorrect =
                          q.type === "MCQ_SINGLE"
                            ? q.correctAnswer === o.id
                            : Array.isArray(q.correctAnswer) &&
                              (q.correctAnswer as string[]).includes(o.id);
                        const isUserSel =
                          q.type === "MCQ_SINGLE"
                            ? userAnswer === o.id
                            : Array.isArray(userAnswer) &&
                              userAnswer.includes(o.id);
                        return (
                          <li
                            key={o.id}
                            className={`flex items-center gap-2 rounded-md px-2 py-1 ${
                              isCorrect
                                ? "bg-emerald-500/10"
                                : isUserSel
                                  ? "bg-destructive/10"
                                  : ""
                            }`}
                          >
                            <span
                              className={
                                isCorrect
                                  ? "size-2 rounded-full bg-emerald-500"
                                  : isUserSel
                                    ? "size-2 rounded-full bg-destructive"
                                    : "size-2 rounded-full bg-muted-foreground/30"
                              }
                            />
                            <span>{o.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {q.type === "NUMERICAL" && (
                    <p className="text-sm">
                      Your answer:{" "}
                      <span className="font-medium">{String(userAnswer ?? "—")}</span>
                      {" · "}
                      Correct:{" "}
                      <span className="font-medium text-emerald-600">
                        {(q.correctAnswer as { value: number }).value}
                      </span>
                    </p>
                  )}
                  {q.explanation && (
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      {q.explanation}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {showLeaderboard && leaderboard.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 font-display text-base font-medium">
            <Trophy className="size-4 text-amber-500" />
            Leaderboard
          </h3>
          <ol className="space-y-2">
            {leaderboard.map((row) => (
              <li
                key={row.userId}
                className="flex items-center justify-between rounded-lg border border-border/60 p-2"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-mono text-sm font-semibold">
                    {row.rank}
                  </span>
                  <span className="text-sm">{row.name}</span>
                </div>
                <span className="font-mono text-sm">
                  {row.score} / {row.maxScore}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export default function LearnerQuizPage(props: {
  params: Promise<{ slug: string; quizId: string }>;
}) {
  const { slug, quizId } = use(props.params);
  const { data: batch } = useBatchBySlug(slug);
  const { data: quiz, isLoading } = useBatchQuiz(batch?.batchId ?? null, quizId);
  const startAttempt = useStartQuizAttempt(batch?.batchId ?? "", quizId);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);

  const start = useCallback(async () => {
    if (!batch) return;
    try {
      const a = await startAttempt.mutateAsync();
      setAttempt(a);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start";
      toast.error(msg);
    }
  }, [batch, startAttempt]);

  const sortedQuestions = useMemo(
    () => (quiz ? [...quiz.questions].sort((a, b) => a.order - b.order) : []),
    [quiz]
  );

  if (isLoading || !batch) {
    return (
      <PageLayout header="Loading quiz…">
        <Skeleton className="h-48 w-full" />
      </PageLayout>
    );
  }

  if (!quiz) {
    return (
      <PageLayout header="Not found">
        <EmptyState title="Quiz not found" />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      subtitle="Test"
      header={quiz.title}
      description={quiz.description ?? `${quiz.durationMinutes} min, max ${quiz.maxAttempts} attempts`}
    >
      <div className="-mt-4 mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href={`/batches/${slug}`}>
            <ArrowLeft className="size-3.5 mr-1.5" />
            Back to batch
          </Link>
        </Button>
      </div>

      {!attempt ? (
        quiz.myBestAttempt && quiz.myBestAttempt.submittedAt ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Your best attempt</p>
            <p className="mt-1 font-display text-3xl font-semibold">
              {quiz.myBestAttempt.score} / {quiz.myBestAttempt.maxScore}
            </p>
            <Button className="mt-4" onClick={start} disabled={startAttempt.isPending}>
              Re-attempt
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <ClipboardList className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-3 font-display text-base font-medium">Ready to start?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {sortedQuestions.length} questions · {quiz.durationMinutes} minutes ·
              {" "}
              {Number(quiz.negativeMarkPercent) > 0
                ? `−${quiz.negativeMarkPercent}% per wrong`
                : "no negative marking"}
            </p>
            <Button className="mt-4" onClick={start} disabled={startAttempt.isPending}>
              Start attempt
            </Button>
          </div>
        )
      ) : attempt.status === "IN_PROGRESS" ? (
        <AttemptView
          batchId={batch.batchId}
          attempt={attempt}
          questions={sortedQuestions}
          onSubmitted={setAttempt}
        />
      ) : (
        <ResultView
          batchId={batch.batchId}
          quizId={quizId}
          attempt={attempt}
          questions={sortedQuestions}
          passingPercent={Number(quiz.passingPercent)}
          showLeaderboard={quiz.showLeaderboard}
          showSolutions={quiz.showSolutions}
        />
      )}
    </PageLayout>
  );
}
