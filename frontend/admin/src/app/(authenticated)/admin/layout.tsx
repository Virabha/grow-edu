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
  Award,
  Banknote,
  Blocks,
  Globe,
  Languages,
  Mail,
  MapPin,
  Megaphone,
  Menu as MenuIcon,
  MessageSquare,
  Newspaper,
  Palette,
  ScrollText,
  Send,
  Sparkles,
  Star,
  UserPlus,
  Video as VideoIcon,
  Wallet,
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
    label: "Course reviews",
    href: "/admin/course-reviews",
    icon: <Star className="h-4 w-4" />,
  },
  {
    label: "Course languages",
    href: "/admin/course-languages",
    icon: <Languages className="h-4 w-4" />,
  },
  {
    label: "Certificate builder",
    href: "/admin/certificate-builder",
    icon: <ScrollText className="h-4 w-4" />,
  },
  {
    label: "Instructor badges",
    href: "/admin/badges",
    icon: <Award className="h-4 w-4" />,
  },
  {
    label: "Manual enrolment",
    href: "/admin/manual-enrollment",
    icon: <UserPlus className="h-4 w-4" />,
  },
  {
    label: "Blog posts",
    href: "/admin/blog/posts",
    icon: <Newspaper className="h-4 w-4" />,
  },
  {
    label: "Blog categories",
    href: "/admin/blog/categories",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    label: "Withdraw methods",
    href: "/admin/withdraw-methods",
    icon: <Wallet className="h-4 w-4" />,
  },
  {
    label: "Payout requests",
    href: "/admin/payouts",
    icon: <Banknote className="h-4 w-4" />,
  },
  {
    label: "Locations",
    href: "/admin/locations",
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    label: "Site languages",
    href: "/admin/languages",
    icon: <Globe className="h-4 w-4" />,
  },
  {
    label: "Multi-currency",
    href: "/admin/currencies",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    label: "Site theme",
    href: "/admin/themes",
    icon: <Palette className="h-4 w-4" />,
  },
  {
    label: "Home sections",
    href: "/admin/home-sections",
    icon: <Blocks className="h-4 w-4" />,
  },
  {
    label: "Menu builder",
    href: "/admin/menu-builder",
    icon: <MenuIcon className="h-4 w-4" />,
  },
  {
    label: "Page builder",
    href: "/admin/page-builder",
    icon: <Layout className="h-4 w-4" />,
  },
  {
    label: "Brands",
    href: "/admin/brands",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    label: "Social links",
    href: "/admin/social-links",
    icon: <Send className="h-4 w-4" />,
  },
  {
    label: "Subscribers",
    href: "/admin/subscribers",
    icon: <Mail className="h-4 w-4" />,
  },
  {
    label: "Contact messages",
    href: "/admin/contact-messages",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    label: "Admins",
    href: "/admin/admins",
    icon: <Users className="h-4 w-4" />,
  },
  {
    label: "Roles & permissions",
    href: "/admin/admin-roles",
    icon: <Shield className="h-4 w-4" />,
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
    label: "Live sessions",
    href: "/instructor/live-sessions",
    icon: <VideoIcon className="h-4 w-4" />,
  },
  {
    label: "Announcements",
    href: "/instructor/announcements",
    icon: <Megaphone className="h-4 w-4" />,
  },
  {
    label: "My sales",
    href: "/instructor/sales",
    icon: <Banknote className="h-4 w-4" />,
  },
  {
    label: "Request payout",
    href: "/instructor/payouts",
    icon: <Wallet className="h-4 w-4" />,
  },
  {
    label: "Zoom settings",
    href: "/instructor/zoom",
    icon: <VideoIcon className="h-4 w-4" />,
  },
  {
    label: "Jitsi settings",
    href: "/instructor/jitsi",
    icon: <VideoIcon className="h-4 w-4" />,
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
