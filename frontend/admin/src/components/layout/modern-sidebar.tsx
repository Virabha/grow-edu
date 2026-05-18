"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ReactNode, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Menu, X, LogOut, Moon, Sun } from "lucide-react";
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
export function ModernSidebar({ items, className }: ModernSidebarProps) {
    const pathname = usePathname();
    const { collapsed, toggleCollapsed } = useSidebar();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { logout } = useAuthStore();
    const queryClient = useQueryClient();
    const { setTheme, theme, resolvedTheme } = useTheme();

    useEffect(() => { setMounted(true); }, []);

    const sidebarVariants = {
        expanded: { width: "220px" },
        collapsed: { width: "56px" },
    };
    const handleLogout = () => {
        logout();
        queryClient.clear();
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    };
    const toggleTheme = () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo + collapse toggle */}
            <div className="px-2 py-2 border-b border-border bg-card">
                <div className={cn("flex items-center min-h-[32px]", collapsed ? "justify-center" : "justify-between")}>
                    <Link href="/" className="flex items-center gap-2 overflow-hidden shrink-0">
                        <Image src="/logo.jpeg" alt="grotutor" width={28} height={28} className="rounded-md h-7 w-7 object-cover shrink-0" />
                        <AnimatePresence>
                            {!collapsed && (
                                <motion.span
                                    key="logo-text"
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: "auto" }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="text-sm font-bold tracking-tight text-foreground whitespace-nowrap overflow-hidden"
                                >
                                    <span className="text-primary">gro</span>tutor
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </Link>
                    <button
                        onClick={toggleCollapsed}
                        className={cn(
                            "hidden lg:flex items-center justify-center h-6 w-6 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0",
                            collapsed && "mt-1"
                        )}
                    >
                        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                    </button>
                </div>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
                {items.map((item) => {
                    const isActive = pathname === item.href || (pathname?.startsWith(item.href + "/") && item.href !== "/");
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                collapsed && "justify-center px-0"
                            )}
                        >
                            {item.icon && (
                                <span className="shrink-0 w-4 h-4">
                                    {item.icon}
                                </span>
                            )}
                            <AnimatePresence>
                                {!collapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: "auto" }}
                                        exit={{ opacity: 0, width: 0 }}
                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                        className="flex-1 whitespace-nowrap"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                            {item.badge && !collapsed && (
                                <span className={cn(
                                    "px-1.5 py-0.5 text-[10px] rounded-full",
                                    isActive
                                        ? "bg-primary-foreground/20 text-primary-foreground"
                                        : "bg-muted text-muted-foreground"
                                )}>
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom actions */}
            <div className="px-2 py-2 border-t border-border space-y-0.5">
                {/* Theme toggle — entire row clickable */}
                <button
                    onClick={toggleTheme}
                    className={cn(
                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 w-full",
                        "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        collapsed && "justify-center"
                    )}
                >
                    <span className="shrink-0 w-4 h-4 flex items-center justify-center">
                        {mounted && resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </span>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="flex-1 whitespace-nowrap text-left"
                            >
                                {mounted && resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className={cn(
                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 w-full",
                        "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                        collapsed && "justify-center"
                    )}
                >
                    <span className="shrink-0 w-4 h-4 flex items-center justify-center">
                        <LogOut className="w-4 h-4" />
                    </span>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="flex-1 whitespace-nowrap text-left"
                            >
                                Sign Out
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile menu button */}
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-2 left-2 z-50 lg:hidden h-8 w-8 bg-background/95 backdrop-blur-sm border border-border shadow-md hover:bg-background rounded-md"
                onClick={() => setMobileOpen(!mobileOpen)}
            >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>

            {/* Mobile sidebar */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="fixed left-0 top-0 h-screen w-60 border-r border-border bg-card shadow-2xl z-50 lg:hidden"
                        >
                            <div className="flex flex-col h-full">
                                <div className="px-3 py-2 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
                                    <div className="flex items-center justify-between">
                                        <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                                            <Image src="/logo.jpeg" alt="grotutor" width={24} height={24} className="rounded-md h-6 w-6 object-cover" />
                                            <span className="text-sm font-bold tracking-tight text-foreground">
                                                <span className="text-primary">gro</span>tutor
                                            </span>
                                        </Link>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMobileOpen(false)}>
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                                <nav className="flex-1 px-2 py-1.5 space-y-0.5 overflow-y-auto">
                                    {items.map((item) => {
                                        const isActive = pathname === item.href || (pathname?.startsWith(item.href + "/") && item.href !== "/");
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setMobileOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
                                                    isActive
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                                )}
                                            >
                                                {item.icon && (
                                                    <span className="shrink-0 w-4 h-4">{item.icon}</span>
                                                )}
                                                <span className="flex-1">{item.label}</span>
                                                {item.badge && (
                                                    <span className={cn(
                                                        "px-1.5 py-0.5 text-[10px] font-semibold rounded-full",
                                                        isActive
                                                            ? "bg-primary-foreground/20 text-primary-foreground"
                                                            : "bg-muted text-muted-foreground"
                                                    )}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </nav>
                                <div className="px-2 py-1.5 border-t border-border space-y-0.5">
                                    <button
                                        onClick={toggleTheme}
                                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-150 w-full text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    >
                                        {mounted && resolvedTheme === "dark" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
                                        <span className="flex-1 text-left">{mounted && resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-150 w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <LogOut className="w-4 h-4 shrink-0" />
                                        <span className="flex-1 text-left">Logout</span>
                                    </button>
                                </div>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop sidebar */}
            <motion.aside
                variants={sidebarVariants}
                animate={collapsed ? "collapsed" : "expanded"}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className={cn("hidden lg:block fixed left-0 top-0 h-screen border-r border-border bg-card z-40", className)}
            >
                <SidebarContent />
            </motion.aside>
        </>
    );
}
