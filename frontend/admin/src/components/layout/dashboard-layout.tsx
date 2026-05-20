"use client";
import { ReactNode } from "react";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { ModernSidebar } from "./modern-sidebar";
import { cn } from "@/lib/utils";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar-provider";
interface SidebarItem {
    label: string;
    href: string;
    icon?: ReactNode;
    badge?: string | number;
}
interface DashboardLayoutProps {
    children: ReactNode;
    showNavbar?: boolean;
    showFooter?: boolean;
    showSidebar?: boolean;
    customNavbar?: ReactNode;
    sidebarItems?: SidebarItem[];
}
function DashboardLayoutContent({ children, showNavbar = true, customNavbar, showFooter = false, showSidebar = false, sidebarItems = [], }: DashboardLayoutProps) {
    const { collapsed } = useSidebar();
    return (<div className="min-h-screen bg-background flex flex-col">
      {showNavbar && (customNavbar || <Navbar />)}
      <div className={cn("flex flex-1", showNavbar && "pt-12 sm:pt-14")}>
        {showSidebar && <ModernSidebar items={sidebarItems}/>}
        <main className={cn("flex-1 transition-all duration-300 w-full max-w-full overflow-x-hidden", showSidebar && (collapsed ? "lg:ml-[60px]" : "lg:ml-[232px]"))}>
          <div className="w-full max-w-full">{children}</div>
        </main>
      </div>
      {showFooter && <Footer />}
    </div>);
}
export function DashboardLayout(props: DashboardLayoutProps) {
    return (<SidebarProvider>
      <DashboardLayoutContent {...props}/>
    </SidebarProvider>);
}
