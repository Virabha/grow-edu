"use client";
import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/lib/store/auth-store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Settings, LayoutDashboard, UserPlus, } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
export function CorporateNavbar() {
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
            return "C";
        const firstName = user.firstName || "";
        const lastName = user.lastName || "";
        if (firstName && lastName) {
            return `${firstName[0]}${lastName[0]}`.toUpperCase();
        }
        return user.email ? user.email.charAt(0).toUpperCase() : "C";
    };
    return (<motion.header variants={{
            visible: { y: 0 },
            hidden: { y: "-100%" },
        }} animate={hidden ? "hidden" : "visible"} transition={{ duration: 0.35, ease: "easeInOut" }} className={cn("fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4 transition-colors duration-300", scrolled
            ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
            : "bg-background/80 backdrop-blur-sm border-b border-border")}>
      <Link href="/corporate/dashboard" className="flex items-center gap-2.5">
        <Image
          src="/logo.png"
          alt="grotutor"
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-lg object-cover"
          priority
        />
        <span className="font-display text-base font-medium tracking-tight text-foreground hidden sm:inline">
          grotutor <span className="text-primary">Corporate</span>
        </span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        <Button size="sm" variant="outline" className="gap-2 h-9 sm:h-10" asChild>
          <Link href="/corporate/enrollments">
            <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4"/>
            <span className="hidden sm:inline">Bulk Enroll</span>
            <span className="sm:hidden">Enroll</span>
          </Link>
        </Button>

        <ModeToggle />

        {user && (<DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full">
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
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
                : "Corporate Admin"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/corporate/dashboard" className="cursor-pointer">
                  <LayoutDashboard className="mr-2 h-4 w-4"/>
                  <span>Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/corporate/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4"/>
                  <span>Company Settings</span>
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
