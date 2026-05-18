import type { Metadata } from "next";
import Link from "next/link";
import {
  Heart,
  Zap,
  Globe,
  GraduationCap,
  MapPin,
  Clock,
  Building2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join grotutor and help shape the future of education in India. Explore open positions in engineering, content, marketing, and more.",
};

const cultureValues = [
  {
    icon: Zap,
    title: "Innovation First",
    desc: "We encourage bold ideas and creative problem-solving. Every team member has the freedom to experiment and push boundaries.",
    color: "#f97316",
  },
  {
    icon: Heart,
    title: "People-Centric",
    desc: "Our team is our greatest asset. We invest in growth, well-being, and a supportive work environment for everyone.",
    color: "#ec4899",
  },
  {
    icon: Globe,
    title: "Impact at Scale",
    desc: "Your work directly impacts 50,000+ learners across India. Build products that truly change lives through education.",
    color: "#10b981",
  },
  {
    icon: GraduationCap,
    title: "Continuous Learning",
    desc: "Free access to all grotutor courses, dedicated learning hours, conference budgets, and mentorship programs.",
    color: "#3b82f6",
  },
];

const positions = [
  {
    title: "Frontend Developer",
    department: "Engineering",
    location: "Hyderabad",
    type: "Full-time",
    description:
      "Build beautiful, performant user interfaces for our learning platform using React, Next.js, and TypeScript.",
  },
  {
    title: "Backend Developer",
    department: "Engineering",
    location: "Hyderabad",
    type: "Full-time",
    description:
      "Design and develop scalable APIs, microservices, and data pipelines powering the grotutor platform.",
  },
  {
    title: "Content Creator",
    department: "Content & Curriculum",
    location: "Hyderabad",
    type: "Full-time",
    description:
      "Create engaging educational content, course outlines, assessments, and multimedia learning materials.",
  },
  {
    title: "Marketing Specialist",
    department: "Growth & Marketing",
    location: "Hyderabad",
    type: "Full-time",
    description:
      "Drive user acquisition and brand awareness through digital marketing, SEO, social media, and performance campaigns.",
  },
  {
    title: "Academic Counselor",
    department: "Student Success",
    location: "Hyderabad",
    type: "Full-time",
    description:
      "Guide prospective and current students in choosing the right courses and career paths aligned with their goals.",
  },
];

const perks = [
  "Competitive salary & performance bonuses",
  "Free access to all grotutor courses",
  "Flexible working hours & hybrid model",
  "Health insurance for you & family",
  "Annual learning & conference budget",
  "Team outings & celebrations",
];

export default function CareersPage() {
  return (
    <main>
        <section className="border-b border-border bg-gradient-to-br from-primary/5 via-background to-[#3b82f6]/5 py-12 md:py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Join Our Team
              </p>
              <h1 className="mt-2 text-3xl font-black text-foreground sm:text-4xl md:text-5xl">
                Careers at{" "}
                <span className="text-primary">grotutor</span>
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                Help us build the future of education in India. We&apos;re
                looking for passionate individuals who want to make quality
                learning accessible to everyone.
              </p>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Why grotutor
              </p>
              <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
                Our Culture & Values
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cultureValues.map((v) => (
                <div
                  key={v.title}
                  className="rounded-xl border border-border/60 bg-white/60 backdrop-blur-sm p-5 transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div
                    className="mb-3 flex size-10 items-center justify-center rounded-xl"
                    style={{ background: `${v.color}15` }}
                  >
                    <v.icon className="size-5" style={{ color: v.color }} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    {v.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-muted/20 py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Perks & Benefits
              </p>
              <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
                What We Offer
              </h2>
            </div>
            <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2">
              {perks.map((perk) => (
                <div
                  key={perk}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-white/60 backdrop-blur-sm px-4 py-3 text-sm text-foreground"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  {perk}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Open Positions
              </p>
              <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
                Current Openings
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Find your perfect role and help us transform education.
              </p>
            </div>
            <div className="mx-auto max-w-3xl space-y-4">
              {positions.map((pos) => (
                <div
                  key={pos.title}
                  className="group rounded-xl border border-border/60 bg-white/60 backdrop-blur-sm p-5 transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-foreground">
                        {pos.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {pos.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3" />
                          {pos.department}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {pos.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {pos.type}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 gap-1.5"
                      asChild
                    >
                      <a href="mailto:careers@grotutor.com?subject=Application for ${pos.title}">
                        Apply Now
                        <ArrowRight className="size-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-gradient-to-br from-primary to-[#3b82f6] p-8 text-center text-white">
              <h2 className="text-2xl font-black sm:text-3xl">
                Don&apos;t See Your Role?
              </h2>
              <p className="mt-2 text-sm text-white/80">
                We&apos;re always looking for talented people. Send us your
                resume and we&apos;ll keep you in mind for future openings.
              </p>
              <div className="mt-5">
                <Button
                  size="sm"
                  className="gap-2 bg-white text-primary font-bold hover:bg-white/90 shadow-lg"
                  asChild
                >
                  <a href="mailto:careers@grotutor.com?subject=General Application">
                    Send Your Resume
                    <ArrowRight className="size-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
    </main>
  );
}
