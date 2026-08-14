"use client";

import { toast } from "sonner";
import { Check } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useResourceAction, useResourceList } from "@/lib/hooks/use-resource";
import { cn } from "@/lib/utils";

export default function ThemesPage() {
  const { data, isLoading, isError, error, refetch } = useResourceList("themes", {
    limit: 20,
  });
  const activate = useResourceAction("themes", "activate");
  const themes = data?.data ?? [];

  return (
    <PageLayout
      subtitle="Appearance"
      header="Site theme"
      description="The layout the public site renders with. Switching takes effect immediately for visitors."
    >
      {isError ? (
        <EmptyState
          title="We could not load themes"
          description={error instanceof Error ? error.message : "Please try again."}
          action={{ label: "Try again", onClick: () => void refetch() }}
        />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2 xl:grid-cols-3">
          {themes.map((theme) => {
            const active = theme.isActive === true;
            return (
              <div
                key={String(theme.id)}
                className={cn(
                  "overflow-hidden rounded-lg border bg-card transition-colors",
                  active ? "border-primary ring-1 ring-primary" : "border-border",
                )}
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={String(theme.preview ?? "")}
                    alt={`${String(theme.name)} preview`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium">{String(theme.name)}</h3>
                    {active && (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                        <Check className="h-3 w-3" />
                        Live
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {String(theme.description ?? "")}
                  </p>
                  <Button
                    size="sm"
                    variant={active ? "outline" : "default"}
                    className="w-full"
                    disabled={active || activate.isPending}
                    onClick={() =>
                      activate.mutate(
                        { id: String(theme.id) },
                        {
                          onSuccess: () =>
                            toast.success(`${String(theme.name)} is now live`),
                          onError: (err) =>
                            toast.error(
                              err instanceof Error
                                ? err.message
                                : "Could not switch theme",
                            ),
                        },
                      )
                    }
                  >
                    {active ? "Currently live" : "Use this theme"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
