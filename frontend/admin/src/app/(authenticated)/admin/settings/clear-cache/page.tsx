"use client";

import * as React from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { apiClient } from "@/lib/api/client";
import { getApiError } from "@/lib/api/errors";

const SCOPES = [
  { key: "pages", label: "Rendered pages", help: "Cached HTML for the public marketing pages." },
  { key: "api", label: "API responses", help: "Course listings, categories and CMS content." },
  { key: "images", label: "Image transforms", help: "Resized thumbnails and generated previews." },
  { key: "sessions", label: "Session cache", help: "Signs everyone out and rebuilds their session." },
];

export default function ClearCachePage() {
  const [selected, setSelected] = React.useState<string[]>(["pages", "api"]);

  const clear = useMutation({
    mutationFn: (scopes: string[]) =>
      apiClient.post<{ message: string }>("/system/clear-cache", { scopes }).then((r) => r.data),
    onSuccess: (result) => toast.success(result.message),
    onError: (err) =>
      toast.error(getApiError(err, "Could not clear the cache").message),
  });

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  return (
    <PageLayout
      subtitle="Maintenance"
      header="Clear cache"
      description="Drop cached data so the next request rebuilds it. Safe to run at any time — nothing is deleted permanently."
    >
      <Card className="max-w-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">What to clear</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {SCOPES.map((scope) => (
              <label
                key={scope.key}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-accent/40"
              >
                <Checkbox
                  checked={selected.includes(scope.key)}
                  onCheckedChange={() => toggle(scope.key)}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{scope.label}</span>
                  <span className="block text-xs text-muted-foreground">{scope.help}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <Button
              disabled={selected.length === 0 || clear.isPending}
              onClick={() => clear.mutate(selected)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {clear.isPending ? "Clearing…" : `Clear ${selected.length} cache(s)`}
            </Button>
            <Button
              variant="ghost"
              disabled={clear.isPending}
              onClick={() => clear.mutate(SCOPES.map((s) => s.key))}
            >
              Clear everything
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
