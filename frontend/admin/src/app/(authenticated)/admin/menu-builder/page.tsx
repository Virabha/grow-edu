"use client";

import * as React from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { apiClient } from "@/lib/api/client";
import {
  useCreateResource,
  useDeleteResource,
  useResourceList,
  useUpdateResource,
  type ResourceRow,
} from "@/lib/hooks/use-resource";
import { getApiError } from "@/lib/api/errors";

const MENUS = [
  { key: "header", label: "Header menu", hint: "The main navigation across the top." },
  { key: "footer-1", label: "Footer column 1", hint: "Usually company links." },
  { key: "footer-2", label: "Footer column 2", hint: "Usually legal links." },
  { key: "footer-3", label: "Footer column 3", hint: "Usually support links." },
];

interface Draft {
  menu: string;
  id?: string;
  label: string;
  url: string;
  openInNewTab: boolean;
  isActive: boolean;
}

const EMPTY: Draft = {
  menu: "header",
  label: "",
  url: "",
  openInNewTab: false,
  isActive: true,
};

export default function MenuBuilderPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<ResourceRow | null>(null);

  const { data, isLoading } = useResourceList("menu-items", { limit: 100 });
  const create = useCreateResource("menu-items");
  const update = useUpdateResource("menu-items");
  const remove = useDeleteResource("menu-items");

  const reorder = useMutation({
    mutationFn: (order: string[]) =>
      apiClient.post("/menu-items/reorder", { order }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu-items"] }),
  });

  const items = data?.data ?? [];
  const saving = create.isPending || update.isPending;

  function itemsFor(menu: string) {
    return items
      .filter((i) => i.menu === menu)
      .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0));
  }

  function move(menu: string, index: number, direction: -1 | 1) {
    const list = itemsFor(menu);
    const target = index + direction;
    const a = list[index];
    const b = list[target];
    if (!a || !b) return;
    const next = [...list];
    next[index] = b;
    next[target] = a;
    reorder.mutate(next.map((i) => String(i.id)));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    if (!draft.label.trim() || !draft.url.trim()) {
      toast.error("A menu item needs both a label and a URL.");
      return;
    }

    const body = {
      menu: draft.menu,
      label: draft.label.trim(),
      url: draft.url.trim(),
      openInNewTab: draft.openInNewTab,
      isActive: draft.isActive,
    };

    const done = {
      onSuccess: () => {
        toast.success(draft.id ? "Menu item updated" : "Menu item added");
        setDraft(null);
      },
      onError: (err: unknown) =>
        toast.error(getApiError(err, "Could not save").message),
    };

    if (draft.id) update.mutate({ ...body, id: draft.id }, done);
    else create.mutate({ ...body, displayOrder: itemsFor(draft.menu).length + 1 }, done);
  }

  return (
    <PageLayout
      subtitle="Appearance"
      header="Menu builder"
      description="The four navigation menus on the public site. Reorder items and point them wherever you need."
    >
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2">
          {MENUS.map((menu) => {
            const list = itemsFor(menu.key);
            return (
              <Card key={menu.key}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-sm">{menu.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">{menu.hint}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0 text-xs"
                    onClick={() => setDraft({ ...EMPTY, menu: menu.key })}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add
                  </Button>
                </CardHeader>
                <CardContent>
                  {list.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Nothing in this menu yet.
                    </p>
                  ) : (
                    <ol className="divide-y divide-border">
                      {list.map((item, index) => (
                        <li
                          key={String(item.id)}
                          className="flex items-center gap-2 py-2 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1 truncate text-sm font-medium">
                              {String(item.label)}
                              {item.openInNewTab === true && (
                                <ExternalLink
                                  className="h-3 w-3 shrink-0 text-muted-foreground"
                                  aria-label="Opens in a new tab"
                                />
                              )}
                              {item.isActive === false && (
                                <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                                  hidden
                                </span>
                              )}
                            </p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {String(item.url)}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={index === 0 || reorder.isPending}
                              onClick={() => move(menu.key, index, -1)}
                              aria-label={`Move ${String(item.label)} up`}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={index === list.length - 1 || reorder.isPending}
                              onClick={() => move(menu.key, index, 1)}
                              aria-label={`Move ${String(item.label)} down`}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                setDraft({
                                  menu: String(item.menu),
                                  id: String(item.id),
                                  label: String(item.label ?? ""),
                                  url: String(item.url ?? ""),
                                  openInNewTab: item.openInNewTab === true,
                                  isActive: item.isActive !== false,
                                })
                              }
                              aria-label={`Edit ${String(item.label)}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setPendingDelete(item)}
                              aria-label={`Delete ${String(item.label)}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <FormSheet
        open={!!draft}
        onOpenChange={(open) => !open && setDraft(null)}
        title={draft?.id ? "Edit menu item" : "Add menu item"}
        description={
          MENUS.find((m) => m.key === draft?.menu)?.label ?? "Menu item"
        }
        onSubmit={submit}
        submitLabel={draft?.id ? "Save changes" : "Add item"}
        submitting={saving}
        size="sm"
      >
        {draft && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="menu-label">Label</Label>
              <Input
                id="menu-label"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="Courses"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="menu-url">URL</Label>
              <Input
                id="menu-url"
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                placeholder="/courses or https://…"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <Label htmlFor="menu-newtab" className="text-sm">
                Open in a new tab
              </Label>
              <Switch
                id="menu-newtab"
                checked={draft.openInNewTab}
                onCheckedChange={(v) => setDraft({ ...draft, openInNewTab: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <Label htmlFor="menu-active" className="text-sm">
                Visible
              </Label>
              <Switch
                id="menu-active"
                checked={draft.isActive}
                onCheckedChange={(v) => setDraft({ ...draft, isActive: v })}
              />
            </div>
          </div>
        )}
      </FormSheet>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Remove this menu item?"
        description={`"${String(pendingDelete?.label ?? "")}" will disappear from the site navigation.`}
        confirmText="Remove"
        variant="destructive"
        onConfirm={() => {
          if (!pendingDelete) return;
          remove.mutate(String(pendingDelete.id), {
            onSuccess: () => {
              toast.success("Menu item removed");
              setPendingDelete(null);
            },
          });
        }}
      />
    </PageLayout>
  );
}
