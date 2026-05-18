"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  Award,
  Target,
  Briefcase,
  GraduationCap,
  Star,
  ArrowRight,
  TrendingUp,
  Globe,
  Sparkles,
  Rocket,
  Bot,
  ImagePlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/lib/hooks/use-cms";
import { getLucideIcon } from "@/lib/lucide-icons";

const VIOLET_HEADING_GRADIENT =
  "linear-gradient(90deg, #8A2C91 0%, #7C218B 50%, #5E1676 100%)";
const VIOLET_HEADER_CLASS =
  "bg-gradient-to-r from-[#8A2C91] via-[#7C218B] to-[#5E1676]";
const BLUE_HEADER_CLASS = "bg-[#000052]";
const getHeaderBgClass = (index: number) =>
  index % 2 === 1 ? VIOLET_HEADER_CLASS : BLUE_HEADER_CLASS;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.07 },
  }),
};

interface AboutHero {
  title?: string;
  subtitle?: string;
}
interface AboutVisionMission {
  vision?: { title: string; text: string; iconName?: string; iconUrl?: string };
  mission?: {
    title: string;
    text: string;
    iconName?: string;
    iconUrl?: string;
  };
}
interface AboutValueItem {
  iconName: string;
  iconUrl?: string;
  title: string;
  description: string;
  color?: string;
}
interface AboutWhatWeOfferItem {
  iconName: string;
  iconUrl?: string;
  title: string;
  description: string;
  color?: string;
}

interface AboutLeadershipEmployee {
  designation: string;
  name: string;
}

interface AboutLeadershipDirector {
  name: string;
  designation: string;
  bio: string;
  photoUrl: string;
}

interface AboutLeadershipSettings {
  employees?: AboutLeadershipEmployee[];
  importantDirectors?: AboutLeadershipDirector[];
}

const heroStats = [
  { value: "50K+", label: "Active Students", icon: Users, color: "#3b82f6" },
  {
    value: "100+",
    label: "Expert Tutors",
    icon: GraduationCap,
    color: "#3b82f6",
  },
  { value: "95%", label: "Success Rate", icon: TrendingUp, color: "#10b981" },
];

const values: Array<{
  icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
}> = [
  {
    icon: Target,
    title: "Mission-Driven",
    desc: "Accessible, high-quality, industry-relevant education for all.",
    color: "#3b82f6",
  },
  {
    icon: Users,
    title: "Community First",
    desc: "50,000+ learners and instructors powering everything we build.",
    color: "#3b82f6",
  },
  {
    icon: Award,
    title: "Excellence Always",
    desc: "Rigorous quality review for every course and certificate.",
    color: "#10b981",
  },
  {
    icon: BookOpen,
    title: "Lifelong Learning",
    desc: "Lifetime access, monthly content, non-stop growth.",
    color: "#3b82f6",
  },
  {
    icon: Globe,
    title: "Global Reach",
    desc: "Learners from India and across the world, connected.",
    color: "#0ea5e9",
  },
  {
    icon: Sparkles,
    title: "AI-Powered",
    desc: "Smart, adaptive learning paths tailored to each student.",
    color: "#8b5cf6",
  },
];

const directors = [
  {
    name: "Mrs. Ashwini Vuppala",
    role: "Executive Director",
    image: "/about-us/director1.png",
    color: "#3b82f6",
    points: [
      "Seasoned leader in education, finance, and institutional operations",
      "Corporate experience from global organizations driving process excellence",
      "Finance & operations teaching — real-world concepts into practical outcomes",
      "Managed curriculum execution, faculty coordination, academic workflows",
      "Corporate best practices for structured, compliant education systems",
      "Multi-stakeholder coordination across faculty, students, and leadership",
    ],
  },
  {
    name: "Mrs. Mattewada Ramya",
    role: "Executive Director",
    image: "/about-us/director2.png",
    color: "#3b82f6",
    points: [
      "Commerce graduate with 5+ years in education & business management",
      "Teaching commerce and business subjects with a practical approach",
      "Family business management — sales, customer relations, inventory, finance",
      "Handling operational and strategic responsibilities in parallel",
      "Integrating theoretical knowledge with real-world business practices",
      "Known for discipline, trust, ethical values, and customer-centric thinking",
    ],
  },
];

const ceo = {
  name: "Mr. Jaligama Arun",
  role: "Chief Executive Officer",
  color: "#3b82f6",
  image: "/about-us/ceo.png",
  points: [
    "Visionary CEO with 10+ years building high-performing organizations",
    "Deep expertise in leadership, talent management, and performance governance",
    "Aligns human capital strategy with business objectives and productivity",
    "Decisive execution, clear communication, effective conflict resolution",
    "Shaping positive workplace cultures and scalable operating models",
    "Innovation, disciplined governance, and people-first leadership",
  ],
};

const services: Array<{
  title: string;
  desc: string;
  icon: LucideIcon;
  color: string;
}> = [
  {
    title: "Competitive Exam Prep",
    desc: "UPSC, SSC, Banking, Railways, State PSCs",
    icon: Target,
    color: "#3b82f6",
  },
  {
    title: "Professional Skills",
    desc: "Management, Sales, Digital Transformation & Technology",
    icon: Briefcase,
    color: "#3b82f6",
  },
  {
    title: "Career Readiness",
    desc: "Resume building, Interview prep, Professional Development",
    icon: Rocket,
    color: "#10b981",
  },
  {
    title: "Live Learning & Mentorship",
    desc: "Interactive live classes with top educators",
    icon: GraduationCap,
    color: "#3b82f6",
  },
  {
    title: "Customized Learning Paths",
    desc: "AI-powered, goal-based, adaptive modules",
    icon: Bot,
    color: "#0ea5e9",
  },
  {
    title: "Books & Test Series",
    desc: "Study materials and mock tests with detailed analytics",
    icon: BookOpen,
    color: "#8b5cf6",
  },
];

const SECTION_HEADER_CLASSES: Array<{ className: string; text: string }> = [
  { className: BLUE_HEADER_CLASS, text: "white" },
  { className: VIOLET_HEADER_CLASS, text: "white" },
  { className: BLUE_HEADER_CLASS, text: "white" },
];

function IconOrUpload({
  iconUrl,
  iconName,
  fallbackIcon: FallbackIcon,
  color,
  size = "size-10",
}: {
  iconUrl?: string | null;
  iconName?: string;
  fallbackIcon?: LucideIcon;
  color: string;
  size?: string;
}) {
  if (iconUrl) {
    return (
      <div
        className={`${size} shrink-0 overflow-hidden rounded-lg border border-border/40`}
      >
        <Image
          src={iconUrl}
          alt=""
          width={40}
          height={40}
          className="size-full object-cover"
        />
      </div>
    );
  }

  const ResolvedIcon = useMemo(
    () => (iconName ? getLucideIcon(iconName) : FallbackIcon),
    [iconName, FallbackIcon],
  );
  if (ResolvedIcon) {
    return (
      <div
        className={`flex ${size} shrink-0 items-center justify-center rounded-lg`}
        style={{ background: `${color}15` }}
      >
        <ResolvedIcon className="size-5" style={{ color }} />
      </div>
    );
  }

  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-muted/30`}
    >
      <ImagePlus className="size-4 text-muted-foreground/50" />
    </div>
  );
}

export default function AboutPage() {
  const { data: siteSettings } = useSiteSettings();
  const aboutHero = siteSettings?.aboutHero as AboutHero | undefined;
  const aboutVisionMission = siteSettings?.aboutVisionMission as
    | AboutVisionMission
    | undefined;
  const aboutValues = siteSettings?.aboutValues as
    | { items?: AboutValueItem[] }
    | undefined;
  const aboutWhatWeOffer = siteSettings?.aboutWhatWeOffer as
    | { items?: AboutWhatWeOfferItem[] }
    | undefined;

  const heroTitle = aboutHero?.title ?? "About grotutor";
  const heroSubtitle =
    aboutHero?.subtitle ??
    "Redefining the future of learning — bridging aspiration and achievement through technology, innovation, and expert-led education.";
  const visionTitle = aboutVisionMission?.vision?.title ?? "Our Vision";
  const visionText =
    aboutVisionMission?.vision?.text ??
    "To be the most trusted platform for learning, growth, and transform millions to progress confidently in a rapidly evolving world.";
  const visionIconName = aboutVisionMission?.vision?.iconName ?? "Eye";
  const visionIconUrl = aboutVisionMission?.vision?.iconUrl;
  const missionTitle = aboutVisionMission?.mission?.title ?? "Our Mission";
  const missionText =
    aboutVisionMission?.mission?.text ??
    "Deliver accessible, high-quality, industry-relevant education by leveraging technology, expert guidance, and innovation million learners to achieve lifelong success.";
  const missionIconName = aboutVisionMission?.mission?.iconName ?? "Rocket";
  const missionIconUrl = aboutVisionMission?.mission?.iconUrl;
  const valuesList = aboutValues?.items?.length ? aboutValues.items : values;
  const whatWeOfferList = aboutWhatWeOffer?.items?.length
    ? aboutWhatWeOffer.items
    : services;

  const aboutLeadership = siteSettings?.aboutLeadership as
    | AboutLeadershipSettings
    | undefined;
  const leadershipEmployees = Array.isArray(aboutLeadership?.employees)
    ? aboutLeadership!.employees!.filter(
        (e) =>
          e &&
          typeof e.designation === "string" &&
          typeof e.name === "string" &&
          (e.designation.trim() || e.name.trim()),
      )
    : [];
  const leadershipImportantDirectors = Array.isArray(
    aboutLeadership?.importantDirectors,
  )
    ? aboutLeadership!.importantDirectors!.filter(
        (d) =>
          d &&
          typeof d.name === "string" &&
          typeof d.designation === "string" &&
          typeof d.bio === "string" &&
          typeof d.photoUrl === "string" &&
          (d.name.trim() ||
            d.designation.trim() ||
            d.bio.trim() ||
            d.photoUrl.trim()),
      )
    : [];

  return (
    <main>
      <section className="relative overflow-hidden border-b-2 border-black bg-[#000052] py-14 md:py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="mx-auto max-w-3xl text-white text-center"
          >
            <h1 className="section-heading mt-2 text-3xl font-black text-white sm:text-4xl md:text-5xl">
              {heroTitle === "About grotutor" ? (
                <>
                  About <span className="text-white">grotutor</span>
                </>
              ) : (
                heroTitle
              )}
            </h1>
            <p className="mt-3 leading-relaxed text-white text-base">
              {heroSubtitle}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-8 md:py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              className="overflow-hidden rounded-2xl border-2 border-black/80"
            >
              <div className={`px-5 py-3 ${getHeaderBgClass(0)}`}>
                <h2 className="text-base font-black text-white tracking-wide">
                  {visionTitle}
                </h2>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-5">
                <div className="mb-3">
                  <IconOrUpload
                    iconUrl={visionIconUrl}
                    iconName={visionIconName}
                    color="#3b82f6"
                    size="size-12"
                  />
                </div>
                <p className="leading-relaxed text-foreground">{visionText}</p>
              </div>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={1}
              variants={fadeUp}
              className="overflow-hidden rounded-2xl border-2 border-black/80"
            >
              <div className={`px-5 py-3 ${getHeaderBgClass(1)}`}>
                <h2 className="text-base font-black text-white tracking-wide">
                  {missionTitle}
                </h2>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-5">
                <div className="mb-3">
                  <IconOrUpload
                    iconUrl={missionIconUrl}
                    iconName={missionIconName}
                    color="#3b82f6"
                    size="size-12"
                  />
                </div>
                <p className="leading-relaxed text-foreground">{missionText}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-10 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-6 text-center"
          >
            <div
              className={`inline-block rounded-lg px-4 py-2 mb-2 ${getHeaderBgClass(0)}`}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                What We Stand For
              </p>
            </div>
            <h2 className="section-heading mt-1 text-lg font-bold text-foreground sm:text-xl md:text-2xl">
              Our Core Values
            </h2>
          </motion.div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {valuesList.map((v, i) => {
              const isApi = "iconName" in v && "description" in v;
              const IconComponent = isApi
                ? getLucideIcon((v as AboutValueItem).iconName)
                : (v as (typeof values)[0]).icon;
              const iconUrl = isApi ? (v as AboutValueItem).iconUrl : undefined;
              const color = (v as { color?: string }).color ?? "#3b82f6";
              const title = isApi
                ? (v as AboutValueItem).title
                : (v as (typeof values)[0]).title;
              const desc = isApi
                ? (v as AboutValueItem).description
                : (v as (typeof values)[0]).desc;
              const sectionHeader =
                SECTION_HEADER_CLASSES[i % SECTION_HEADER_CLASSES.length];
              return (
                <motion.div
                  key={title}
                  custom={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="overflow-hidden rounded-xl border-2 border-black/80 bg-white/60 backdrop-blur-sm transition-all hover:shadow-lg hover:-translate-y-0.5 duration-200"
                >
                  <div className={`px-4 py-2 ${sectionHeader.className}`}>
                    <h3
                      className="text-sm font-bold"
                      style={{ color: sectionHeader.text }}
                    >
                      {title}
                    </h3>
                  </div>
                  <div className="flex items-start gap-3 p-4">
                    <IconOrUpload
                      iconUrl={iconUrl}
                      iconName={
                        isApi ? (v as AboutValueItem).iconName : undefined
                      }
                      fallbackIcon={isApi ? undefined : IconComponent}
                      color={color}
                      size="size-10"
                    />
                    <p className="text-sm leading-relaxed text-foreground">
                      {desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-8 md:py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-6 text-center"
          >
            <div
              className={`inline-block rounded-lg px-4 py-2 mb-2 ${getHeaderBgClass(1)}`}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                Our Services
              </p>
            </div>
            <h2 className="section-heading mt-1 text-lg font-bold text-foreground sm:text-xl md:text-2xl">
              What We Offer
            </h2>
          </motion.div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {whatWeOfferList.map((s, i) => {
              const isApi = "iconName" in s && "description" in s;
              const title = isApi
                ? (s as AboutWhatWeOfferItem).title
                : (s as (typeof services)[0]).title;
              const desc = isApi
                ? (s as AboutWhatWeOfferItem).description
                : (s as (typeof services)[0]).desc;
              const color = (s as { color?: string }).color ?? "#3b82f6";
              const iconUrl = isApi
                ? (s as AboutWhatWeOfferItem).iconUrl
                : undefined;
              const OfferIcon = isApi
                ? getLucideIcon((s as AboutWhatWeOfferItem).iconName)
                : (s as (typeof services)[0]).icon;
              const sectionHeader =
                SECTION_HEADER_CLASSES[i % SECTION_HEADER_CLASSES.length];
              return (
                <motion.div
                  key={title}
                  custom={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="group overflow-hidden rounded-xl border-2 border-black/80 bg-white/60 backdrop-blur-sm transition-all hover:shadow-lg hover:-translate-y-0.5 duration-200"
                >
                  <div className={`px-4 py-2 ${sectionHeader.className}`}>
                    <h3
                      className="text-sm font-bold"
                      style={{ color: sectionHeader.text }}
                    >
                      {title}
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="mb-2">
                      <IconOrUpload
                        iconUrl={iconUrl}
                        iconName={
                          isApi
                            ? (s as AboutWhatWeOfferItem).iconName
                            : undefined
                        }
                        fallbackIcon={isApi ? undefined : OfferIcon}
                        color={color}
                        size="size-10"
                      />
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">
                      {desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-8 md:py-10 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mb-6 text-center"
          >
            <div
              className={`inline-block rounded-lg px-4 py-2 mb-2 ${getHeaderBgClass(0)}`}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                Leadership
              </p>
            </div>
            <h2 className="section-heading mt-1 text-lg font-bold text-foreground sm:text-xl md:text-2xl">
              Meet Our Leadership Team
            </h2>
          </motion.div>

          <div className="mb-3 flex items-center justify-between gap-3">
            <div
              className={`inline-flex items-center rounded-lg px-4 py-2 ${getHeaderBgClass(0)}`}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                Executive Directors
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {directors.map((dir, i) => {
              return (
                <motion.div
                  key={dir.name}
                  custom={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="overflow-hidden rounded-2xl border-2 border-black/80 bg-white/60 backdrop-blur-sm"
                >
                  <div className={`px-5 py-3 ${getHeaderBgClass(i)}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-white">
                        {dir.role}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <Image
                        src={dir.image}
                        alt={dir.name}
                        width={100}
                        height={100}
                        className="size-28 shrink-0 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="text-base font-black text-foreground">
                          {dir.name}
                        </h3>
                        <p className="text-sm font-medium text-foreground">
                          {dir.role}
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {dir.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-2 text-sm text-foreground"
                        >
                          <Star
                            className="mt-0.5 size-3 shrink-0"
                            style={{ color: dir.color }}
                          />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mt-5 overflow-hidden rounded-2xl border-2 border-black/80 bg-white/60 backdrop-blur-sm"
          >
            <div className={`px-5 py-3 ${getHeaderBgClass(1)}`}>
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg border-2 border-dashed border-white/40 bg-white/10">
                  <ImagePlus className="size-4 text-white/70" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-white">
                  Chief Executive Officer
                </span>
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
                <Image
                  src={ceo.image}
                  alt={ceo.name}
                  width={100}
                  height={100}
                  className="size-28 shrink-0 rounded-full object-cover"
                />
                <div>
                  <h3 className="text-base font-black text-foreground">
                    {ceo.name}
                  </h3>
                  <p className="text-sm font-medium text-foreground">
                    {ceo.role}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {ceo.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <Star className="mt-0.5 size-3 shrink-0 text-[#3b82f6]" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          {leadershipImportantDirectors.length > 0 && (
            <>
              <div className="mt-5 mb-3 flex items-center justify-between gap-3">
                <div
                  className={`inline-flex items-center rounded-lg px-4 py-2 ${getHeaderBgClass(0)}`}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-white">
                    Important Directors
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {leadershipImportantDirectors.map((dir, i) => {
                  return (
                    <motion.div
                      key={`${dir.designation}-${dir.name}-${i}`}
                      custom={i}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true }}
                      variants={fadeUp}
                      className="overflow-hidden rounded-2xl border-2 border-black/80 bg-white/60 backdrop-blur-sm"
                    >
                      <div className="bg-[#000052] px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold uppercase tracking-widest text-white">
                            {dir.designation}
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="mb-3 flex items-center gap-3">
                          <Image
                            src={dir.photoUrl}
                            alt={dir.name}
                            width={100}
                            height={100}
                            className="size-28 shrink-0 rounded-full object-cover"
                          />
                          <div>
                            <h3 className="text-base font-black text-foreground">
                              {dir.name}
                            </h3>
                            <p className="text-sm font-medium text-foreground">
                              {dir.designation}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground">
                          {dir.bio}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}

          {leadershipEmployees.length > 0 && (
            <>
              <div className="mt-5 mb-3 flex items-center justify-between gap-3">
                <div
                  className={`inline-flex items-center rounded-lg px-4 py-2 ${getHeaderBgClass(1)}`}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-white">
                    Other Employees
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {leadershipEmployees.map((e, i) => (
                  <motion.div
                    key={`${e.designation}-${e.name}-${i}`}
                    custom={i}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="rounded-xl border-2 border-black/80 bg-white/60 backdrop-blur-sm p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {e.designation}
                    </p>
                    <p className="mt-1 text-sm font-black text-foreground">
                      {e.name}
                    </p>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="py-8 md:py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            className="rounded-2xl bg-[#000052] p-6 md:p-8 text-center text-white border-2 border-black"
          >
            <h2 className="section-heading text-xl font-black sm:text-2xl">
              Your Journey to Excellence Begins Here
            </h2>
            <p className="mt-2 text-sm text-white/80">
              At grotutor, we don&apos;t just teach — we transform potential
              into performance.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button
                size="default"
                className="gap-2 bg-white text-primary font-bold hover:bg-white/90 shadow-lg"
                asChild
              >
                <Link href="/courses">
                  Browse Courses <ArrowRight className="size-3.5" />
                </Link>
              </Button>
              <Button
                size="default"
                variant="ghost"
                className="text-white border border-white/30 hover:bg-white/10"
                asChild
              >
                <Link href="/contact">Get in Touch</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
