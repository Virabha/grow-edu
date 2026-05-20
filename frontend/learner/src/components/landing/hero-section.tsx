"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  Play,
  Award,
  Quote,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/lib/hooks/use-categories";
import { useSiteSettings } from "@/lib/hooks/use-cms";

const ROTATING_WORDS = ["career", "future", "craft", "mind"];

export function HeroSection() {
  const [wordIdx, setWordIdx] = useState(0);
  const { data: categories } = useCategories();
  const { data: siteSettings } = useSiteSettings();

  const heroConfig = siteSettings?.heroConfig as
    | {
        heroImageUrl?: string;
        demoVideoUrl?: string;
        mediaType?: "image" | "video";
      }
    | undefined;

  const mediaType = heroConfig?.mediaType ?? "image";
  const heroImage = heroConfig?.heroImageUrl;
  const demoVideo =
    heroConfig?.demoVideoUrl ?? "https://www.youtube.com/watch?v=pMzGDBP6Bic";

  useEffect(() => {
    const t = setInterval(
      () => setWordIdx((i) => (i + 1) % ROTATING_WORDS.length),
      2600,
    );
    return () => clearInterval(t);
  }, []);

  const popular = (categories ?? [])
    .filter((c) => !c.parentCategoryId)
    .slice(0, 4);

  return (
    <section
      className="relative overflow-hidden bg-background"
      aria-labelledby="hero-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-32 -right-24 h-[460px] w-[460px] rounded-full bg-primary/8 blur-3xl"
        aria-hidden
      />

      <div className="relative container mx-auto px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20 lg:px-8 lg:pt-20 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            >
              <span className="inline-block h-px w-8 bg-primary/60" aria-hidden />
              <Sparkles className="size-3.5 text-primary" />
              Est. grotutor — Hyderabad
              <span className="inline-block h-px w-8 bg-primary/60" aria-hidden />
            </motion.div>

            <motion.h1
              id="hero-heading"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="font-display mt-6 text-[clamp(2.6rem,6vw,5.25rem)] font-medium leading-[0.98] tracking-[-0.03em] text-foreground"
            >
              Build the{" "}
              <span className="relative inline-block align-baseline">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={wordIdx}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.35 }}
                    className="inline-block italic text-primary"
                  >
                    {ROTATING_WORDS[wordIdx]}
                  </motion.span>
                </AnimatePresence>
              </span>
              <br />
              you&apos;ve always
              <br />
              wanted.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-7 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-[17px]"
            >
              A learning house for serious people. 500&thinsp;+ expert-led
              courses across academics, executive programs and languages —
              taught by mentors who&apos;ve actually done the work.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button
                size="lg"
                className="group h-12 gap-2 rounded-full bg-foreground px-7 font-medium text-background shadow-lg shadow-foreground/20 transition-all hover:bg-foreground/90"
                asChild
              >
                <Link href="/courses">
                  Explore the catalogue
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="group h-12 gap-2 rounded-full px-5 font-medium text-foreground hover:bg-foreground/5"
                asChild
              >
                <a href={demoVideo} target="_blank" rel="noopener noreferrer">
                  <span className="flex size-8 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                    <Play className="size-3 fill-primary text-primary" />
                  </span>
                  Watch the film
                </a>
              </Button>
            </motion.div>

            {popular.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border/60 pt-6 text-xs"
              >
                <span className="font-display text-sm italic text-muted-foreground/80">
                  Programmes of study
                </span>
                {popular.map((c) => (
                  <Link
                    key={c.categoryId}
                    href={`/courses?category=${c.categoryId}`}
                    className="group/cat inline-flex items-center gap-1.5 font-medium text-foreground/80 transition-colors hover:text-primary"
                  >
                    {c.name}
                    <ArrowUpRight className="size-3 opacity-40 transition-all group-hover/cat:opacity-100" />
                  </Link>
                ))}
              </motion.div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative lg:col-span-5"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-border/70 bg-muted shadow-[0_30px_60px_-20px_rgba(28,25,23,0.25)]">
              {mediaType === "video" && heroConfig?.demoVideoUrl ? (
                <iframe
                  src={heroConfig.demoVideoUrl.replace("watch?v=", "embed/")}
                  className="absolute inset-0 h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="grotutor demo"
                />
              ) : (
                <Image
                  src={heroImage ?? "/images/landing/hero-student.jpg"}
                  alt="Learner on grotutor"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  priority
                />
              )}
              <div
                className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent"
                aria-hidden
              />

              <div className="absolute left-5 top-5">
                <span className="inline-flex items-center gap-2 rounded-full bg-background/85 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-foreground backdrop-blur-md">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Live cohort
                </span>
              </div>

              <figure className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/15 bg-foreground/70 p-4 text-white backdrop-blur-xl">
                <Quote className="size-4 text-primary" />
                <blockquote className="mt-1.5 font-display text-sm italic leading-snug text-white/95 sm:text-base">
                  &ldquo;The mentors didn&apos;t just teach the syllabus —
                  they taught me how to think.&rdquo;
                </blockquote>
                <figcaption className="mt-2 text-[11px] uppercase tracking-widest text-white/65">
                  Aisha V. — JEE Advanced, 2024
                </figcaption>
              </figure>
            </div>

            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-4 top-16 hidden items-center gap-2.5 rounded-xl border border-border/70 bg-card px-4 py-2.5 shadow-lg sm:flex"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Award className="size-4 text-primary" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Industry certified
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Verified by recruiters
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
