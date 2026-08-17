"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Laptop, Loader2, LogOut, Smartphone, Tablet } from "lucide-react";

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
import { getApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const DEVICE_ICON = {
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
        toast.error(getApiError(err, "Could not sign that device out").message),
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
        toast.error(getApiError(err, "Could not sign the devices out").message),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-4"
          >
            <Skeleton className="size-11 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-60" />
            </div>
            <Skeleton className="h-8 w-20 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  const deviceList = devices ?? [];

  if (deviceList.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <Laptop className="size-7 text-muted-foreground" aria-hidden={true} />
        </div>
        <p className="text-sm font-medium">No active sessions found</p>
        <p className="text-[11px] text-muted-foreground">
          Your signed-in devices will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
        {deviceList.map((device) => {
          const IconComponent = DEVICE_ICON[device.deviceType] ?? Laptop;
          const isCurrentlySigningOut =
            signOutDevice.isPending && signOutDevice.variables === device.deviceId;

          return (
            <li
              key={device.deviceId}
              className={cn(
                "flex items-center gap-4 px-4 py-3.5 transition-colors",
                device.current
                  ? "bg-primary/[0.04] dark:bg-primary/[0.06]"
                  : "hover:bg-muted/40",
              )}
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                  device.current
                    ? "bg-primary/12 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <IconComponent className="size-5" aria-hidden={true} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-medium">
                    {device.browser} on {device.os}
                  </p>
                  {device.current && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold leading-tight text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      This device
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {[device.location, device.ipAddress].filter(Boolean).join(" · ")}
                  {" · "}
                  {device.current
                    ? "active now"
                    : `last active ${formatRelative(device.lastActiveAt)}`}
                </p>
              </div>

              {!device.current && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1 border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => removeOne(device)}
                  disabled={isCurrentlySigningOut}
                  aria-label={`Sign out of ${device.browser} on ${device.os}`}
                >
                  {isCurrentlySigningOut ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <LogOut className="size-3.5" />
                  )}
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-muted-foreground">
          {others.length === 0
            ? "You are only signed in on this device."
            : `${others.length} other ${others.length === 1 ? "device" : "devices"} active.`}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmAll(true)}
          disabled={others.length === 0}
          className={cn(
            "w-full gap-1 sm:w-auto",
            others.length > 0 &&
              "border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive",
          )}
        >
          <LogOut className="size-3.5" />
          Sign out all other devices
        </Button>
      </div>

      <Dialog open={confirmAll} onOpenChange={setConfirmAll} className="max-w-md">
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
            variant="destructive"
            size="sm"
            onClick={removeOthers}
            disabled={signOutOthers.isPending}
          >
            {signOutOthers.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing out…
              </>
            ) : (
              "Sign them out"
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
