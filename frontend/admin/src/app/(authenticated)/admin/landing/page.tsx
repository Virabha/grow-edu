"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Image, MessageCircle, HelpCircle, Award, Quote, Briefcase, Users } from "lucide-react";

const sections = [
  { label: "Banners", href: "/admin/landing/banners", icon: Image },
  { label: "FAQs", href: "/admin/landing/faqs", icon: HelpCircle },
  { label: "Why Choose Us", href: "/admin/landing/why-choose-us", icon: Award },
  { label: "Testimonials", href: "/admin/landing/testimonials", icon: Quote },
  { label: "Services", href: "/admin/landing/services", icon: Briefcase },
  { label: "About Us", href: "/admin/landing/about", icon: MessageCircle },
  { label: "Instructors", href: "/admin/landing/instructors", icon: Users },
];

export default function AdminLandingPage() {
  return (
    <PageLayout header="Landing Page" description="Manage content shown on the learner site.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                  <s.icon className="size-6 text-primary" />
                </div>
                <span className="font-medium">{s.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
