"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useMarkAllRead,
  useNotifications,
  useUnreadCount,
} from "../hooks/use-notifications";
import { useBrowserNotifications } from "../hooks/use-browser-notifications";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export function SidebarNotificationsItem({
  collapsed,
}: {
  collapsed: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const { data: unread } = useUnreadCount(mounted);
  const { data: list, isLoading } = useNotifications(
    { limit: 15 },
    mounted && open
  );
  const markAllRead = useMarkAllRead();
  // System notifications when tab is in background or laptop wakes up.
  useBrowserNotifications(mounted);

  useEffect(() => {
    setMounted(true);
  }, []);

  const items = list?.data ?? [];
  const unreadCount = unread?.count ?? 0;

  if (!mounted) {
    return (
      <button
        type="button"
        suppressHydrationWarning
        className={cn(
          "relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          collapsed && "justify-center px-0"
        )}
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          <Bell className="size-4" />
        </span>
        {!collapsed && <span className="flex-1 text-left">Notifications</span>}
      </button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={collapsed ? "Notifications" : undefined}
          className={cn(
            "relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            collapsed && "justify-center px-0"
          )}
        >
          <span className="relative flex size-4 shrink-0 items-center justify-center">
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-semibold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={8}
        className="w-[360px] p-0"
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="font-display text-sm font-medium">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <Check className="size-3" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            <ul>
              {items.map((n) => {
                const inner = (
                  <div
                    className={cn(
                      "flex items-start gap-3 border-b border-border/40 px-3 py-3 transition-colors hover:bg-muted/40",
                      n.read && "opacity-70"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        n.read ? "bg-muted-foreground/30" : "bg-primary"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium line-clamp-2">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                );
                return (
                  <li key={n.notificationId}>
                    {n.link ? (
                      <Link href={n.link} onClick={() => setOpen(false)}>
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
