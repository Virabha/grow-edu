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
  Video,
  User,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth-store";

type Role = "PLATFORM_ADMIN" | "INSTRUCTOR";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** Defaults to PLATFORM_ADMIN only when omitted. */
  roles?: Role[];
}

const ADMIN_NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Batches",
    href: "/admin/batches",
    icon: <GraduationCap className="h-4 w-4" />,
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

const INSTRUCTOR_NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/instructor/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: "Batches",
    href: "/admin/batches",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    label: "My Courses",
    href: "/instructor/courses",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    label: "My Videos",
    href: "/instructor/videos",
    icon: <Video className="h-4 w-4" />,
  },
  {
    label: "Profile",
    href: "/instructor/profile",
    icon: <User className="h-4 w-4" />,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuthStore();
  const role = user?.role as Role | undefined;

  const sidebarItems = useMemo(() => {
    if (role === "INSTRUCTOR") return INSTRUCTOR_NAV;
    return ADMIN_NAV;
  }, [role]);

  return (
    <DashboardLayout showSidebar sidebarItems={sidebarItems} showNavbar={false}>
      {children}
    </DashboardLayout>
  );
}
