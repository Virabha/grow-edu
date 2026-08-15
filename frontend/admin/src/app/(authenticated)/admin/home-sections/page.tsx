"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { apiClient } from "@/lib/api/client";
import {
  useResourceList,
  useUpdateResource,
  type ResourceRow,
} from "@/lib/hooks/use-resource";
import { getApiError } from "@/lib/api/errors";

export default function HomeSectionsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useResourceList(
    "home-sections",
    { limit: 50, sort: "displayOrder", order: "asc" },
  );
  const update = useUpdateResource("home-sections");

  const reorder = useMutation({
    mutationFn: (order: string[]) =>
      apiClient.post("/home-sections/reorder", { order }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-sections"] });
      toast.success("Order saved");
    },
    onError: (err) =>
      toast.error(getApiError(err, "Could not save the order").message),
  });

  const sections = React.useMemo(
    () =>
      [...(data?.data ?? [])].sort(
        (a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0),
      ),
    [data],
  );

  function move(index: number, direction: -1 | 1) {
    const next = [...sections];
    const target = index + direction;
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    reorder.mutate(next.map((s) => String(s.id)));
  }

  function toggle(row: ResourceRow, visible: boolean) {
    update.mutate(
      { id: String(row.id), isVisible: visible },
      {
        onSuccess: () =>
          toast.success(
            visible
              ? `${String(row.name)} is now shown`
              : `${String(row.name)} is hidden`,
          ),
        onError: (err) =>
          toast.error(getApiError(err, "Could not update").message),
      },
    );
  }

  return (
    <PageLayout
      subtitle="Appearance"
      header="Home page sections"
      description="Which blocks appear on the public home page, and the order they run in."
    >
      {isError ? (
        <EmptyState
          title="We could not load sections"
          description={getApiError(error, "Please try again.").message}
          action={{ label: "Try again", onClick: () => void refetch() }}
        />
      ) : isLoading ? (
        <div className="max-w-3xl space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <ol className="max-w-3xl space-y-2">
          {sections.map((section, index) => (
            <li
              key={String(section.id)}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <GripVertical
                className="h-4 w-4 shrink-0 text-muted-foreground/50"
                aria-hidden="true"
              />
              <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{String(section.name)}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {String(section.key)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => move(index, -1)}
                  aria-label={`Move ${String(section.name)} up`}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={index === sections.length - 1 || reorder.isPending}
                  onClick={() => move(index, 1)}
                  aria-label={`Move ${String(section.name)} down`}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Switch
                  checked={section.isVisible === true}
                  onCheckedChange={(next) => toggle(section, next)}
                  aria-label={`Show ${String(section.name)} on the home page`}
                  className="ml-1"
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </PageLayout>
  );
}
