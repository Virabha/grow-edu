"use client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminNavbar } from "@/components/layout/admin-navbar";
import { LayoutDashboard, Users, BookOpen, Building2, CreditCard, Shield, Settings, Tag, Layers, Layout, FileText, Library, QrCode } from "lucide-react";
const sidebarItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="h-4 w-4"/> },
    { label: "Users", href: "/admin/users", icon: <Users className="h-4 w-4"/> },
    { label: "Courses", href: "/admin/courses", icon: <BookOpen className="h-4 w-4"/> },
    { label: "Books", href: "/admin/books", icon: <Library className="h-4 w-4"/> },
    { label: "Categories", href: "/admin/categories", icon: <Layers className="h-4 w-4"/> },
    { label: "Companies", href: "/admin/companies", icon: <Building2 className="h-4 w-4"/> },
    { label: "Enrollments", href: "/admin/enrollments", icon: <Users className="h-4 w-4"/> },
    { label: "Payments", href: "/admin/payments", icon: <CreditCard className="h-4 w-4"/> },
    { label: "Coupons", href: "/admin/coupons", icon: <Tag className="h-4 w-4"/> },
    { label: "Moderation", href: "/admin/moderation", icon: <Shield className="h-4 w-4"/> },
    { label: "Landing Page", href: "/admin/landing", icon: <Layout className="h-4 w-4"/> },
    { label: "Instructor Applications", href: "/admin/teacher-applications", icon: <FileText className="h-4 w-4"/> },
    { label: "Settings", href: "/admin/settings", icon: <Settings className="h-4 w-4"/> },
    { label: "Payment Settings", href: "/admin/settings/payments", icon: <QrCode className="h-4 w-4"/> },
];
export default function AdminLayout({ children, }: {
    children: React.ReactNode;
}) {
    return (<DashboardLayout showSidebar sidebarItems={sidebarItems} showNavbar={false}>
      {children}
    </DashboardLayout>);
}
