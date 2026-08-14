"use client";

import { ResourcePage } from "@/components/admin/resource-page";

export default function BlogPostsPage() {
  return (
    <ResourcePage
      path="blog/posts"
      idKey="id"
      subtitle="Blog"
      title="Blog posts"
      description="Write and publish articles for the public site."
      noun="post"
      searchPlaceholder="Search posts…"
      columns={[
        { key: "title", header: "Title" },
        { key: "categoryName", header: "Category" },
        { key: "authorName", header: "Author" },
        { key: "status", header: "Status" },
        { key: "views", header: "Views" },
        { key: "publishedAt", header: "Published" },
      ]}
      fields={[
        { key: "title", label: "Title", type: "text", required: true },
        { key: "slug", label: "Slug", type: "text", required: true },
        { key: "excerpt", label: "Excerpt", type: "textarea" },
        { key: "content", label: "Content", type: "textarea" },
        { key: "authorName", label: "Author", type: "text" },
        { key: "status", label: "Status", type: "select", options: [{ value: "DRAFT", label: "Draft" }, { value: "PUBLISHED", label: "Published" }] },
      ]}
      filters={[
        { key: "status", label: "status", options: [{ value: "PUBLISHED", label: "Published" }, { value: "DRAFT", label: "Draft" }] },
      ]}
    />
  );
}
