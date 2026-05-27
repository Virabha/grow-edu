"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useMarkAllRead,
  useNotifications,
  useUnreadCount,
} from "../hooks/use-notifications";

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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: unread } = useUnreadCount();
  const { data: list, isLoading } = useNotifications({ limit: 15 });
  const markAllRead = useMarkAllRead();

  const items = list?.data ?? [];
  const unreadCount = unread?.count ?? 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[360px] p-0"
        sideOffset={8}
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
                const content = (
                  <div
                    className={`flex items-start gap-3 border-b border-border/40 px-3 py-3 transition-colors hover:bg-muted/40 ${
                      n.read ? "opacity-70" : ""
                    }`}
                  >
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        n.read ? "bg-muted-foreground/30" : "bg-primary"
                      }`}
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
                        {content}
                      </Link>
                    ) : (
                      content
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
