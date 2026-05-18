"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  BookOpen,
  ArrowRight,
  Users,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Trophy,
  TrendingUp,
  Briefcase,
  Code2,
  Target,
  Blocks,
  BrainCircuit,
  Microscope,
  Rocket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/lib/hooks/use-categories";
import { useSiteSettings } from "@/lib/hooks/use-cms";
import { cn } from "@/lib/utils";

interface SlideCard {
  icon: LucideIcon;
  title: string;
  tags: string[];
}

interface HeroSlide {
  id: number;
  badge: string;
  heading: string;
  sub: string;
  accent: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  mediaType?: "image" | "video";
  mediaUrl?: string;
  rotatingWords?: string[];
  cards?: SlideCard[];
}

const defaultSlides: HeroSlide[] = [
  {
    id: 0,
    badge: "Industry Ready Professional Learning",
    heading: "Career Focused {rotate} Courses",
    sub: "Designed for the Modern Workforce",
    accent: "#6366f1",
    ctaText: "Explore Courses",
    ctaLink: "/courses",
    rotatingWords: [
      "Professional",
      "Business",
      "Finance",
      "Engineering",
      "Software",
    ],
    cards: [
      {
        icon: Briefcase,
        title: "Business & Finance",
        tags: [
          "Strategic Business Management",
          "Financial Management",
          "Sales and Marketing",
          "Digital Marketing",
          "Brand Strategy",
          "Sales Management",
        ],
      },
      {
        icon: Code2,
        title: "Software Engineering",
        tags: [
          "AI & Machine Learning",
          "Cloud Computing",
          "Full Stack Python Development",
          "Full Stack Java Development",
        ],
      },
    ],
  },
  {
    id: 1,
    badge: "Elite Engineering Entrance Preparation",
    heading:
      "Personalized IIT-JEE {rotate} Preparation Programs for Future Engineers",
    sub: "Comprehensive coaching designed to help students master Physics, Chemistry, and Mathematics with conceptual clarity, mock tests, and performance analytics.",
    accent: "#f97316",
    ctaText: "Start Learning",
    ctaLink: "/courses",
    rotatingWords: ["Mains", "Advanced"],
    cards: [
      {
        icon: Target,
        title: "IIT-JEE Mains & Advanced",
        tags: ["Physics", "Chemistry", "Maths"],
      },
      {
        icon: Blocks,
        title: "Foundation for IIT",
        tags: ["Concept Building", "Problem Solving", "Olympiad Preparation"],
      },
      {
        icon: BrainCircuit,
        title: "Advanced Problem Solving",
        tags: ["Mock Tests", "PYQs", "Rank Improvement Strategies"],
      },
    ],
  },
  {
    id: 2,
    badge: "Advanced Medical Entrance Training",
    heading: "Smart NEET Preparation for Future Doctors",
    sub: "Structured learning programs focused on Biology, Physics, and Chemistry with expert mentorship, test series, and in-depth concept learning.",
    accent: "#10b981",
    ctaText: "Get Started",
    ctaLink: "/courses",
    cards: [
      {
        icon: Microscope,
        title: "NEET Complete Preparation",
        tags: ["Biology", "Physics", "Chemistry"],
      },
      {
        icon: BookOpen,
        title: "NEET Foundation Program",
        tags: ["Concept Building", "NCERT Mastery", "Practice Tests"],
      },
      {
        icon: Rocket,
        title: "NEET Rank Booster",
        tags: ["Mock Tests", "PYQs", "Performance Analytics"],
      },
    ],
  },
];

const stats = [
  { icon: Users, value: "1,000+", label: "Students" },
  { icon: BookOpen, value: "10+", label: "Courses" },
  { icon: GraduationCap, value: "10+", label: "Educators" },
  { icon: Trophy, value: "96%", label: "Success Rate" },
];

export function HeroSection() {
  const [wordIdx, setWordIdx] = useState(0);
  const [slideIdx, setSlideIdx] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: categories } = useCategories();
  const { data: siteSettings } = useSiteSettings();

  const heroConfig = siteSettings?.heroConfig as
    | {
        slides?: HeroSlide[];
        demoVideoUrl?: string;
        heroImageUrl?: string;
        mediaType?: "image" | "video";
      }
    | undefined;

  const heroSlides = heroConfig?.slides?.length
    ? heroConfig.slides
    : defaultSlides;
  const globalMediaType = heroConfig?.mediaType ?? "image";
  const globalMediaUrl =
    globalMediaType === "video"
      ? (heroConfig?.demoVideoUrl ?? "")
      : (heroConfig?.heroImageUrl ?? "");

  const slide = heroSlides[slideIdx];
  const currentRotatingWords = slide.rotatingWords ?? [];

  const nextSlide = useCallback(
    () => setSlideIdx((i) => (i + 1) % heroSlides.length),
    [heroSlides.length],
  );
  const prevSlide = useCallback(
    () => setSlideIdx((i) => (i - 1 + heroSlides.length) % heroSlides.length),
    [heroSlides.length],
  );

  const slideMediaType = slide.mediaType ?? globalMediaType;
  const slideMediaUrl = slide.mediaUrl ?? globalMediaUrl;
  const slideCta = slide.ctaText ?? "Explore Courses";
  const slideCtaLink = slide.ctaLink ?? "/courses";
  const slideSecondaryCtaText = slide.secondaryCtaText ?? "Watch Demo";
  const slideSecondaryCtaLink =
    slide.secondaryCtaLink ??
    heroConfig?.demoVideoUrl ??
    "https://www.youtube.com/watch?v=pMzGDBP6Bic";

  // Reset word index when slide changes
  useEffect(() => {
    setWordIdx(0);
  }, [slideIdx]);

  // Rotate words — adaptive speed so all words show within one slide cycle
  const wordInterval =
    currentRotatingWords.length > 0
      ? Math.min(2200, Math.floor(5600 / currentRotatingWords.length))
      : 2200;

  useEffect(() => {
    if (currentRotatingWords.length === 0) return;
    const t = setInterval(
      () => setWordIdx((i) => (i + 1) % currentRotatingWords.length),
      wordInterval,
    );
    return () => clearInterval(t);
  }, [currentRotatingWords.length, wordInterval]);

  // Auto-advance slides at 6000ms
  useEffect(() => {
    timerRef.current = setInterval(nextSlide, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nextSlide]);

  function renderHeading() {
    if (
      currentRotatingWords.length === 0 ||
      !slide.heading.includes("{rotate}")
    ) {
      return slide.heading;
    }
    const parts = slide.heading.split("{rotate}");
    return (
      <>
        {parts[0]}
        <span className="relative inline-block">
          <AnimatePresence mode="wait">
            <motion.span
              key={`${slideIdx}-${wordIdx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
              className="inline-block font-black text-amber-300"
            >
              {currentRotatingWords[wordIdx % currentRotatingWords.length]}
            </motion.span>
          </AnimatePresence>
        </span>
        {parts[1]}
      </>
    );
  }

  function renderCards() {
    const slideCards = slide.cards;
    if (!slideCards || slideCards.length === 0) {
      return (
        <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-6">
          <h3 className="text-lg font-bold text-white">
            {slide.heading.replace("{rotate}", "").replace("  ", " ")}
          </h3>
          <p className="mt-2 text-sm text-white/70">{slide.sub}</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {slideCards.map((card, i) => (
          <motion.div
            key={`${slide.id}-card-${i}`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            className="rounded-xl bg-white px-4 py-3.5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${slide.accent}18` }}
              >
                <card.icon className="size-5" style={{ color: slide.accent }} />
              </div>
              <p className="text-sm font-bold text-gray-900">{card.title}</p>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: `${slide.accent}14`,
                    color: slide.accent,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-[#000052] via-[#000040] to-primary"
      aria-labelledby="hero-heading"
    >
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div
        className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/[0.04]"
        aria-hidden
      />
      <div
        className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/[0.04]"
        aria-hidden
      />

      <div className="relative container mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="max-w-xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.35 }}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"
              >
                <span className="relative flex size-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/70" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                {slide.badge}
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.h1
                key={`h-${slide.id}`}
                id="hero-heading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.45 }}
                className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl"
              >
                {renderHeading()}
              </motion.h1>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.p
                key={`sub-${slide.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="mt-4 text-sm text-white/70 leading-relaxed md:text-base"
              >
                {slide.sub}
              </motion.p>
            </AnimatePresence>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="group gap-2 font-semibold bg-white text-primary hover:bg-white/90 shadow-lg shadow-black/20 transition-all rounded-xl"
                asChild
              >
                <Link href={slideCtaLink}>
                  <BookOpen className="size-4" />
                  {slideCta}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="group gap-2 font-medium border-white/30 text-white bg-white/10 hover:text-white hover:bg-white/20 hover:border-white/50 transition-all rounded-xl"
                asChild
              >
                <a
                  href={slideSecondaryCtaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-white/20">
                    <Play className="size-3 fill-white text-white" />
                  </span>
                  {slideSecondaryCtaText}
                </a>
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-4 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <s.icon className="mx-auto mb-1.5 size-5 text-amber-300" />
                  <p className="text-base font-black text-white sm:text-lg">
                    {s.value}
                  </p>
                  <p className="text-[11px] text-white/60">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={prevSlide}
                className="flex size-8 items-center justify-center rounded-lg border border-white/25 hover:border-white/50 hover:bg-white/10 transition-all"
                aria-label="Previous slide"
              >
                <ChevronLeft className="size-4 text-white/70" />
              </button>
              <div className="flex gap-1.5">
                {heroSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlideIdx(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === slideIdx
                        ? "w-8 bg-white"
                        : "w-1.5 bg-white/30 hover:bg-white/50",
                    )}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={nextSlide}
                className="flex size-8 items-center justify-center rounded-lg border border-white/25 hover:border-white/50 hover:bg-white/10 transition-all"
                aria-label="Next slide"
              >
                <ChevronRight className="size-4 text-white/70" />
              </button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="relative hidden lg:block"
          >
            {slideMediaType === "video" && slideMediaUrl ? (
              <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-white/10">
                <div className="aspect-video">
                  <iframe
                    src={slideMediaUrl.replace("watch?v=", "embed/")}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Demo Video"
                  />
                </div>
              </div>
            ) : slideMediaType === "image" && slideMediaUrl ? (
              <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-white/10">
                <div className="aspect-[4/3]">
                  <Image
                    src={slideMediaUrl}
                    alt="Hero"
                    fill
                    className="object-cover"
                    sizes="50vw"
                    priority
                  />
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.45 }}
                  className="relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-6 shadow-2xl"
                >
                  {renderCards()}
                </motion.div>
              </AnimatePresence>
            )}

            <motion.div
              animate={{ y: [-4, 4, -4] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-3 -left-3 flex items-center gap-2.5 rounded-xl bg-white shadow-lg px-4 py-2.5"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-green-100">
                <TrendingUp className="size-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Trending Now</p>
                <p className="text-[10px] text-gray-500">
                  2,400+ enrolled this week
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {categories && categories.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-white/60 shrink-0">
              Popular:
            </span>
            {categories
              .filter((c) => !c.parentCategoryId)
              .slice(0, 6)
              .map((cat) => (
                <Link
                  key={cat.categoryId}
                  href={`/courses?category=${cat.categoryId}`}
                  className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition-all hover:border-white/40 hover:text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  {cat.name}
                </Link>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
