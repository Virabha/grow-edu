"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Award,
  Users,
  Clock,
  Sparkles,
  Target,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { useWhyChooseUs } from "@/lib/hooks/use-cms";
import { getLucideIcon } from "@/lib/lucide-icons";

const fallbackFeatures = [
  {
    Icon: Users,
    title: "Mentors who&apos;ve done it",
    description:
      "Learn from instructors with real product, research, and classroom track records — not just credentials.",
  },
  {
    Icon: Target,
    title: "Outcome-first curriculum",
    description:
      "Every course is built around concrete skills, projects, and assessments — designed for what employers hire for.",
  },
  {
    Icon: Clock,
    title: "Learn on your time",
    description:
      "Lifetime access to recordings, live cohort doubt sessions, and adaptive practice that fits around your day.",
  },
  {
    Icon: Award,
    title: "Recognised certificates",
    description:
      "Earn certificates that signal verified mastery — graded against rigorous, hands-on assessments.",
  },
  {
    Icon: ShieldCheck,
    title: "Quality you can trust",
    description:
      "Every course is reviewed end-to-end before publishing. No filler, no fluff — just signal.",
  },
  {
    Icon: Sparkles,
    title: "Personalised paths",
    description:
      "Smart recommendations and progress nudges keep you on track from first lesson to certificate.",
  },
];

export function WhyGrotutor() {
  const { data: cmsFeatures = [] } = useWhyChooseUs();

  const features =
    cmsFeatures.length > 0
      ? cmsFeatures.map((f) => ({
          Icon: getLucideIcon(f.iconName),
          title: f.title,
          description: f.description ?? "",
        }))
      : fallbackFeatures;

  const [headline, ...rest] = features;

  return (
    <section
      className="relative overflow-hidden bg-foreground py-20 text-background md:py-24"
      aria-labelledby="why-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-32 left-1/3 size-[460px] rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-14 max-w-2xl text-center"
        >
          <div className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-background/60">
            <span className="font-display text-base italic text-primary">
              03
            </span>
            <span className="inline-block h-px w-8 bg-background/30" />
            Why grotutor
            <span className="inline-block h-px w-8 bg-background/30" />
          </div>
          <h2
            id="why-heading"
            className="font-display mt-5 text-3xl font-medium leading-[1.1] tracking-tight sm:text-4xl md:text-5xl"
          >
            Six promises. <em className="text-primary">Backed up</em> on every
            course.
          </h2>
        </motion.div>

        <div className="grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {headline && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="group relative isolate flex min-h-[460px] flex-col justify-end overflow-hidden bg-primary p-7 text-primary-foreground sm:col-span-2 sm:p-10 lg:row-span-2"
            >
              <Image
                src="/images/landing/classroom-1.jpg"
                alt=""
                fill
                priority={false}
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div
                className="absolute inset-0 bg-gradient-to-tr from-foreground/85 via-foreground/55 to-foreground/20"
                aria-hidden
              />
              <div
                className="absolute inset-0 bg-primary/25 mix-blend-multiply"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl"
                aria-hidden
              />
              <div className="relative">
                <p className="font-display text-xs italic tracking-wide text-white/80">
                  — A note from us
                </p>
                <span
                  className="font-display mt-5 block text-4xl leading-[1.05] tracking-tight text-white drop-shadow-sm sm:text-5xl"
                  dangerouslySetInnerHTML={{ __html: headline.title }}
                />
                <p className="mt-5 max-w-md text-base leading-relaxed text-white/85">
                  {headline.description}
                </p>
                <Link
                  href="/courses"
                  className="group/btn mt-8 inline-flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-white/85"
                >
                  See how we deliver
                  <ArrowUpRight className="size-4 transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
                </Link>
              </div>
            </motion.div>
          )}

          {rest.map(({ Icon, title, description }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="group flex flex-col gap-3 bg-foreground p-6 transition-colors hover:bg-foreground/95"
            >
              <span className="flex size-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-primary transition-all group-hover:border-primary/40 group-hover:bg-primary/10">
                <Icon className="size-5" />
              </span>
              <h3
                className="font-display text-lg font-medium leading-snug sm:text-xl"
                dangerouslySetInnerHTML={{ __html: title }}
              />
              <p className="text-sm leading-relaxed text-background/60">
                {description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
