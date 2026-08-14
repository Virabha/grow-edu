"use client";

import { useResourceList } from "@/lib/hooks/use-resource";
import { ResourcePage } from "@/components/admin/resource-page";
import { StatusPill } from "@/components/admin/status-pill";
import { formatRelative } from "@/lib/format";

export default function AdminsPage() {
  // Roles drive the picker on the form, so a new role is immediately usable.
  const roles = useResourceList("admin-roles", { limit: 50 });
  const roleOptions = (roles.data?.data ?? []).map((role) => ({
    value: String(role.id),
    label: String(role.name),
  }));

  return (
    <ResourcePage
      path="admins"
      idKey="id"
      subtitle="Access"
      title="Admins and roles"
      description="People with access to this dashboard. The main admin account cannot be removed."
      noun="admin"
      searchPlaceholder="Search admins…"
      columns={[
        { key: "name", header: "Name" },
        { key: "email", header: "Email" },
        { key: "roleName", header: "Role" },
        {
          key: "lastLoginAt",
          header: "Last seen",
          render: (row) =>
            row.lastLoginAt ? formatRelative(String(row.lastLoginAt)) : "Never",
        },
        {
          key: "isActive",
          header: "Status",
          render: (row) => (
            <StatusPill value={row.isActive ? "ACTIVE" : "REVOKED"} />
          ),
        },
      ]}
      fields={[
        { key: "name", label: "Full name", type: "text", required: true },
        { key: "email", label: "Email", type: "text", required: true },
        {
          key: "roleId",
          label: "Role",
          type: "select",
          required: true,
          options: roleOptions,
          help: "Roles are managed on the Roles and permissions screen.",
        },
        { key: "isActive", label: "Can sign in", type: "boolean" },
      ]}
      filters={[
        {
          key: "isActive",
          label: "status",
          options: [
            { value: "true", label: "Active" },
            { value: "false", label: "Suspended" },
          ],
        },
      ]}
    />
  );
}
