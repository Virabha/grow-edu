"use client";
import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/lib/store/auth-store";
import { useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Settings, LayoutDashboard, Shield, Bell, } from "lucide-react";
import { Badge } from "@/components/ui/badge";
export function AdminNavbar() {
    const { scrollY } = useScroll();
    const [hidden, setHidden] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { user, logout } = useAuthStore();
    const queryClient = useQueryClient();
    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() ?? 0;
        if (latest > previous && latest > 150) {
            setHidden(true);
        }
        else {
            setHidden(false);
        }
        setScrolled(latest > 50);
    });
    const handleLogout = () => {
        logout();
        queryClient.clear();
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    };
    const getUserInitials = () => {
        if (!user)
            return "A";
        const firstName = user.firstName || "";
        const lastName = user.lastName || "";
        if (firstName && lastName) {
            return `${firstName[0]}${lastName[0]}`.toUpperCase();
        }
        return user.email ? user.email.charAt(0).toUpperCase() : "A";
    };
    return (<motion.header variants={{
            visible: { y: 0 },
            hidden: { y: "-100%" },
        }} animate={hidden ? "hidden" : "visible"} transition={{ duration: 0.35, ease: "easeInOut" }} className={cn("fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-4 md:px-5 py-2 transition-colors duration-300 h-12 sm:h-14", scrolled
            ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
            : "bg-background/80 backdrop-blur-sm border-b border-border")}>
      <Link href="/admin/dashboard" className="text-sm sm:text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
        <Shield className="h-4 w-4 text-primary"/>
        <span className="hidden sm:inline">grotutor</span>
        <span className="text-primary hidden sm:inline ml-1">Admin</span>
        <span className="sm:hidden text-primary">Admin</span>
      </Link>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button variant="ghost" size="icon" className="relative h-8 w-8" asChild>
          <Link href="/admin/moderation">
            <Bell className="h-4 w-4"/>
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background" />
          </Link>
        </Button>

        <ModeToggle />

        {user && (<DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : "Admin User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                  <Badge variant="secondary" className="w-fit mt-1 text-xs">
                    {user.role === "PLATFORM_ADMIN" ? "Platform Admin" : user.role === "INSTRUCTOR" ? "Instructor" : user.role === "CORPORATE_ADMIN" ? "Corporate Admin" : "User"}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/dashboard" className="cursor-pointer">
                  <LayoutDashboard className="mr-2 h-4 w-4"/>
                  <span>Admin Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4"/>
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4"/>
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>)}
      </div>
    </motion.header>);
}
