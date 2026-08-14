"use client";

import { ResourcePage } from "@/components/admin/resource-page";

export default function SubscribersPage() {
  return (
    <ResourcePage
      path="subscribers"
      idKey="id"
      subtitle="Marketing"
      title="Subscribers"
      description="People who signed up for the newsletter."
      noun="subscriber"
      searchPlaceholder="Search subscribers…"
      columns={[
        { key: "email", header: "Email" },
        { key: "source", header: "Source" },
        { key: "subscribedAt", header: "Subscribed" },
        { key: "lastEmailAt", header: "Last email" },
        { key: "isActive", header: "Subscribed" },
      ]}
      fields={[
        { key: "email", label: "Email", type: "text", required: true },
        { key: "source", label: "Source", type: "text" },
        { key: "isActive", label: "Subscribed", type: "boolean" },
      ]}
      filters={[
        { key: "isActive", label: "status", options: [{ value: "true", label: "Subscribed" }, { value: "false", label: "Unsubscribed" }] },
      ]}
    />
  );
}
