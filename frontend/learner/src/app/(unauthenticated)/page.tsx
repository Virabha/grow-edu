import type { Metadata } from "next";
import { HeroSection } from "@/components/landing/hero-section";
import { StatsStrip } from "@/components/landing/stats-strip";
import { BannerCarousel } from "@/components/landing/banner-carousel";
import { CategoriesSection } from "@/components/landing/categories-section";
import { CoursesCarousel } from "@/components/landing/courses-carousel";
import { WhyGrotutor } from "@/components/landing/why-grotutor";
import { InstructorsSection } from "@/components/landing/instructors-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { WorkshopCta } from "@/components/landing/workshop-cta";
import { FaqSection } from "@/components/landing/faq-section";

export const metadata: Metadata = {
  title: "grotutor — Build the career you've always wanted",
  description:
    "grotutor is India's outcomes-first online learning platform. 500+ expert-led courses across academics, executive programs, and languages. Learn from mentors who've built real careers.",
  openGraph: {
    title: "grotutor — Build the career you've always wanted",
    description:
      "500+ expert-led courses across academics, executive programs, and languages. Outcomes-first online learning.",
    url: "https://grotutor.com",
    siteName: "grotutor",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <main className="flex flex-col">
      <HeroSection />
      <StatsStrip />
      <BannerCarousel />
      <CategoriesSection />
      <CoursesCarousel />
      <WhyGrotutor />
      <InstructorsSection />
      <TestimonialsSection />
      <WorkshopCta />
      <FaqSection />
    </main>
  );
}
