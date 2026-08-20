"use client";

import Link from "next/link";
import {
  BarChart3,
  ChevronRight,
  Cookie,
  CreditCard,
  Image as ImageIcon,
  LifeBuoy,
  Mail,
  Map,
  MessageCircle,
  Navigation,
  Palette,
  Percent,
  Search,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent } from "@/components/ui/card";

interface SettingLink {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface SettingGroup {
  title: string;
  items: SettingLink[];
}

const GROUPS: SettingGroup[] = [
  {
    title: "Platform",
    items: [
      { href: "/admin/settings/general", label: "General", description: "Site identity, contact details and platform switches.", icon: <SettingsIcon className="h-4 w-4" /> },
      { href: "/admin/settings/logo", label: "Logo and favicon", description: "Marks used in the app, browser tab and social shares.", icon: <ImageIcon className="h-4 w-4" /> },
      { href: "/admin/settings/maintenance", label: "Maintenance mode", description: "Take the site offline for learners while you work.", icon: <Wrench className="h-4 w-4" /> },
    ],
  },
  {
    title: "Appearance",
    items: [
      { href: "/admin/themes", label: "Site theme", description: "Which layout the public site renders with.", icon: <Palette className="h-4 w-4" /> },
      { href: "/admin/settings/theme-colour", label: "Theme colour", description: "The palette applied across the learner site.", icon: <Palette className="h-4 w-4" /> },
      { href: "/admin/home-sections", label: "Home sections", description: "Which blocks appear on the home page, and their order.", icon: <Navigation className="h-4 w-4" /> },
      { href: "/admin/menu-builder", label: "Menu builder", description: "Header and footer navigation.", icon: <Navigation className="h-4 w-4" /> },
      { href: "/admin/settings/footer", label: "Footer", description: "Footer copy, headings and blocks.", icon: <Navigation className="h-4 w-4" /> },
      { href: "/admin/settings/breadcrumb", label: "Breadcrumb", description: "The navigation strip on inner pages.", icon: <ChevronRight className="h-4 w-4" /> },
      { href: "/admin/settings/google-map", label: "Google map", description: "The embedded map on the contact page.", icon: <Map className="h-4 w-4" /> },
    ],
  },
  {
    title: "Commerce",
    items: [
      { href: "/admin/settings/payment-gateway", label: "Payment gateways", description: "Razorpay, PhonePe and UPI transfer.", icon: <CreditCard className="h-4 w-4" /> },
      { href: "/admin/settings/payments", label: "UPI / QR details", description: "The bank details shown at manual checkout.", icon: <CreditCard className="h-4 w-4" /> },
      { href: "/admin/settings/commission", label: "Commission", description: "How revenue splits with instructors.", icon: <Percent className="h-4 w-4" /> },
    ],
  },
  {
    title: "Communication",
    items: [
      { href: "/admin/settings/email", label: "Email", description: "Provider and sender for transactional mail.", icon: <Mail className="h-4 w-4" /> },
      { href: "/admin/settings/sms", label: "SMS", description: "Provider and sender id for OTP messages.", icon: <Smartphone className="h-4 w-4" /> },
      { href: "/admin/settings/tawk", label: "Live chat", description: "Embed the Tawk support widget.", icon: <MessageCircle className="h-4 w-4" /> },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/admin/settings/seo", label: "SEO", description: "Meta tags, sitemap and structured data.", icon: <Search className="h-4 w-4" /> },
      { href: "/admin/settings/analytics", label: "Google Analytics", description: "Send page and event data to GA4.", icon: <BarChart3 className="h-4 w-4" /> },
      { href: "/admin/settings/gtm", label: "Tag Manager", description: "Load a GTM container on every page.", icon: <BarChart3 className="h-4 w-4" /> },
      { href: "/admin/settings/gtm-data-layer", label: "GTM data layer", description: "Which commerce events get pushed.", icon: <BarChart3 className="h-4 w-4" /> },
      { href: "/admin/settings/facebook-pixel", label: "Facebook Pixel", description: "Conversion tracking for Meta campaigns.", icon: <BarChart3 className="h-4 w-4" /> },
    ],
  },
  {
    title: "Security and access",
    items: [
      { href: "/admin/admins", label: "Admins", description: "Who can reach this dashboard.", icon: <Users className="h-4 w-4" /> },
      { href: "/admin/admin-roles", label: "Roles and permissions", description: "What each group of admins may do.", icon: <Shield className="h-4 w-4" /> },
      { href: "/admin/settings/social-login", label: "Social login", description: "Sign in with Google or Facebook.", icon: <ShieldCheck className="h-4 w-4" /> },
      { href: "/admin/settings/recaptcha", label: "reCAPTCHA", description: "Bot protection on public forms.", icon: <ShieldCheck className="h-4 w-4" /> },
      { href: "/admin/settings/cookie", label: "Cookie consent", description: "The banner shown to new visitors.", icon: <Cookie className="h-4 w-4" /> },
    ],
  },
  {
    title: "Maintenance",
    items: [
      { href: "/admin/settings/clear-cache", label: "Clear cache", description: "Drop cached pages, images and API responses.", icon: <Trash2 className="h-4 w-4" /> },
      { href: "/admin/settings/clear-database", label: "Reset demo data", description: "Restore every record to its seeded state.", icon: <LifeBuoy className="h-4 w-4" /> },
    ],
  },
];

export default function SettingsPage() {
  return (
    <PageLayout
      subtitle="Platform"
      header="Settings"
      description="Everything that configures how grotutor looks, charges and communicates."
    >
      <div className="space-y-6">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.title}
            </h2>
            <div className="grid gap-2 [&>*]:min-w-0 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className="group">
                  <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-accent/30">
                    <CardContent className="flex items-start gap-3 py-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {item.label}
                        </span>
                        <span className="block text-xs leading-snug text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageLayout>
  );
}
