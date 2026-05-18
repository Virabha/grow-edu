"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Play, GraduationCap, BookOpen, Trophy, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import { useSiteSettings } from "@/lib/hooks/use-cms";
import Link from "next/link";

interface StatItem {
  value: number;
  suffix: string;
  kilo?: boolean;
  label: string;
  icon: LucideIcon;
}

const defaultStats: StatItem[] = [
  { value: 50, suffix: "+", kilo: true, label: "Active Students", icon: GraduationCap },
  { value: 500, suffix: "+", label: "Expert Courses", icon: BookOpen },
  { value: 100, suffix: "+", label: "Expert Tutors", icon: Trophy },
  { value: 95, suffix: "%", label: "Success Rate", icon: Star },
];

function Counter({ item }: { item: StatItem }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: false });

  useEffect(() => {
    if (!inView) return;
    const duration = 1600;
    const start = Date.now();
    const isFloat = item.value % 1 !== 0;
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = eased * item.value;
      setVal(isFloat ? parseFloat(cur.toFixed(1)) : Math.floor(cur));
      if (p < 1) requestAnimationFrame(tick);
      else setVal(item.value);
    };
    requestAnimationFrame(tick);
  }, [inView, item.value]);

  const display = item.value % 1 !== 0 ? val.toFixed(1) : val.toString();

  return (
    <span ref={ref} className="text-2xl font-black text-foreground sm:text-3xl">
      {display}{item.kilo ? "K" : ""}{item.suffix}
    </span>
  );
}

/* Pink zigzag SVG decorator matching the screenshot */
function ZigzagDecor() {
  return (
    <svg
      width="60"
      height="20"
      viewBox="0 0 60 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mb-4"
      aria-hidden
    >
      <path
        d="M2 14 L8 6 L14 14 L20 6 L26 14 L32 6 L38 14 L44 6 L50 14 L56 6"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function StatsSection() {
  const { data: siteSettings, isLoading } = useSiteSettings();
  const stats: StatItem[] = Array.isArray((siteSettings as Record<string, unknown>)?.heroStats)
    ? ((siteSettings as Record<string, unknown>).heroStats as StatItem[])
    : defaultStats;

  if (isLoading) {
    return (
      <section className="bg-background">
        <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-video animate-pulse rounded-2xl bg-muted/50" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 animate-pulse rounded bg-muted/50" />
              <div className="h-4 w-full animate-pulse rounded bg-muted/50" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted/50" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden bg-background">
      {/* ── Top: Two-column split layout ── */}
      <div className="container mx-auto px-4 py-12 sm:px-6 md:py-14 lg:px-8">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
          {/* Left: Video / Image area with play button */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{}}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80"
                alt="Students attending a lecture in a modern classroom"
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />

              {/* Play button overlay */}
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{}}
                transition={{ duration: 0.4, delay: 0.3 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 transition-shadow hover:shadow-xl hover:shadow-primary/50 sm:size-20"
                aria-label="Play introduction video"
              >
                <Play className="size-6 fill-white sm:size-8" />
              </motion.button>
            </div>

            {/* Decorative element behind the card (bottom-left offset) */}
            <div
              className="absolute -bottom-4 -left-4 -z-10 size-32 rounded-2xl bg-primary/10"
              aria-hidden
            />
          </motion.div>

          {/* Right: Text content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <ZigzagDecor />

            <h2 className="text-3xl font-black leading-tight text-foreground sm:text-4xl md:text-5xl">
              Committed To{" "}
              <span className="block">The Best Results!</span>
            </h2>

            <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              At {BRAND.name}, we believe every learner deserves access to
              world-class education. Our expert instructors and proven
              curriculum are designed to deliver measurable outcomes that
              advance your career.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{}}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="mt-8"
            >
              <Button
                size="lg"
                className="gap-2 rounded-full bg-primary px-8 font-bold text-white shadow-lg transition-all hover:bg-primary/90"
                asChild
              >
                <Link href="/register">
                  JOIN US NOW
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </motion.div>

            {/* Decorative circle in corner (matches screenshot) */}
            <div
              className="absolute -bottom-6 -right-6 size-24 rounded-full border-[6px] border-primary/20"
              aria-hidden
            />
          </motion.div>
        </div>
      </div>

      {/* ── Bottom: Stats counters row ── */}
      <div className="border-t border-border/30 bg-white/10 backdrop-blur-[2px]">
        <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{}}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex flex-col items-center gap-1 py-2 text-center"
              >
                <s.icon className="mb-1 size-6 text-primary" aria-label={s.label} />
                <Counter item={s} />
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
