"use client";

import { useEffect, useRef } from "react";
import { useUnreadCount } from "./use-notifications";
import { notificationsApi } from "../api/notifications.api";
import type { Notification } from "../types";

export function useBrowserNotifications(enabled: boolean): void {
  const { data: unread } = useUnreadCount(enabled);
  const lastSeenRef = useRef<number | null>(null);
  const lastFiredIdsRef = useRef<Set<string>>(new Set());
  const permissionAskedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (permissionAskedRef.current) return;
    if (Notification.permission === "default") {
      permissionAskedRef.current = true;
      Notification.requestPermission().catch(() => {});
    }
  }, [enabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("notif:last-seen");
    if (raw != null) {
      const n = Number(raw);
      if (Number.isFinite(n)) lastSeenRef.current = n;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const count = unread?.count ?? null;
    if (count == null) return;

    const lastSeen = lastSeenRef.current;
    if (lastSeen == null) {
      lastSeenRef.current = count;
      sessionStorage.setItem("notif:last-seen", String(count));
      return;
    }

    if (count <= lastSeen) {
      lastSeenRef.current = count;
      sessionStorage.setItem("notif:last-seen", String(count));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const list = await notificationsApi.list({ limit: 10 });
        if (cancelled) return;
        const fresh = list.data.filter(
          (n) => !n.read && !lastFiredIdsRef.current.has(n.notificationId),
        );
        const tabHidden =
          typeof document !== "undefined" && document.visibilityState !== "visible";
        if (tabHidden) {
          for (const n of fresh.slice(0, 3)) {
            showSystemNotification(n);
            lastFiredIdsRef.current.add(n.notificationId);
          }
        } else {
          for (const n of fresh) {
            lastFiredIdsRef.current.add(n.notificationId);
          }
        }
        lastSeenRef.current = count;
        sessionStorage.setItem("notif:last-seen", String(count));
      } catch {
        /* polling will retry */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unread?.count, enabled]);
}

function showSystemNotification(n: Notification): void {
  try {
    const notif = new Notification(n.title, {
      body: n.body ?? undefined,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: n.notificationId,
      data: { link: n.link },
    });
    notif.onclick = () => {
      window.focus();
      if (n.link) window.location.href = n.link;
      notif.close();
    };
  } catch {
    /* permission revoked / unsupported */
  }
}
