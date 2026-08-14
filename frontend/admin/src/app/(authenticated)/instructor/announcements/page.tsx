"use client";

import { ResourcePage } from "@/components/admin/resource-page";
import { useResourceList } from "@/lib/hooks/use-resource";
import { formatDateTime } from "@/lib/format";

export default function InstructorAnnouncementsPage() {
  const courses = useResourceList("instructor/courses", { limit: 50 });
  const courseOptions = (courses.data?.data ?? []).map((c) => ({
    value: String(c.courseId),
    label: String(c.title),
  }));

  return (
    <ResourcePage
      path="announcements"
      idKey="id"
      subtitle="Teaching"
      title="Course announcements"
      description="Message everyone enrolled on a course. Announcements land in their dashboard and inbox."
      noun="announcement"
      searchPlaceholder="Search announcements…"
      columns={[
        { key: "title", header: "Title" },
        { key: "courseTitle", header: "Course" },
        {
          key: "sentTo",
          header: "Recipients",
          render: (row) => Number(row.sentTo ?? 0).toLocaleString("en-IN"),
        },
        {
          key: "createdAt",
          header: "Sent",
          render: (row) => formatDateTime(String(row.createdAt ?? "")),
        },
      ]}
      fields={[
        {
          key: "courseId",
          label: "Course",
          type: "select",
          required: true,
          options: courseOptions,
        },
        { key: "title", label: "Title", type: "text", required: true },
        {
          key: "body",
          label: "Message",
          type: "textarea",
          required: true,
          help: "Keep it short and say what the learner needs to do.",
        },
      ]}
      filters={
        courseOptions.length > 0
          ? [{ key: "courseId", label: "courses", options: courseOptions }]
          : []
      }
    />
  );
}
