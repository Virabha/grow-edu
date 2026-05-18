"use client";
import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/lib/store/auth-store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, LogOut, TrendingUp, BookOpen, ShoppingCart, ArrowLeft, } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
export function LearnerNavbar() {
    const router = useRouter();
    const pathname = usePathname();
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
            return "L";
        const firstName = user.firstName || "";
        const lastName = user.lastName || "";
        if (firstName && lastName) {
            return `${firstName[0]}${lastName[0]}`.toUpperCase();
        }
        return user.email ? user.email[0].toUpperCase() : "L";
    };
    const navItems = [
        { href: "/learner/dashboard", label: "Dashboard", icon: TrendingUp },
        { href: "/learner/courses", label: "Courses", icon: BookOpen },
        { href: "/learner/my-courses", label: "My Courses", icon: BookOpen },
    ];
    return (<motion.header variants={{
            visible: { y: 0 },
            hidden: { y: "-100%" },
        }} animate={hidden ? "hidden" : "visible"} transition={{ duration: 0.35, ease: "easeInOut" }} className={cn("fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4 transition-all duration-300", "bg-background/60 backdrop-blur-xl border-b border-border/40 shadow-lg")}>
      <div className="flex items-center gap-2 sm:gap-4">
        {pathname.split("/").length > 3 && (<Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-1 text-muted-foreground hover:text-foreground" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4"/>
            <span>Back</span>
          </Button>)}
        <Link href="/learner/dashboard" className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-foreground flex items-center gap-1 sm:gap-2">
          <span className="hidden sm:inline">PRIME</span>
          <span className="text-primary hidden sm:inline">LEARNING</span>
          <span className="sm:hidden">PRIME</span>
        </Link>
      </div>

      <nav className="hidden md:flex items-center gap-1">
        {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (<Link key={item.href} href={item.href}>
              <Button variant="ghost" size="sm" className={cn("gap-2 transition-all duration-200 rounded-lg font-medium", isActive
                    ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
                <Icon className="h-4 w-4"/>
                <span>{item.label}</span>
              </Button>
            </Link>);
        })}
      </nav>

      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" className="relative h-9 w-9 sm:h-10 sm:w-10 hover:bg-muted/50 transition-colors" asChild>
          <Link href="/learner/cart">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5"/>
          </Link>
        </Button>

        <ModeToggle />

        {user && (<DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-muted/50 transition-colors">
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
                : "Learner"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/learner/dashboard" className="cursor-pointer">
                  <TrendingUp className="mr-2 h-4 w-4"/>
                  <span>Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/learner/my-courses" className="cursor-pointer">
                  <BookOpen className="mr-2 h-4 w-4"/>
                  <span>My Courses</span>
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
