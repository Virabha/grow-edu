"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  Briefcase,
  HelpCircle,
  Image as ImageIcon,
  MessageCircle,
  Quote,
  Users,
} from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";

const sections = [
  {
    label: "Banners",
    description: "Hero rotator on the homepage",
    href: "/admin/landing/banners",
    icon: ImageIcon,
  },
  {
    label: "FAQs",
    description: "Questions answered on the home page",
    href: "/admin/landing/faqs",
    icon: HelpCircle,
  },
  {
    label: "Why choose us",
    description: "Six promises bento block",
    href: "/admin/landing/why-choose-us",
    icon: Award,
  },
  {
    label: "Testimonials",
    description: "Learner quotes",
    href: "/admin/landing/testimonials",
    icon: Quote,
  },
  {
    label: "Services",
    description: "Service offerings (if surfaced)",
    href: "/admin/landing/services",
    icon: Briefcase,
  },
  {
    label: "About",
    description: "About page content",
    href: "/admin/landing/about",
    icon: MessageCircle,
  },
  {
    label: "Instructors",
    description: "Faculty profiles on the home page",
    href: "/admin/landing/instructors",
    icon: Users,
  },
];

export default function AdminLandingPage() {
  return (
    <PageLayout
      subtitle="Console"
      header="Landing page"
      description="Manage every block of content shown on the learner-facing site."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex items-center gap-4 min-w-0">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-primary">
                <s.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-base font-medium text-foreground">
                  {s.label}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.description}
                </p>
              </div>
            </div>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
