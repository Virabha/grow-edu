"use client";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { ChevronRight, CreditCard, ShieldAlert, UserPlus } from "lucide-react";
import {
  useSiteSettingsAdmin,
  useUpsertSiteSetting,
} from "@/features/cms/hooks/use-cms";
import type { SiteSetting } from "@/features/cms/types";
import type { ReactNode } from "react";

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

function SettingRow({
  icon,
  title,
  description,
  control,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-medium text-foreground">
            {title}
          </p>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
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
        subtitle="Console"
        header="Platform settings"
        description="Toggle platform-wide behaviours."
      >
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
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
      <div className="space-y-2">
        <Link href="/admin/settings/payments" className="block">
          <SettingRow
            icon={<CreditCard className="size-4 text-muted-foreground" />}
            title="Payment settings"
            description="QR code, UPI ID, and bank transfer details for checkout."
            control={
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            }
          />
        </Link>

        <SettingRow
          icon={<UserPlus className="size-4 text-muted-foreground" />}
          title="Allow new registrations"
          description="When off, the signup page is disabled for new users."
          control={
            <Switch
              id="registrations"
              checked={allowRegistrations}
              disabled={upsert.isPending}
              onCheckedChange={(v) => {
                setAllowRegistrations(v);
                handleToggle("allowRegistrations", v);
              }}
            />
          }
        />

        <SettingRow
          icon={<ShieldAlert className="size-4 text-muted-foreground" />}
          title="Maintenance mode"
          description="Locks the platform for non-admin users."
          control={
            <Switch
              id="maintenance"
              checked={maintenanceMode}
              disabled={upsert.isPending}
              onCheckedChange={(v) => {
                setMaintenanceMode(v);
                handleToggle("maintenanceMode", v);
              }}
            />
          }
        />
      </div>
    </PageLayout>
  );
}
