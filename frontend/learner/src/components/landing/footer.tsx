"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Facebook,
  Linkedin,
  Youtube,
  Instagram,
  ArrowUpRight,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { BRAND } from "@/lib/constants";

const footerLinks = {
  Learn: [
    { label: "All courses", href: "/courses" },
    { label: "Academics", href: "/courses?category=academics" },
    { label: "Executive programs", href: "/courses?category=executive-and-certificate-program" },
    { label: "Languages", href: "/courses?category=language" },
    { label: "Instructors", href: "/instructors" },
  ],
  Company: [
    { label: "Become an instructor", href: "/become-teacher" },
    { label: "Services", href: "/services" },
    { label: "Careers", href: "/careers" },
    { label: "Privacy policy", href: "/privacy-policy" },
    { label: "Terms of service", href: "/terms" },
  ],
};

const socials = [
  { icon: Facebook, href: BRAND.social.facebook, label: "Facebook" },
  { icon: Linkedin, href: BRAND.social.linkedin, label: "LinkedIn" },
  { icon: Youtube, href: BRAND.social.youtube, label: "YouTube" },
  { icon: Instagram, href: BRAND.social.instagram, label: "Instagram" },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-foreground text-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      <div className="relative container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image
                src="/logo.jpeg"
                alt="grotutor"
                width={52}
                height={52}
                className="rounded-xl"
              />
              <span className="font-display text-2xl font-medium tracking-tight">
                grotutor
              </span>
            </Link>

            <p className="font-display mt-7 max-w-md text-xl leading-snug text-background/85 sm:text-2xl">
              A learning house for serious people —{" "}
              <em className="text-primary">redefining the future</em> of online
              education in India.
            </p>

            <div className="mt-8 space-y-2.5 text-sm text-background/70">
              <a
                href={`mailto:${BRAND.email}`}
                className="flex items-center gap-2.5 transition-colors hover:text-background"
              >
                <Mail className="size-4 shrink-0 text-primary" />
                {BRAND.email}
              </a>
              <a
                href={`tel:${BRAND.phone.replace(/[^+\d]/g, "")}`}
                className="flex items-center gap-2.5 transition-colors hover:text-background"
              >
                <Phone className="size-4 shrink-0 text-primary" />
                {BRAND.phone}
              </a>
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                {BRAND.address}
              </p>
            </div>

            <div className="mt-7 flex gap-2.5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex size-10 items-center justify-center rounded-full border border-white/15 text-background/80 transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <s.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 lg:col-span-5 lg:col-start-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <h4 className="font-display text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Learn
              </h4>
              <ul className="mt-5 space-y-3">
                {footerLinks.Learn.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="group inline-flex items-center gap-1.5 text-sm text-background/75 transition-colors hover:text-background"
                    >
                      {l.label}
                      <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-display text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Company
              </h4>
              <ul className="mt-5 space-y-3">
                {footerLinks.Company.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="group inline-flex items-center gap-1.5 text-sm text-background/75 transition-colors hover:text-background"
                    >
                      {l.label}
                      <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-background/55 sm:flex-row sm:items-center">
          <p>
            &copy; {new Date().getFullYear()} grotutor. All rights reserved.
          </p>
          <p className="font-display italic text-background/45">
            Designed in Hyderabad. Built for India.
          </p>
        </div>
      </div>
    </footer>
  );
}
