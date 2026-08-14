"use client";

import { ResourcePage } from "@/components/admin/resource-page";

export default function CurrenciesPage() {
  return (
    <ResourcePage
      path="currencies"
      idKey="id"
      subtitle="Commerce"
      title="Multi-currency"
      description="Currencies learners can pay in, and their conversion rate."
      noun="currency"
      searchPlaceholder="Search currencys…"
      columns={[
        { key: "name", header: "Currency" },
        { key: "code", header: "Code" },
        { key: "symbol", header: "Symbol" },
        { key: "rate", header: "Rate to INR" },
        { key: "isDefault", header: "Default" },
        { key: "isActive", header: "Active" },
      ]}
      fields={[
        { key: "name", label: "Currency", type: "text", required: true },
        { key: "code", label: "Code", type: "text", required: true },
        { key: "symbol", label: "Symbol", type: "text", required: true },
        { key: "rate", label: "Rate against INR", type: "number", required: true },
        { key: "position", label: "Symbol position", type: "select", options: [{ value: "before", label: "Before the amount" }, { value: "after", label: "After the amount" }] },
        { key: "isActive", label: "Active", type: "boolean" },
      ]}
      filters={[]}
    />
  );
}
