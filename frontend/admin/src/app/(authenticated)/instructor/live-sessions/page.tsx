"use client";

import { ExternalLink } from "lucide-react";

import { ResourcePage } from "@/components/admin/resource-page";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/admin/status-pill";
import { useResourceList } from "@/lib/hooks/use-resource";
import { formatDateTime } from "@/lib/format";

const PROVIDERS = [
  { value: "ZOOM", label: "Zoom" },
  { value: "JITSI", label: "Jitsi" },
  { value: "GOOGLE_MEET", label: "Google Meet" },
];

export default function InstructorLiveSessionsPage() {
  const courses = useResourceList("instructor/courses", { limit: 50 });
  const courseOptions = (courses.data?.data ?? []).map((c) => ({
    value: String(c.courseId),
    label: String(c.title),
  }));

  return (
    <ResourcePage
      path="live-sessions"
      idKey="id"
      subtitle="Teaching"
      title="Live sessions"
      description="Scheduled live classes. Learners see the join link on the course page when it goes live."
      noun="session"
      searchPlaceholder="Search sessions…"
      columns={[
        { key: "title", header: "Session" },
        { key: "courseTitle", header: "Course" },
        { key: "provider", header: "Platform" },
        {
          key: "startsAt",
          header: "Starts",
          render: (row) => formatDateTime(String(row.startsAt ?? "")),
        },
        {
          key: "durationMinutes",
          header: "Length",
          render: (row) => `${Number(row.durationMinutes ?? 0)} min`,
        },
        {
          key: "registeredCount",
          header: "Registered",
          render: (row) => Number(row.registeredCount ?? 0).toLocaleString("en-IN"),
        },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusPill value={String(row.status ?? "")} />,
        },
      ]}
      fields={[
        { key: "title", label: "Session title", type: "text", required: true },
        {
          key: "courseId",
          label: "Course",
          type: "select",
          required: true,
          options: courseOptions,
        },
        {
          key: "provider",
          label: "Platform",
          type: "select",
          required: true,
          options: PROVIDERS,
          help: "Configure credentials under Zoom or Jitsi settings first.",
        },
        { key: "startsAt", label: "Starts at", type: "text", required: true, placeholder: "2026-08-20T13:30:00.000Z" },
        { key: "durationMinutes", label: "Duration (minutes)", type: "number", required: true },
        { key: "joinUrl", label: "Join link", type: "text" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "SCHEDULED", label: "Scheduled" },
            { value: "LIVE", label: "Live now" },
            { value: "COMPLETED", label: "Completed" },
            { value: "CANCELLED", label: "Cancelled" },
          ],
        },
      ]}
      filters={[{ key: "provider", label: "platforms", options: PROVIDERS }]}
      defaults={{ status: "SCHEDULED", registeredCount: 0 }}
      rowActions={(row) =>
        row.joinUrl ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            asChild
            aria-label={`Open the join link for ${String(row.title)}`}
          >
            <a href={String(row.joinUrl)} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : null
      }
    />
  );
}
