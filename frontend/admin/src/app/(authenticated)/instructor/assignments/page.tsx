"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { ResourcePage } from "@/components/admin/resource-page";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/admin/status-pill";
import { useResourceList } from "@/lib/hooks/use-resource";
import { formatDate } from "@/lib/format";

const SUBMISSION_TYPES = [
  { value: "FILE", label: "File upload" },
  { value: "TEXT", label: "Written answer" },
  { value: "LINK", label: "External link" },
];

export default function InstructorAssignmentsPage() {
  const courses = useResourceList("instructor/courses", { limit: 50 });
  const courseOptions = (courses.data?.data ?? []).map((c) => ({
    value: String(c.courseId),
    label: String(c.title),
  }));

  return (
    <ResourcePage
      path="assignments"
      idKey="id"
      subtitle="Teaching"
      title="Assignments"
      description="Work you set for learners, how they submit it, and how far grading has got."
      noun="assignment"
      searchPlaceholder="Search assignments…"
      columns={[
        { key: "title", header: "Assignment" },
        { key: "courseTitle", header: "Course" },
        { key: "submissionType", header: "Submit as" },
        {
          key: "dueAt",
          header: "Due",
          render: (row) => formatDate(String(row.dueAt ?? "")),
        },
        {
          key: "submissions",
          header: "Grading",
          render: (row) => {
            const total = Number(row.submissions ?? 0);
            const done = Number(row.graded ?? 0);
            const percent = total === 0 ? 0 : Math.round((done / total) * 100);
            return (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {done}/{total}
                </span>
              </div>
            );
          },
        },
        {
          key: "isPublished",
          header: "Status",
          render: (row) => (
            <StatusPill value={row.isPublished ? "PUBLISHED" : "DRAFT"} />
          ),
        },
      ]}
      fields={[
        { key: "title", label: "Assignment title", type: "text", required: true },
        { key: "courseId", label: "Course", type: "select", required: true, options: courseOptions },
        { key: "instructions", label: "Instructions", type: "textarea", required: true, help: "Say exactly what a complete submission looks like." },
        { key: "submissionType", label: "Submit as", type: "select", required: true, options: SUBMISSION_TYPES },
        { key: "maxMarks", label: "Maximum marks", type: "number", required: true },
        { key: "passMarks", label: "Pass mark", type: "number", required: true },
        { key: "dueAt", label: "Due date", type: "text", placeholder: "2026-09-01T18:30:00.000Z" },
        { key: "allowResubmission", label: "Allow resubmission after grading", type: "boolean" },
        { key: "isPublished", label: "Visible to learners", type: "boolean" },
      ]}
      filters={[{ key: "submissionType", label: "types", options: SUBMISSION_TYPES }]}
      defaults={{ submissions: 0, graded: 0 }}
      extraActions={
        <Button asChild variant="outline" size="sm">
          <Link href="/instructor/assignments/submissions">
            <ClipboardList className="mr-1.5 h-4 w-4" />
            Submissions
          </Link>
        </Button>
      }
    />
  );
}
