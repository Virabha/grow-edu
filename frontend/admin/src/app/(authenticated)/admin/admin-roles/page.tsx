"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Lock, Pencil, Plus, Shield, Trash2 } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api/client";
import {
  useCreateResource,
  useDeleteResource,
  useResourceList,
  useUpdateResource,
  type ResourceRow,
} from "@/lib/hooks/use-resource";
import { cn } from "@/lib/utils";

interface PermissionGroup {
  group: string;
  items: string[];
}

interface Draft {
  id?: string;
  name: string;
  description: string;
  permissions: string[];
}

const EMPTY: Draft = { name: "", description: "", permissions: [] };

export default function AdminRolesPage() {
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<ResourceRow | null>(null);

  const roles = useResourceList("admin-roles", { limit: 50 });
  const create = useCreateResource("admin-roles");
  const update = useUpdateResource("admin-roles");
  const remove = useDeleteResource("admin-roles");

  const permissions = useQuery({
    queryKey: ["permissions"],
    queryFn: () =>
      apiClient.get<PermissionGroup[]>("/permissions").then((r) => r.data),
  });

  const rows = roles.data?.data ?? [];
  const saving = create.isPending || update.isPending;

  function toggle(permission: string) {
    if (!draft) return;
    const has = draft.permissions.includes(permission);
    setDraft({
      ...draft,
      permissions: has
        ? draft.permissions.filter((p) => p !== permission)
        : [...draft.permissions, permission],
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Give the role a name.");
      return;
    }
    if (draft.permissions.length === 0) {
      toast.error("A role needs at least one permission.");
      return;
    }

    const body = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      permissions: draft.permissions,
      isSystem: false,
      memberCount: 0,
    };
    const done = {
      onSuccess: () => {
        toast.success(draft.id ? "Role updated" : "Role created");
        setDraft(null);
      },
      onError: (err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Could not save the role"),
    };

    if (draft.id) update.mutate({ ...body, id: draft.id }, done);
    else create.mutate(body, done);
  }

  return (
    <PageLayout
      subtitle="Access"
      header="Roles and permissions"
      description="What each group of admins is allowed to do. System roles cannot be edited or removed."
      actions={
        <Button size="sm" onClick={() => setDraft({ ...EMPTY })}>
          <Plus className="mr-1.5 h-4 w-4" />
          New role
        </Button>
      }
    >
      {roles.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((role) => {
            const perms = Array.isArray(role.permissions)
              ? (role.permissions as string[])
              : [];
            const isSystem = role.isSystem === true;
            return (
              <Card key={String(role.id)}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-1.5 text-sm">
                      {isSystem ? (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {String(role.name)}
                    </CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {String(role.description ?? "")}
                    </p>
                  </div>
                  {!isSystem && (
                    <div className="flex shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Edit ${String(role.name)}`}
                        onClick={() =>
                          setDraft({
                            id: String(role.id),
                            name: String(role.name ?? ""),
                            description: String(role.description ?? ""),
                            permissions: perms,
                          })
                        }
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        aria-label={`Delete ${String(role.name)}`}
                        onClick={() => setPendingDelete(role)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {Number(role.memberCount ?? 0)}
                    </span>{" "}
                    {Number(role.memberCount ?? 0) === 1 ? "member" : "members"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {perms.includes("*") ? (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        Full access
                      </span>
                    ) : (
                      perms.slice(0, 6).map((permission) => (
                        <span
                          key={permission}
                          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                        >
                          {permission}
                        </span>
                      ))
                    )}
                    {perms.length > 6 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{perms.length - 6} more
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <FormSheet
        open={!!draft}
        onOpenChange={(open) => !open && setDraft(null)}
        title={draft?.id ? "Edit role" : "New role"}
        description="Choose exactly what this group of admins can reach."
        onSubmit={submit}
        submitLabel={draft?.id ? "Save role" : "Create role"}
        submitting={saving}
        size="lg"
      >
        {draft && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">Role name</Label>
              <Input
                id="role-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Content Manager"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-desc">Description</Label>
              <Textarea
                id="role-desc"
                rows={2}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                placeholder="What this role is for."
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Permissions</Label>
                <span className="text-xs text-muted-foreground">
                  {draft.permissions.length} selected
                </span>
              </div>

              {permissions.isLoading ? (
                <Skeleton className="h-40 w-full rounded-md" />
              ) : (
                (permissions.data ?? []).map((group) => (
                  <fieldset
                    key={group.group}
                    className="rounded-lg border border-border p-3"
                  >
                    <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {group.group}
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.items.map((permission) => {
                        const checked = draft.permissions.includes(permission);
                        return (
                          <label
                            key={permission}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors",
                              checked
                                ? "border-primary/50 bg-primary/5"
                                : "border-transparent hover:bg-accent/50",
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggle(permission)}
                            />
                            <span className="font-mono text-xs">{permission}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ))
              )}
            </div>
          </div>
        )}
      </FormSheet>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this role?"
        description={`Admins assigned to "${String(pendingDelete?.name ?? "")}" will lose their permissions until you reassign them.`}
        confirmText="Delete role"
        variant="destructive"
        onConfirm={() => {
          if (!pendingDelete) return;
          remove.mutate(String(pendingDelete.id), {
            onSuccess: () => {
              toast.success("Role deleted");
              setPendingDelete(null);
            },
          });
        }}
      />
    </PageLayout>
  );
}
