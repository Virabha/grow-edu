"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Laptop, Smartphone, Tablet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDevices,
  useSignOutDevice,
  useSignOutOtherDevices,
  type Device,
} from "@/lib/hooks/use-profile";
import { formatRelative } from "@/lib/format";

const ICON = {
  desktop: Laptop,
  mobile: Smartphone,
  tablet: Tablet,
} as const;

export function DeviceList() {
  const { data: devices, isLoading } = useDevices();
  const signOutDevice = useSignOutDevice();
  const signOutOthers = useSignOutOtherDevices();
  const [confirmAll, setConfirmAll] = useState(false);

  const others = (devices ?? []).filter((d) => !d.current);

  function removeOne(device: Device) {
    signOutDevice.mutate(device.deviceId, {
      onSuccess: () => toast.success(`Signed out of ${device.browser}`),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not sign that device out",
        ),
    });
  }

  function removeOthers() {
    signOutOthers.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(
          result.removed === 1
            ? "Signed out of 1 other device"
            : `Signed out of ${result.removed} other devices`,
        );
        setConfirmAll(false);
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : "Could not sign the devices out",
        ),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
        {(devices ?? []).map((device) => {
          const Icon = ICON[device.deviceType];
          return (
            <li
              key={device.deviceId}
              className="flex items-center gap-3 p-2.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {device.browser} on {device.os}
                  {device.current && (
                    <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                      This device
                    </span>
                  )}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {device.location} · {device.ipAddress} ·{" "}
                  {device.current
                    ? "active now"
                    : `last active ${formatRelative(device.lastActiveAt)}`}
                </p>
              </div>

              {!device.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 text-xs text-destructive hover:text-destructive"
                  onClick={() => removeOne(device)}
                  disabled={
                    signOutDevice.isPending &&
                    signOutDevice.variables === device.deviceId
                  }
                >
                  Sign out
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirmAll(true)}
        disabled={others.length === 0}
      >
        Sign out of all other devices
      </Button>
      {others.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          You are only signed in on this device.
        </p>
      )}

      <Dialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-medium">
            Sign out everywhere else?
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-muted-foreground">
            {others.length === 1
              ? "One other device will be signed out."
              : `${others.length} other devices will be signed out.`}{" "}
            You will stay signed in here.
          </p>
        </DialogContent>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={() => setConfirmAll(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={removeOthers}
            disabled={signOutOthers.isPending}
          >
            {signOutOthers.isPending ? "Signing out…" : "Sign them out"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
