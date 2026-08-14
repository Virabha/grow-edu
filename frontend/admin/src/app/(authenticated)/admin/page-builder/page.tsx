"use client";

import * as React from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { FileText, Layers, Plus, Search } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/admin/status-pill";
import { apiClient } from "@/lib/api/client";
import {
  useCreateResource,
  useResourceList,
  useUpdateResource,
  type ResourceRow,
} from "@/lib/hooks/use-resource";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SectionTemplate {
  id: string;
  group: string;
  name: string;
  description: string;
}

export default function PageBuilderPage() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [libraryFilter, setLibraryFilter] = React.useState("");

  const pages = useResourceList("pages", { limit: 50 });
  const create = useCreateResource("pages");
  const update = useUpdateResource("pages");

  const library = useQuery({
    queryKey: ["page-sections"],
    queryFn: () =>
      apiClient.get<SectionTemplate[]>("/page-sections").then((r) => r.data),
  });

  const rows = pages.data?.data ?? [];
  const selected =
    rows.find((p) => String(p.id) === selectedId) ?? rows[0] ?? null;

  const templates = (library.data ?? []).filter(
    (t) =>
      !libraryFilter ||
      t.name.toLowerCase().includes(libraryFilter.toLowerCase()) ||
      t.group.toLowerCase().includes(libraryFilter.toLowerCase()),
  );
  const groups = Array.from(new Set(templates.map((t) => t.group)));

  function addSection(template: SectionTemplate) {
    if (!selected) return;
    update.mutate(
      { id: String(selected.id), sections: Number(selected.sections ?? 0) + 1 },
      {
        onSuccess: () =>
          toast.success(`"${template.name}" added to ${String(selected.title)}`),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Could not add"),
      },
    );
  }

  function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Give the page a title.");
      return;
    }
    create.mutate(
      {
        title: title.trim(),
        slug: (slug.trim() || title.trim().toLowerCase().replace(/\s+/g, "-")),
        status: "DRAFT",
        sections: 0,
        updatedAt: new Date().toISOString(),
      },
      {
        onSuccess: (row) => {
          toast.success("Page created");
          setCreating(false);
          setTitle("");
          setSlug("");
          setSelectedId(String((row as ResourceRow).id));
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Could not create"),
      },
    );
  }

  return (
    <PageLayout
      subtitle="Appearance"
      header="Page builder"
      description="Build custom pages by stacking sections from the template library."
      actions={
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          New page
        </Button>
      }
    >
      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-[300px_1fr]">
        {/* Pages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pages</CardTitle>
          </CardHeader>
          <CardContent>
            {pages.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                title="No pages yet"
                description="Create one to start building."
                className="py-6"
              />
            ) : (
              <ul className="space-y-1" role="listbox" aria-label="Pages">
                {rows.map((row) => {
                  const active = String(row.id) === String(selected?.id);
                  return (
                    <li key={String(row.id)}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => setSelectedId(String(row.id))}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-transparent hover:bg-accent/50",
                        )}
                      >
                        <FileText
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            active ? "text-primary" : "text-muted-foreground/50",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {String(row.title)}
                          </span>
                          <span className="block truncate font-mono text-[11px] text-muted-foreground">
                            /{String(row.slug)}
                          </span>
                          <span className="mt-1 flex items-center gap-2">
                            <StatusPill value={String(row.status)} />
                            <span className="text-[11px] text-muted-foreground">
                              {String(row.sections ?? 0)} sections
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Section library */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">
                  Section library
                  {selected && (
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      → {String(selected.title)}
                    </span>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selected
                    ? `Last edited ${formatDate(String(selected.updatedAt ?? ""))} · ${String(selected.sections ?? 0)} sections in this page`
                    : "Choose a page on the left, then add sections to it."}
                </p>
              </div>
              <div className="relative w-full max-w-[220px]">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={libraryFilter}
                  onChange={(e) => setLibraryFilter(e.target.value)}
                  placeholder="Filter sections…"
                  className="h-9 pl-8 text-sm"
                  aria-label="Filter sections"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {library.isLoading ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-md" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <EmptyState
                title="No sections match"
                description="Try a different search term."
                className="py-8"
              />
            ) : (
              groups.map((group) => (
                <div key={group}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {group}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {templates
                      .filter((t) => t.group === group)
                      .map((template) => (
                        <div
                          key={template.id}
                          className="flex flex-col gap-2 rounded-md border border-border p-2.5"
                        >
                          <div className="flex items-start gap-2">
                            <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{template.name}</p>
                              <p className="text-[11px] leading-snug text-muted-foreground">
                                {template.description}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-full text-xs"
                            disabled={!selected || update.isPending}
                            onClick={() => addSection(template)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add to page
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <FormSheet
        open={creating}
        onOpenChange={setCreating}
        title="New page"
        description="Create the page first, then stack sections onto it."
        onSubmit={submitCreate}
        submitLabel="Create page"
        submitting={create.isPending}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="page-title">Title</Label>
            <Input
              id="page-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Corporate training"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="page-slug">Slug</Label>
            <Input
              id="page-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="corporate-training"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank and we will build one from the title.
            </p>
          </div>
        </div>
      </FormSheet>
    </PageLayout>
  );
}
