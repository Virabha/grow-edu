"use client";
import { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Building2,
  CreditCard,
  Shield,
  Settings,
  Tag,
  Layers,
  Layout,
  FileText,
  Library,
  GraduationCap,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** Defaults to PLATFORM_ADMIN only when omitted. */
  roles?: Array<"PLATFORM_ADMIN" | "INSTRUCTOR">;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Batches",
    href: "/admin/batches",
    icon: <GraduationCap className="h-4 w-4" />,
    roles: ["PLATFORM_ADMIN", "INSTRUCTOR"],
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: <Users className="h-4 w-4" />,
  },
  {
    label: "Courses",
    href: "/admin/courses",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    label: "Books",
    href: "/admin/books",
    icon: <Library className="h-4 w-4" />,
  },
  {
    label: "Categories",
    href: "/admin/categories",
    icon: <Layers className="h-4 w-4" />,
  },
  {
    label: "Companies",
    href: "/admin/companies",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    label: "Enrollments",
    href: "/admin/enrollments",
    icon: <Users className="h-4 w-4" />,
  },
  {
    label: "Payments",
    href: "/admin/payments",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    label: "Coupons",
    href: "/admin/coupons",
    icon: <Tag className="h-4 w-4" />,
  },
  {
    label: "Moderation",
    href: "/admin/moderation",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    label: "Landing Page",
    href: "/admin/landing",
    icon: <Layout className="h-4 w-4" />,
  },
  {
    label: "Instructor Applications",
    href: "/admin/teacher-applications",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();
  const role = user?.role;

  const sidebarItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      const allowed = item.roles ?? ["PLATFORM_ADMIN"];
      return role ? allowed.includes(role as "PLATFORM_ADMIN" | "INSTRUCTOR") : false;
    });
  }, [role]);

  return (
    <DashboardLayout showSidebar sidebarItems={sidebarItems} showNavbar={false}>
      {children}
    </DashboardLayout>
  );
}
