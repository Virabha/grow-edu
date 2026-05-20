"use client";
import { useState } from "react";
import {
  motion,
  useScroll,
  useMotionValueEvent,
  AnimatePresence,
} from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const navItems = [
  { label: "Why grotutor", href: "#why-grotutor" },
  { label: "Categories", href: "#categories" },
  { label: "Courses", href: "#courses" },
  { label: "How it works", href: "#how-it-works" },
];

function dashboardForRole(role?: string): string {
  switch (role) {
    case "PLATFORM_ADMIN":
      return "/admin/dashboard";
    case "INSTRUCTOR":
      return "/instructor/dashboard";
    case "CORPORATE_ADMIN":
      return "/corporate/dashboard";
    default:
      return "/learner/dashboard";
  }
}

export function Navbar() {
  const router = useRouter();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setHidden(latest > previous && latest > 150);
    setScrolled(latest > 32);
  });

  const handleLogout = () => {
    logout();
    queryClient.clear();
    if (typeof window !== "undefined") window.location.href = "/login";
  };

  const initials = (() => {
    if (!user) return "G";
    const first = user.firstName?.[0] ?? "";
    const last = user.lastName?.[0] ?? "";
    return (first + last || user.email?.[0] || "G").toUpperCase();
  })();

  return (
    <motion.header
      variants={{
        visible: { y: 0 },
        hidden: { y: "-100%" },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-border bg-background/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-3 sm:h-16 sm:px-5">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="grotutor home"
        >
          <Image
            src="/logo.jpeg"
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-lg object-cover"
            priority
          />
          <span className="font-display text-base font-medium tracking-tight text-foreground sm:text-lg">
            grotutor
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ModeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="size-9 rounded-full border border-border bg-card p-0"
                  aria-label="Account menu"
                >
                  <span className="font-display text-xs font-medium text-foreground">
                    {initials}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <p className="font-display text-sm font-medium text-foreground">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : "Signed in"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push(dashboardForRole(user.role))}
                  className="cursor-pointer"
                >
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/profile")}
                  className="cursor-pointer"
                >
                  <User className="size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-9 rounded-full px-4 text-[13px] font-medium"
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="group h-9 gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-medium text-background hover:bg-foreground/90"
              >
                <Link href="/signup">
                  Get started
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted md:hidden"
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border bg-background md:hidden"
          >
            <nav className="space-y-1 px-3 py-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              {!user && (
                <div className="flex gap-2 pt-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-full"
                  >
                    <Link href="/login" onClick={() => setMenuOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="flex-1 rounded-full bg-foreground text-background hover:bg-foreground/90"
                  >
                    <Link href="/signup" onClick={() => setMenuOpen(false)}>
                      Get started
                    </Link>
                  </Button>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
