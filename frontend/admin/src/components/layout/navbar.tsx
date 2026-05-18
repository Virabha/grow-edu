"use client";
import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/lib/store/auth-store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, LogOut, Settings } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
export function Navbar() {
    const router = useRouter();
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
            return "U";
        const firstName = user.firstName || "";
        const lastName = user.lastName || "";
        if (firstName && lastName) {
            return `${firstName[0]}${lastName[0]}`.toUpperCase();
        }
        return user.email ? user.email[0].toUpperCase() : "U";
    };
    return (<motion.header variants={{
            visible: { y: 0 },
            hidden: { y: "-100%" },
        }} animate={hidden ? "hidden" : "visible"} transition={{ duration: 0.35, ease: "easeInOut" }} className={cn("fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-4 md:px-5 py-2 transition-colors duration-300 h-12 sm:h-14", scrolled
            ? "bg-background/80 backdrop-blur-md border-b border-border"
            : "bg-transparent")}>

      <Link href="/" className="text-sm sm:text-base font-bold tracking-tighter text-foreground">
        <span className="hidden sm:inline">gro</span>
        <span className="text-primary hidden sm:inline">tutor</span>
        <span className="sm:hidden">grotutor</span>
      </Link>


      <nav className="hidden md:flex items-center gap-4 lg:gap-6">
        {[
            { label: "Why grotutor", href: "#why-grotutor" },
            { label: "Categories", href: "#categories" },
            { label: "Courses", href: "#courses" },
            { label: "How It Works", href: "#how-it-works" },
        ].map((item) => (<Link key={item.label} href={item.href} className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
            {item.label}
          </Link>))}
      </nav>


      <div className="flex items-center gap-1.5 sm:gap-2">
        <ModeToggle />
        {user ? (<DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
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
                : "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={user?.role === 'LEARNER' ? "/learner/profile" : "/profile"} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4"/>
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={user?.role === 'PLATFORM_ADMIN' ? "/admin/dashboard" :
                user?.role === 'INSTRUCTOR' ? "/instructor/dashboard" :
                    user?.role === 'CORPORATE_ADMIN' ? "/corporate/dashboard" :
                        "/learner/dashboard"} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4"/>
                  <span>Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4"/>
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>) : (<>
            <Link href="/login">
              <Button variant="outline" className="hidden md:flex border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs px-3 py-1.5">
                <span className="hidden sm:inline">Start Learning Today</span>
                <span className="sm:hidden">Start</span>
              </Button>
            </Link>
          </>)}
      </div>
    </motion.header>);
}
