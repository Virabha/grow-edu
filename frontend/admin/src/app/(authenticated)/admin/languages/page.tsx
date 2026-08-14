"use client";

import { toast } from "sonner";
import { Check } from "lucide-react";

import { ResourcePage } from "@/components/admin/resource-page";
import { Button } from "@/components/ui/button";
import { useResourceAction, type ResourceRow } from "@/lib/hooks/use-resource";

export default function LanguagesPage() {
  const setDefault = useResourceAction("languages", "default");

  return (
    <ResourcePage
      path="languages"
      idKey="id"
      subtitle="Localisation"
      title="Site languages"
      description="Languages the interface is translated into. One is the default every visitor sees first."
      noun="language"
      searchPlaceholder="Search languages…"
      columns={[
        { key: "name", header: "Language" },
        { key: "code", header: "Code" },
        { key: "direction", header: "Direction" },
        {
          key: "translatedKeys",
          header: "Translated",
          render: (row) => {
            const done = Number(row.translatedKeys ?? 0);
            const total = Number(row.totalKeys ?? 1);
            const percent = Math.round((done / total) * 100);
            return (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {percent}%
                </span>
              </div>
            );
          },
        },
        {
          key: "isDefault",
          header: "Default",
          render: (row) =>
            row.isDefault ? (
              <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                Default
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
        { key: "isActive", header: "Active" },
      ]}
      fields={[
        { key: "name", label: "Language", type: "text", required: true },
        { key: "code", label: "ISO code", type: "text", required: true, help: "Two letters, e.g. hi for Hindi." },
        {
          key: "direction",
          label: "Text direction",
          type: "select",
          options: [
            { value: "ltr", label: "Left to right" },
            { value: "rtl", label: "Right to left" },
          ],
        },
        { key: "isActive", label: "Available to visitors", type: "boolean" },
      ]}
      rowActions={(row: ResourceRow) =>
        row.isDefault ? null : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            disabled={setDefault.isPending}
            onClick={() =>
              setDefault.mutate(
                { id: String(row.id) },
                {
                  onSuccess: () =>
                    toast.success(`${String(row.name)} is now the default`),
                  onError: (err) =>
                    toast.error(
                      err instanceof Error ? err.message : "Could not update",
                    ),
                },
              )
            }
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Make default
          </Button>
        )
      }
    />
  );
}
