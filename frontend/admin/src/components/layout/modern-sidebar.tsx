"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ReactNode, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar-provider";
import { useAuthStore } from "@/lib/store/auth-store";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";

interface SidebarItem {
  label: string;
  href: string;
  icon?: ReactNode;
  badge?: string | number;
}

interface ModernSidebarProps {
  items: SidebarItem[];
  className?: string;
}

const SIDEBAR_WIDTH = 232;
const SIDEBAR_WIDTH_COLLAPSED = 60;

export function ModernSidebar({ items, className }: ModernSidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { logout, user } = useAuthStore();
  const queryClient = useQueryClient();
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    queryClient.clear();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };
  const toggleTheme = () =>
    setTheme(resolvedTheme === "dark" ? "light" : "dark");

  const isActive = (href: string) =>
    pathname === href || (pathname?.startsWith(href + "/") && href !== "/");

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : (user?.email?.[0] ?? "G").toUpperCase();

  const Brand = ({ minimal = false }: { minimal?: boolean }) => (
    <Link
      href="/"
      className="flex items-center gap-2.5 overflow-hidden"
      onClick={() => setMobileOpen(false)}
    >
      <Image
        src="/logo.png"
        alt="grotutor"
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-lg object-cover"
        priority
      />
      {!minimal && (
        <span className="font-display truncate text-base font-medium tracking-tight text-foreground">
          grotutor
        </span>
      )}
    </Link>
  );

  const NavItem = ({ item }: { item: SidebarItem }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all",
          active
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          collapsed && "justify-center px-0",
        )}
      >
        {item.icon && (
          <span className="flex size-4 shrink-0 items-center justify-center">
            {item.icon}
          </span>
        )}
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge != null && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                  active
                    ? "bg-background/15 text-background"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Brand row */}
      <div
        className={cn(
          "flex items-center border-b border-border bg-card px-3 py-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <Brand minimal={collapsed} />
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "hidden size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex",
            collapsed && "absolute -right-3 top-4 size-6 border border-border bg-card shadow-sm",
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <ChevronLeft className="size-3.5" />
          )}
        </button>
      </div>

      {/* User card */}
      {user && !collapsed && (
        <div className="border-b border-border bg-muted/30 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <span className="font-display flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-[11px] uppercase tracking-widest text-muted-foreground">
                {user.role?.replace("_", " ").toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3 scrollbar-hide">
        {items.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Footer actions */}
      <div className="space-y-0.5 border-t border-border bg-card px-2 py-2">
        <button
          onClick={toggleTheme}
          title={collapsed ? "Toggle theme" : undefined}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="flex size-4 shrink-0 items-center justify-center">
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </span>
          {!collapsed && (
            <span className="flex-1 text-left">
              {mounted && resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          )}
        </button>
        <button
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="flex size-4 shrink-0 items-center justify-center">
            <LogOut className="size-4" />
          </span>
          {!collapsed && <span className="flex-1 text-left">Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu trigger */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        className="fixed left-2 top-2 z-50 size-9 rounded-full border border-border bg-background/85 shadow-sm backdrop-blur-md hover:bg-background lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
      </Button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed left-0 top-0 z-50 h-dvh w-[260px] border-r border-border bg-card shadow-2xl lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{
          width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
        }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-dvh border-r border-border bg-card lg:block",
          className,
        )}
      >
        <SidebarContent />
      </motion.aside>
    </>
  );
}
