"use client";
import { PageLayout } from "@/components/layout/page-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
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
      header="Platform Settings"
      description="Configure platform-wide settings and integrations."
    >
      <div className="space-y-2">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Basic configuration for the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="registrations">Allow New Registrations</Label>
                <div className="text-sm text-muted-foreground">
                  Enable or disable new user signups.
                </div>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Maintenance</CardTitle>
            <CardDescription>
              Manage system availability and maintenance mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance">Maintenance Mode</Label>
                <div className="text-sm text-muted-foreground">
                  Disable access for non-admin users.
                </div>
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
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
