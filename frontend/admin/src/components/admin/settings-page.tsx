"use client";

import * as React from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResourceField,
  type FieldSpec,
  type FieldValue,
} from "@/components/admin/resource-field";
import { apiClient } from "@/lib/api/client";
import { getApiError } from "@/lib/api/errors";

interface SettingsResponse {
  group: string;
  meta: { title: string; description: string };
  fields: FieldSpec[];
  values: Record<string, FieldValue>;
}

/**
 * Renders any settings group from its server-supplied field list.
 *
 * The documentation describes ~20 settings pages that are all the same shape —
 * load a group of keys, edit, save — so they share this one screen rather than
 * twenty near-identical copies.
 */
export function SettingsPage({
  group,
  subtitle = "Settings",
  /** Extra content rendered under the form, e.g. a live preview. */
  children,
}: {
  group: string;
  subtitle?: string;
  children?: (values: Record<string, FieldValue>) => React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = React.useState<Record<string, FieldValue> | null>(
    null,
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["settings", group],
    queryFn: () =>
      apiClient.get<SettingsResponse>(`/settings/${group}`).then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (body: Record<string, FieldValue>) =>
      apiClient.put(`/settings/${group}`, body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", group] });
      toast.success("Settings saved");
    },
    onError: (err) =>
      toast.error(getApiError(err, "Could not save these settings").message),
  });

  // Server values are the source of truth until the user edits something.
  const current = values ?? data?.values ?? {};
  const dirty = values !== null;

  if (isError) {
    return (
      <PageLayout header="Settings">
        <EmptyState
          title="We could not load these settings"
          description={getApiError(error, "Please try again.").message}
          action={{ label: "Try again", onClick: () => void refetch() }}
        />
      </PageLayout>
    );
  }

  if (isLoading || !data) {
    return (
      <PageLayout header="Settings" subtitle={subtitle}>
        <div className="max-w-2xl space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      subtitle={subtitle}
      header={data.meta.title}
      description={data.meta.description}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!dirty || save.isPending}
            onClick={() => setValues(null)}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Discard
          </Button>
          <Button
            size="sm"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate(current)}
          >
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-[minmax(0,640px)_1fr]">
        <Card>
          <CardContent className="space-y-4 py-4">
            {data.fields.map((field) => (
              <ResourceField
                key={field.key}
                field={field}
                value={current[field.key]}
                onChange={(value) =>
                  setValues({ ...current, [field.key]: value })
                }
              />
            ))}
          </CardContent>
        </Card>

        {children?.(current)}
      </div>
    </PageLayout>
  );
}
