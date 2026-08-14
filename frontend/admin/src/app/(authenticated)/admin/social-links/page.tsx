"use client";

import { ResourcePage } from "@/components/admin/resource-page";

export default function SocialLinksPage() {
  return (
    <ResourcePage
      path="social-links"
      idKey="id"
      subtitle="Appearance"
      title="Social links"
      description="Profiles linked from the header and footer."
      noun="link"
      searchPlaceholder="Search links…"
      columns={[
        { key: "platform", header: "Platform" },
        { key: "url", header: "URL" },
        { key: "displayOrder", header: "Order" },
        { key: "isActive", header: "Visible" },
      ]}
      fields={[
        { key: "platform", label: "Platform", type: "text", required: true },
        { key: "url", label: "URL", type: "text" },
        { key: "icon", label: "Icon name", type: "text" },
        { key: "displayOrder", label: "Display order", type: "number" },
        { key: "isActive", label: "Visible", type: "boolean" },
      ]}
      filters={[]}
    />
  );
}
