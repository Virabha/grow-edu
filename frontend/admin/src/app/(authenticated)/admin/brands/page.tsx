"use client";

import { ResourcePage } from "@/components/admin/resource-page";

export default function BrandsPage() {
  return (
    <ResourcePage
      path="brands"
      idKey="id"
      subtitle="Appearance"
      title="Brands"
      description="Partner and employer logos shown on the marketing site."
      noun="brand"
      searchPlaceholder="Search brands…"
      columns={[
        { key: "name", header: "Brand" },
        { key: "websiteUrl", header: "Website" },
        { key: "displayOrder", header: "Order" },
        { key: "isActive", header: "Visible" },
      ]}
      fields={[
        { key: "name", label: "Brand", type: "text", required: true },
        { key: "logoUrl", label: "Logo URL", type: "text" },
        { key: "websiteUrl", label: "Website", type: "text" },
        { key: "displayOrder", label: "Display order", type: "number" },
        { key: "isActive", label: "Visible", type: "boolean" },
      ]}
      filters={[]}
    />
  );
}
