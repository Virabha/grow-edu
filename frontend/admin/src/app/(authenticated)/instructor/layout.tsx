"use client";
import { PropsWithChildren } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  LayoutDashboard,
  BookOpen,
  Video,
  User,
  GraduationCap,
  Cast,
} from "lucide-react";

const sidebarItems = [
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
  {
    label: "Live Settings",
    href: "/instructor/settings/live",
    icon: <Cast className="h-4 w-4" />,
  },
];

export default function InstructorLayout({ children }: PropsWithChildren) {
  return (
    <DashboardLayout showSidebar sidebarItems={sidebarItems} showNavbar={false}>
      {children}
    </DashboardLayout>
  );
}
