"use client";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { CreditCard, ChevronRight } from "lucide-react";
import {
  useSiteSettingsAdmin,
  useUpsertSiteSetting,
} from "@/features/cms/hooks/use-cms";
import type { SiteSetting } from "@/features/cms/types";

function getSettingValue(
  settings: SiteSetting[],
  key: string,
  field: string,
  fallback: boolean
): boolean {
  const found = settings.find((s) => s.key === key);
  if (!found) return fallback;
  const val = found.value as Record<string, unknown>;
  return typeof val[field] === "boolean" ? (val[field] as boolean) : fallback;
}

export default function AdminSettingsPage() {
  const { data: settings = [], isLoading } = useSiteSettingsAdmin();
  const upsert = useUpsertSiteSetting();

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (settings.length > 0 && !initialized) {
      setMaintenanceMode(
        getSettingValue(settings, "platform", "maintenanceMode", false)
      );
      setAllowRegistrations(
        getSettingValue(settings, "platform", "allowRegistrations", true)
      );
      setInitialized(true);
    }
  }, [settings, initialized]);

  const handleToggle = useCallback(
    async (field: string, value: boolean) => {
      const existing = settings.find((s) => s.key === "platform");
      const current = (existing?.value as Record<string, unknown>) ?? {};
      try {
        await upsert.mutateAsync({
          key: "platform",
          value: { ...current, [field]: value },
        });
        toast.success("Setting updated");
      } catch {
        toast.error("Failed to update setting");
      }
    },
    [settings, upsert]
  );

  if (isLoading) {
    return (
      <PageLayout
        header="Platform Settings"
        description="Configure platform-wide settings and integrations."
      >
        <div className="space-y-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      subtitle="Console"
      header="Platform settings"
      description="Toggle platform-wide behaviours."
    >
      <div className="space-y-4">
        <Link href="/admin/settings/payments">
          <section className="group flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-muted/40 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background">
                <CreditCard className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-display text-base font-medium text-foreground">
                  Payment settings
                </p>
                <p className="text-xs text-muted-foreground">
                  QR code, UPI ID, and bank transfer details for checkout.
                </p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </section>
        </Link>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            General
          </p>
          <div className="mt-4 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Label
                htmlFor="registrations"
                className="font-display text-base font-medium text-foreground"
              >
                Allow new registrations
              </Label>
              <p className="text-xs text-muted-foreground">
                When off, the signup page is disabled for new users.
              </p>
            </div>
            <Switch
              id="registrations"
              checked={allowRegistrations}
              disabled={upsert.isPending}
              onCheckedChange={(v) => {
                setAllowRegistrations(v);
                handleToggle("allowRegistrations", v);
              }}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Availability
          </p>
          <div className="mt-4 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Label
                htmlFor="maintenance"
                className="font-display text-base font-medium text-foreground"
              >
                Maintenance mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Locks the platform for non-admin users. Use for migrations or
                planned downtime.
              </p>
            </div>
            <Switch
              id="maintenance"
              checked={maintenanceMode}
              disabled={upsert.isPending}
              onCheckedChange={(v) => {
                setMaintenanceMode(v);
                handleToggle("maintenanceMode", v);
              }}
            />
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
