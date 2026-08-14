"use client";

import { ResourcePage } from "@/components/admin/resource-page";

export default function CourseLanguagesPage() {
  return (
    <ResourcePage
      path="course-languages"
      idKey="id"
      subtitle="Catalogue"
      title="Course languages"
      description="Languages a course can be taught in."
      noun="language"
      searchPlaceholder="Search languages…"
      columns={[
        { key: "name", header: "Language" },
        { key: "code", header: "Code" },
        { key: "courseCount", header: "Courses" },
        { key: "displayOrder", header: "Order" },
        { key: "isActive", header: "Active" },
      ]}
      fields={[
        { key: "name", label: "Language", type: "text", required: true },
        { key: "code", label: "ISO code", type: "text", required: true },
        { key: "displayOrder", label: "Display order", type: "number" },
        { key: "isActive", label: "Active", type: "boolean" },
      ]}
      filters={[]}
    />
  );
}
