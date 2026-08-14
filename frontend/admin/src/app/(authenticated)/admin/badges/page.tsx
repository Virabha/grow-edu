"use client";

import { ResourcePage } from "@/components/admin/resource-page";

export default function BadgesPage() {
  return (
    <ResourcePage
      path="badges"
      idKey="id"
      subtitle="People"
      title="Instructor badges"
      description="Recognition awarded to instructors who hit a threshold."
      noun="badge"
      searchPlaceholder="Search badges…"
      columns={[
        { key: "name", header: "Name" },
        { key: "description", header: "Description" },
        { key: "criteriaType", header: "Criteria" },
        { key: "criteriaValue", header: "Threshold" },
        { key: "awardedCount", header: "Awarded" },
        { key: "isActive", header: "Active" },
      ]}
      fields={[
        { key: "name", label: "Name", type: "text", required: true },
        { key: "description", label: "Description", type: "textarea", required: true },
        { key: "icon", label: "Icon name", type: "text" },
        { key: "colour", label: "Colour", type: "colour" },
        { key: "criteriaType", label: "Criteria", type: "select", required: true, options: [{ value: "RATING", label: "Average rating" }, { value: "ENROLMENTS", label: "Total enrolments" }, { value: "COURSES", label: "Published courses" }, { value: "MANUAL", label: "Awarded manually" }] },
        { key: "criteriaValue", label: "Threshold", type: "number" },
        { key: "isActive", label: "Active", type: "boolean" },
      ]}
      filters={[
        { key: "isActive", label: "status", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }] },
      ]}
    />
  );
}
