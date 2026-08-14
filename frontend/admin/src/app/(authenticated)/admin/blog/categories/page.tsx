"use client";

import { ResourcePage } from "@/components/admin/resource-page";

export default function BlogCategoriesPage() {
  return (
    <ResourcePage
      path="blog/categories"
      idKey="id"
      subtitle="Blog"
      title="Blog categories"
      description="Group posts so readers can browse by topic."
      noun="category"
      searchPlaceholder="Search categorys…"
      columns={[
        { key: "name", header: "Name" },
        { key: "slug", header: "Slug" },
        { key: "postCount", header: "Posts" },
        { key: "displayOrder", header: "Order" },
        { key: "isActive", header: "Active" },
      ]}
      fields={[
        { key: "name", label: "Name", type: "text", required: true },
        { key: "slug", label: "Slug", type: "text", required: true },
        { key: "displayOrder", label: "Display order", type: "number" },
        { key: "isActive", label: "Active", type: "boolean" },
      ]}
      filters={[
        { key: "isActive", label: "status", options: [{ value: "true", label: "Active" }, { value: "false", label: "Hidden" }] },
      ]}
    />
  );
}
