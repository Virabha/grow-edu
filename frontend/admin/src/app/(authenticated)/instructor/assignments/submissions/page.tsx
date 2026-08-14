"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/admin/status-pill";
import {
  useResourceList, useUpdateResource, type ResourceRow,
} from "@/lib/hooks/use-resource";
import { formatDateTime } from "@/lib/format";

export default function AssignmentSubmissionsPage() {
  const [status, setStatus] = React.useState("all");
  const [grading, setGrading] = React.useState<ResourceRow | null>(null);
  const [marks, setMarks] = React.useState("");
  const [feedback, setFeedback] = React.useState("");

  const { data, isLoading } = useResourceList("assignment-submissions", {
    status, limit: 25,
  });
  const update = useUpdateResource("assignment-submissions");
  const rows = data?.data ?? [];
  const ungraded = rows.filter((r) => r.status === "SUBMITTED").length;

  function openGrading(row: ResourceRow) {
    setGrading(row);
    setMarks(row.marks === null || row.marks === undefined ? "" : String(row.marks));
    setFeedback(String(row.feedback ?? ""));
  }

  function submitGrade(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!grading) return;
    const value = Number(marks);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter the marks awarded.");
      return;
    }
    if (feedback.trim().length < 5) {
      toast.error("Leave feedback the learner can act on.");
      return;
    }
    update.mutate(
      { id: String(grading.id), marks: value, feedback: feedback.trim(), status: "GRADED" },
      {
        onSuccess: () => {
          toast.success(`Graded ${String(grading.learnerName)}`);
          setGrading(null);
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Could not save the grade"),
      },
    );
  }

  return (
    <PageLayout
      subtitle="Teaching"
      header="Assignment submissions"
      description="What learners have handed in, and what still needs marking."
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/instructor/assignments">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Assignments
          </Link>
        </Button>
      }
      filters={
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[200px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All submissions</SelectItem>
              <SelectItem value="SUBMITTED">Awaiting grading</SelectItem>
              <SelectItem value="GRADED">Graded</SelectItem>
              <SelectItem value="RESUBMIT">Resubmission asked</SelectItem>
            </SelectContent>
          </Select>
          {ungraded > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{ungraded}</span> waiting to be marked
            </p>
          )}
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nothing submitted"
          description="Submissions appear here as learners hand work in."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Attempt</TableHead>
                <TableHead className="text-right">Marks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={String(row.id)}>
                  <TableCell>
                    <p className="font-medium">{String(row.learnerName ?? "")}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {String(row.learnerEmail ?? "")}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {String(row.assignmentTitle ?? "")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(String(row.submittedAt ?? ""))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(row.attempt ?? 1)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.marks === null || row.marks === undefined ? "—" : String(row.marks)}
                  </TableCell>
                  <TableCell>
                    <StatusPill value={String(row.status ?? "")} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={row.status === "SUBMITTED" ? "default" : "outline"}
                      className="h-8 text-xs"
                      onClick={() => openGrading(row)}
                    >
                      {row.status === "SUBMITTED" ? "Grade" : "Review"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <FormSheet
        open={!!grading}
        onOpenChange={(open) => !open && setGrading(null)}
        title="Grade submission"
        description={
          grading
            ? `${String(grading.learnerName)} — ${String(grading.assignmentTitle)}`
            : ""
        }
        onSubmit={submitGrade}
        submitLabel="Save grade"
        submitting={update.isPending}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="grade-marks">Marks awarded</Label>
            <Input
              id="grade-marks"
              type="number"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grade-feedback">Feedback</Label>
            <Textarea
              id="grade-feedback"
              rows={5}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What was strong, and the one thing to change next time."
            />
          </div>
        </div>
      </FormSheet>
    </PageLayout>
  );
}
