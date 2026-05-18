"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/lib/store/auth-store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, LayoutDashboard, BookOpen, Settings, Video } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
export function InstructorNavbar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuthStore();
    const queryClient = useQueryClient();
    const handleLogout = () => {
        logout();
        queryClient.clear();
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    };
    const getUserInitials = () => {
        if (!user)
            return "I";
        const firstName = user.firstName || "";
        const lastName = user.lastName || "";
        if (firstName && lastName) {
            return `${firstName[0]}${lastName[0]}`.toUpperCase();
        }
        return user.email ? user.email[0].toUpperCase() : "I";
    };
    const navItems = [
        { href: "/instructor/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/instructor/courses", label: "My Courses", icon: BookOpen },
        { href: "/instructor/videos", label: "My Videos", icon: Video },
    ];
    return (<header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
      <Link href="/instructor/dashboard" className="flex items-center gap-2">
        <span className="text-xl font-bold tracking-tight">grotutor <span className="text-primary">Instructor</span></span>
      </Link>

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

      <div className="flex items-center gap-3">
        <ModeToggle />
        
        {user && (<DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.firstName} {user.lastName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/instructor/profile">
                  <Settings className="mr-2 h-4 w-4"/>
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4"/>
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>)}
      </div>
    </header>);
}
