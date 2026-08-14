"use client";

import { ResourcePage } from "@/components/admin/resource-page";

export default function LocationsPage() {
  return (
    <ResourcePage
      path="locations"
      idKey="id"
      subtitle="Platform"
      title="Locations"
      description="Countries learners can select, with their dial code and currency."
      noun="country"
      searchPlaceholder="Search countrys…"
      columns={[
        { key: "name", header: "Country" },
        { key: "code", header: "Code" },
        { key: "dialCode", header: "Dial code" },
        { key: "currency", header: "Currency" },
        { key: "learnerCount", header: "Learners" },
        { key: "isActive", header: "Active" },
      ]}
      fields={[
        { key: "name", label: "Country", type: "text", required: true },
        { key: "code", label: "ISO code", type: "text", required: true },
        { key: "dialCode", label: "Dial code", type: "text" },
        { key: "currency", label: "Currency", type: "text" },
        { key: "isActive", label: "Active", type: "boolean" },
      ]}
      filters={[
        { key: "isActive", label: "status", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }] },
      ]}
    />
  );
}
