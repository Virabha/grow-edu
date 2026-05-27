"use client";

import Link from "next/link";
import { use, useState } from "react";
import { toast } from "sonner";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ArrowLeft,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useBatchQuiz,
  useDeleteQuizQuestion,
} from "@/features/batches/hooks/use-batches";
import { QuestionFormDialog } from "@/features/batches/components/question-form-dialog";
import type { QuizQuestion } from "@/features/batches/types";

export default function AdminQuizDetailPage(props: {
  params: Promise<{ batchId: string; quizId: string }>;
}) {
  const { batchId, quizId } = use(props.params);
  const { data: quiz, isLoading } = useBatchQuiz(batchId, quizId);
  const deleteQuestion = useDeleteQuizQuestion(batchId, quizId);
  const [questionFormOpen, setQuestionFormOpen] = useState(false);
  const [editing, setEditing] = useState<QuizQuestion | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<QuizQuestion | null>(null);

  if (isLoading) {
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

  const nextOrder = (quiz.questions[quiz.questions.length - 1]?.order ?? -1) + 1;
  const totalMarks = quiz.questions.reduce((s, q) => s + Number(q.marks), 0);

  return (
    <PageLayout
      subtitle="Quiz"
      header={quiz.title}
      description={quiz.description ?? "Manage questions"}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/batches/${batchId}`}>
            <ArrowLeft className="size-3.5 mr-1.5" />
            Back to batch
          </Link>
        </Button>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Duration
          </p>
          <p className="mt-1 font-display text-lg font-semibold">{quiz.durationMinutes} min</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Questions
          </p>
          <p className="mt-1 font-display text-lg font-semibold">{quiz.questions.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Total marks
          </p>
          <p className="mt-1 font-display text-lg font-semibold">{totalMarks}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Status
          </p>
          <p className="mt-1 font-display text-lg font-semibold">
            {quiz.publishedAt ? "Published" : "Draft"}
          </p>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-medium">Questions</h2>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setQuestionFormOpen(true);
          }}
        >
          <Plus className="size-3.5 mr-1.5" />
          Add question
        </Button>
      </div>

      {quiz.questions.length === 0 ? (
        <EmptyState
          title="No questions yet"
          description="Add MCQ or numerical questions."
          icon={<ClipboardList className="h-10 w-10" />}
        />
      ) : (
        <ol className="space-y-3">
          {quiz.questions.map((q, idx) => (
            <li
              key={q.questionId}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Q{idx + 1}</Badge>
                    <Badge variant="secondary">{q.type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {Number(q.marks)} mark{Number(q.marks) === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-2 font-medium">{q.prompt}</p>
                  {q.type !== "NUMERICAL" && q.options && q.options.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {q.options.map((o) => {
                        const isCorrect =
                          q.type === "MCQ_SINGLE"
                            ? q.correctAnswer === o.id
                            : Array.isArray(q.correctAnswer) &&
                              (q.correctAnswer as string[]).includes(o.id);
                        return (
                          <li key={o.id} className="flex items-center gap-2">
                            <span
                              className={
                                isCorrect
                                  ? "size-2 rounded-full bg-emerald-500"
                                  : "size-2 rounded-full bg-muted-foreground/30"
                              }
                            />
                            <span className={isCorrect ? "text-foreground" : ""}>
                              {o.text}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {q.type === "NUMERICAL" && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Answer:{" "}
                      <span className="text-foreground">
                        {(q.correctAnswer as { value: number }).value}
                      </span>
                      {(q.correctAnswer as { tolerance?: number }).tolerance ? (
                        <>
                          {" "}
                          ± {(q.correctAnswer as { tolerance: number }).tolerance}
                        </>
                      ) : null}
                    </p>
                  )}
                  {q.explanation && (
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      {q.explanation}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(q);
                      setQuestionFormOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setConfirmDelete(q)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <QuestionFormDialog
        batchId={batchId}
        quizId={quizId}
        open={questionFormOpen}
        onOpenChange={setQuestionFormOpen}
        question={editing}
        nextOrder={nextOrder}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete question"
        description="This cannot be undone."
        onConfirm={() => {
          if (confirmDelete) {
            deleteQuestion.mutate(confirmDelete.questionId, {
              onSuccess: () => toast.success("Question deleted"),
            });
          }
        }}
        confirmText="Delete"
        variant="destructive"
      />
    </PageLayout>
  );
}
