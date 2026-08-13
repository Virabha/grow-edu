"use client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LayoutDashboard, Users, UserPlus, Settings } from "lucide-react";
const sidebarItems = [
    { label: "Dashboard", href: "/corporate/dashboard", icon: <LayoutDashboard className="h-4 w-4"/> },
    { label: "Users", href: "/corporate/users", icon: <Users className="h-4 w-4"/> },
    { label: "Enrollments", href: "/corporate/enrollments", icon: <UserPlus className="h-4 w-4"/> },
    { label: "Settings", href: "/corporate/settings", icon: <Settings className="h-4 w-4"/> },
];
export default function CorporateLayout({ children, }: {
    children: React.ReactNode;
}) {
    return (<DashboardLayout showSidebar sidebarItems={sidebarItems} showNavbar={false}>
      {children}
    </DashboardLayout>);
}
