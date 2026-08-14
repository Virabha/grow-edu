"use client";

import { ResourcePage } from "@/components/admin/resource-page";

export default function WithdrawMethodsPage() {
  return (
    <ResourcePage
      path="withdraw-methods"
      idKey="id"
      subtitle="Payouts"
      title="Withdraw methods"
      description="How instructors can take their earnings out."
      noun="method"
      searchPlaceholder="Search methods…"
      columns={[
        { key: "name", header: "Method" },
        { key: "minAmount", header: "Minimum" },
        { key: "maxAmount", header: "Maximum" },
        { key: "processingDays", header: "Days" },
        { key: "feePercent", header: "Fee %" },
        { key: "isActive", header: "Active" },
      ]}
      fields={[
        { key: "name", label: "Method", type: "text", required: true },
        { key: "description", label: "Description", type: "textarea" },
        { key: "minAmount", label: "Minimum amount", type: "number", required: true },
        { key: "maxAmount", label: "Maximum amount", type: "number" },
        { key: "processingDays", label: "Processing days", type: "number" },
        { key: "feePercent", label: "Fee (%)", type: "number" },
        { key: "isActive", label: "Active", type: "boolean" },
      ]}
      filters={[]}
    />
  );
}
