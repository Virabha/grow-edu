"use client";

import Link from "next/link";
import Image from "next/image";
import { Facebook, Linkedin, Youtube, Instagram, ArrowRight, Mail, Phone, MapPin } from "lucide-react";
import { BRAND } from "@/lib/constants";

const footerLinks = {
  "Quick Links": [
    { label: "About Us", href: "/about-us" },
    { label: "All Courses", href: "/courses" },
    { label: "Loshi Exams", href: "/courses?category=loshi-exams" },
    { label: "Loshi Skills", href: "/courses?category=loshi-skills" },
    { label: "Loshi Language", href: "/courses?category=loshi-language" },
  ],
  Support: [
    { label: "Help Centre", href: "/contact" },
    { label: "Become an Instructor", href: "/become-teacher" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Careers", href: "/careers" },
  ],
};

const schoolHours = [
  { day: "Monday – Friday", time: "9:00 AM – 6:00 PM" },
  { day: "Saturday", time: "10:00 AM – 4:00 PM" },
  { day: "Sunday", time: "Closed" },
];

const socials = [
  { icon: Facebook, href: BRAND.social.facebook, label: "Facebook", color: "#1877f2" },
  { icon: Linkedin, href: BRAND.social.linkedin, label: "LinkedIn", color: "#0a66c2" },
  { icon: Youtube, href: BRAND.social.youtube, label: "YouTube", color: "#ff0000" },
  { icon: Instagram, href: BRAND.social.instagram, label: "Instagram", color: "#e1306c" },
];

export function Footer() {
  return (
    <footer className="bg-[#000052] text-white">
      <div className="container mx-auto px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          {/* Brand / Contact Column */}
          <div className="sm:col-span-2 lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <Image
                src="/logo.jpeg"
                alt="Loshi Edu Logo"
                width={48}
                height={48}
                className="rounded-lg shadow-md transition-transform group-hover:scale-105"
              />
              <span className="text-xl font-black tracking-tight text-white">
                Loshi <span className="text-white/90">Edu</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              Redefining the future of learning — bridging the gap between aspiration and achievement. At Loshi Edu Tech, we don&apos;t just teach; we transform potential into performance.
            </p>

            <div className="mt-5 space-y-2.5 text-sm text-white/70">
              <a
                href={`mailto:${BRAND.email}`}
                className="flex items-center gap-2.5 transition-colors hover:text-white"
              >
                <Mail className="size-4 shrink-0" />
                {BRAND.email}
              </a>
              <a
                href={`tel:${BRAND.phone.replace(/[^+\d]/g, "")}`}
                className="flex items-center gap-2.5 transition-colors hover:text-white"
              >
                <Phone className="size-4 shrink-0" />
                {BRAND.phone}
              </a>
              <p className="flex items-start gap-2.5">
                <MapPin className="size-4 shrink-0 mt-0.5" />
                {BRAND.address}
              </p>
            </div>

            <div className="mt-5 flex gap-2.5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex size-9 items-center justify-center rounded-full border border-white/30 text-white/80 transition-all hover:border-transparent hover:text-white"
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    el.style.background = s.color;
                    el.style.borderColor = s.color;
                    el.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.background = "";
                    el.style.borderColor = "";
                    el.style.color = "";
                  }}
                >
                  <s.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="lg:col-span-2">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-white">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {footerLinks["Quick Links"].map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="group flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
                  >
                    <ArrowRight className="size-3 opacity-0 -ml-4 transition-all group-hover:opacity-100 group-hover:ml-0" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Column */}
          <div className="lg:col-span-2">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-white">
              Support
            </h4>
            <ul className="space-y-2.5">
              {footerLinks["Support"].map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="group flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
                  >
                    <ArrowRight className="size-3 opacity-0 -ml-4 transition-all group-hover:opacity-100 group-hover:ml-0" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* School Hours + Join Us Column */}
          <div className="lg:col-span-4">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-white">
              School Hours
            </h4>
            <ul className="space-y-2.5">
              {schoolHours.map((h) => (
                <li key={h.day} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">{h.day}</span>
                  <span className="text-white font-medium">{h.time}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-primary shadow-lg transition-all hover:bg-white/90 hover:shadow-xl hover:scale-105"
            >
              JOIN US NOW
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/15 pt-6 text-xs text-white/50 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Loshi EduTech Pvt Ltd. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy-policy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
            <Link href="/contact" className="transition-colors hover:text-white">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
