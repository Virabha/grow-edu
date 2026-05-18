"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Menu,
  Search,
  LogOut,
  BookOpen,
  Settings,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/constants";
import { useCategories } from "@/lib/hooks/use-categories";
import { useCourses } from "@/lib/hooks/use-courses";
import { useAuthStore } from "@/lib/store/auth-store";

const MEGA_MENU_CATEGORY_COUNT = 6;

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isHydrated, logout } = useAuthStore();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(
    null,
  );
  const megaRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = isHydrated && !!user;

  const { data: categories = [] } = useCategories();
  const mainCategories = categories.slice(0, MEGA_MENU_CATEGORY_COUNT);
  const activeCategoryId =
    hoveredCategoryId ?? mainCategories[0]?.categoryId ?? null;
  const activeCategory = mainCategories.find(
    (c) => c.categoryId === activeCategoryId,
  );
  const hasChildren = (activeCategory?.children?.length ?? 0) > 0;

  // Only fetch courses if the hovered category has no children (fallback)
  const { data: coursesData } = useCourses(
    {
      categoryId: activeCategoryId ?? undefined,
      limit: 8,
      status: "PUBLISHED",
    },
    !!activeCategoryId && coursesOpen && !hasChildren,
  );
  const menuCourses = coursesData?.data ?? [];

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
      const el = document.documentElement;
      setScrollProgress(
        (window.scrollY / (el.scrollHeight - el.clientHeight)) * 100,
      );
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/courses?search=${encodeURIComponent(searchQuery.trim())}`;
      setSearchQuery("");
      setMenuOpen(false);
      setSearchOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    setMenuOpen(false);
    router.push("/");
  };

  const LOGGED_IN_LINKS = [
    { href: "/my-courses", label: "My Courses" },
    { href: "/cart", label: "Cart" },
    { href: "/profile", label: "Profile" },
  ];

  const navLinks = isLoggedIn
    ? [{ href: "/courses", label: "Courses" }, ...LOGGED_IN_LINKS]
    : NAV_LINKS;

  const navLinksWithoutCourses = navLinks.filter((l) => l.href !== "/courses");

  const userInitials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() ||
      user.email[0].toUpperCase()
    : "";

  return (
    <>
      <div
        aria-hidden
        style={{ width: `${scrollProgress}%` }}
        className="fixed top-0 left-0 z-[60] h-0.5 bg-gradient-to-r from-primary to-[#6366f1] transition-[width] duration-150"
      />

      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "bg-white/70 dark:bg-background/70 shadow-sm backdrop-blur-xl border-b border-border/50"
            : "bg-white/40 dark:bg-background/40 backdrop-blur-xl border-b border-border/30",
        )}
      >
        <div className="container mx-auto flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="shrink-0 flex items-center gap-2.5 group"
            aria-label="Loshi Edu Home"
          >
            <Image
              width={120}
              height={120}
              src="/logo.jpeg"
              alt="Loshi Edu Logo"
              className="h-14 w-auto rounded-xl shadow-md shadow-primary/25 transition-transform group-hover:scale-105"
              priority
            />
            <span className="text-xl font-black tracking-tight">
              <span className="text-primary">Loshi Edu</span>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-0.5 lg:flex"
            aria-label="Main navigation"
          >
            <div
              ref={megaRef}
              className="relative"
              onMouseEnter={() => setCoursesOpen(true)}
              onMouseLeave={() => {
                setCoursesOpen(false);
                setHoveredCategoryId(null);
              }}
            >
              <Link
                href="/courses"
                className={cn(
                  "relative flex items-center gap-0.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150",
                  pathname === "/courses"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                )}
              >
                Courses
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    coursesOpen && "rotate-180",
                  )}
                />
              </Link>
              {pathname === "/courses" && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute inset-x-2 bottom-1 h-0.5 rounded-full bg-primary"
                />
              )}

              <AnimatePresence>
                {coursesOpen && mainCategories.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 top-full pt-2"
                  >
                    <div className="w-[740px] rounded-xl border-2 border-black/80 bg-white shadow-2xl overflow-hidden">
                      <div className="flex min-h-[320px]">
                        <div className="w-52 border-r-2 border-black/60 bg-gradient-to-b from-[#000052]/5 to-white p-2">
                          <p className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-[#000052]">
                            Categories
                          </p>
                          {mainCategories.map((cat) => (
                            <Link
                              key={cat.categoryId}
                              href={`/courses?category=${cat.categoryId}`}
                              onMouseEnter={() =>
                                setHoveredCategoryId(cat.categoryId)
                              }
                              className={cn(
                                "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200 mb-1",
                                activeCategoryId === cat.categoryId
                                  ? "border-primary bg-primary text-white shadow-md"
                                  : "border-transparent text-foreground hover:border-primary/30 hover:bg-gradient-to-r hover:from-primary/10 hover:to-violet-500/10 hover:text-primary",
                              )}
                            >
                              {cat.imageUrl ? (
                                <Image
                                  src={cat.imageUrl}
                                  alt=""
                                  width={32}
                                  height={32}
                                  className="size-8 shrink-0 rounded-md border border-border/40 object-cover"
                                />
                              ) : (
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                                  <BookOpen className={cn("size-4", activeCategoryId === cat.categoryId ? "text-white" : "text-primary")} />
                                </span>
                              )}
                              <span className="truncate">{cat.name}</span>
                            </Link>
                          ))}
                          <Link
                            href="/courses"
                            className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-primary/40 px-3 py-2.5 text-sm font-semibold text-primary transition-all hover:border-primary hover:bg-primary/5"
                          >
                            All categories →
                          </Link>
                        </div>
                        <div className="flex-1 p-4">
                          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#000052]">
                            {activeCategory?.name ?? "Courses"}
                          </p>
                          {hasChildren ? (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                {activeCategory!.children!.map((sub) => (
                                  <Link
                                    key={sub.categoryId}
                                    href={`/courses?category=${sub.categoryId}`}
                                    className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-sm transition-all duration-200 hover:border-primary/40 hover:bg-gradient-to-r hover:from-primary/5 hover:to-violet-500/5 hover:shadow-sm"
                                  >
                                    {sub.imageUrl ? (
                                      <Image
                                        src={sub.imageUrl}
                                        alt=""
                                        width={36}
                                        height={36}
                                        className="size-9 shrink-0 rounded-md border border-border/40 object-cover"
                                      />
                                    ) : (
                                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                                        <BookOpen className="size-4 text-primary" />
                                      </span>
                                    )}
                                    <span className="truncate font-medium text-foreground">
                                      {sub.name}
                                    </span>
                                  </Link>
                                ))}
                              </div>
                              <Link
                                href="/courses"
                                className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
                              >
                                View all courses →
                              </Link>
                            </>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                {menuCourses.length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-4 col-span-2">
                                    Loading courses…
                                  </p>
                                ) : (
                                  menuCourses.map((course) => (
                                    <Link
                                      key={course.courseId}
                                      href={`/courses/${course.slug}`}
                                      className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-sm transition-all duration-200 hover:border-primary/40 hover:bg-gradient-to-r hover:from-primary/5 hover:to-violet-500/5 hover:shadow-sm"
                                    >
                                      {course.thumbnail ? (
                                        <Image
                                          src={course.thumbnail}
                                          alt=""
                                          width={36}
                                          height={36}
                                          className="size-9 shrink-0 rounded-md border border-border/40 object-cover"
                                        />
                                      ) : (
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                                          <BookOpen className="size-4 text-primary" />
                                        </span>
                                      )}
                                      <span className="truncate font-medium text-foreground">
                                        {course.title}
                                      </span>
                                    </Link>
                                  ))
                                )}
                              </div>
                              <Link
                                href="/courses"
                                className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
                              >
                                View all courses →
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {navLinksWithoutCourses.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                  )}
                >
                  {link.label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-2 bottom-1 h-0.5 rounded-full bg-primary"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          <form
            onSubmit={handleSearch}
            className="hidden w-52 xl:block"
            role="search"
          >
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground/40"
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                className="w-full rounded-lg border border-input bg-muted/60 py-1.5 pl-8 pr-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/15"
                aria-label="Search courses"
              />
            </div>
          </form>

          <button
            onClick={() => setSearchOpen((v) => !v)}
            className="xl:hidden flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all"
            aria-label="Search"
          >
            <Search className="size-4" />
          </button>

          {isLoggedIn ? (
            <div ref={userMenuRef} className="relative hidden lg:block">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted/70"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                  {userInitials}
                </span>
                <span className="hidden text-foreground lg:inline max-w-[100px] truncate">
                  {user?.firstName || user?.email.split("@")[0]}
                </span>
                <ChevronDown
                  className={cn(
                    "size-3.5 text-muted-foreground transition-transform",
                    userMenuOpen && "rotate-180",
                  )}
                />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 top-full z-40 mt-1 w-48 rounded-xl border border-border/60 bg-white/90 p-1 shadow-lg backdrop-blur-xl"
                    >
                      <div className="px-3 py-2 border-b border-border/40 mb-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user?.email}
                        </p>
                      </div>
                      <Link
                        href="/my-courses"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/50"
                      >
                        <BookOpen className="size-4 text-muted-foreground" />
                        My Courses
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/50"
                      >
                        <Settings className="size-4 text-muted-foreground" />
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                      >
                        <LogOut className="size-4" />
                        Sign Out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-sm font-medium"
                asChild
              >
                <Link href="/login">Sign In</Link>
              </Button>
              <Button
                size="sm"
                className="h-8 px-4 text-sm font-semibold bg-primary hover:bg-primary/90 shadow-sm transition-all"
                asChild
              >
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all lg:hidden"
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={menuOpen ? "x" : "menu"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                {menuOpen ? (
                  <X className="size-4" />
                ) : (
                  <Menu className="size-4" />
                )}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-border/40 xl:hidden"
            >
              <form
                onSubmit={handleSearch}
                className="flex gap-2 px-4 py-3"
                role="search"
              >
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    type="search"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search courses..."
                    className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    aria-label="Search courses"
                  />
                </div>
                <Button type="submit" size="sm" className="shrink-0 h-9">
                  Search
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden border-t border-border lg:hidden"
            >
              <div className="space-y-1 bg-background px-4 py-3">
                <nav
                  className="flex flex-col gap-0.5"
                  aria-label="Mobile navigation"
                >
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        pathname === link.href
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {link.label}
                      <ChevronDown className="size-3.5 -rotate-90 opacity-40" />
                    </Link>
                  ))}
                </nav>
                <div className="flex gap-2 pt-2 border-t border-border/60">
                  {isLoggedIn ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 text-sm text-red-600 border-red-200 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="size-3.5 mr-1" />
                      Sign Out
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 text-sm"
                        asChild
                      >
                        <Link href="/login" onClick={() => setMenuOpen(false)}>
                          Sign In
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-9 text-sm bg-primary"
                        asChild
                      >
                        <Link
                          href="/register"
                          onClick={() => setMenuOpen(false)}
                        >
                          Get Started
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
