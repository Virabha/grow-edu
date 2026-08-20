"use client";
import { PropsWithChildren } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Banknote,
  GraduationCap,
  LayoutDashboard,
  ClipboardList,
  User,
  Video,
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
    label: "My Videos",
    href: "/instructor/videos",
    icon: <Video className="h-4 w-4" />,
  },
  {
    label: "Assignments",
    href: "/instructor/assignments",
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    label: "My sales",
    href: "/instructor/sales",
    icon: <Banknote className="h-4 w-4" />,
  },
  {
    label: "Zoom settings",
    href: "/instructor/zoom",
    icon: <Video className="h-4 w-4" />,
  },
  {
    label: "Jitsi settings",
    href: "/instructor/jitsi",
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
