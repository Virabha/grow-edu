import type { Metadata } from "next";
import { HeroSection } from "@/components/landing/hero-section";
import { CategoriesSection } from "@/components/landing/categories-section";
import { BannerCarousel } from "@/components/landing/banner-carousel";
import { CoursesCarousel } from "@/components/landing/courses-carousel";
import { TrustSection } from "@/components/landing/trust-section";
import { WorkshopCta } from "@/components/landing/workshop-cta";
import { InstructorsSection } from "@/components/landing/instructors-section";
import { FaqSection } from "@/components/landing/faq-section";
import { SubscribeSection } from "@/components/landing/subscribe-section";
import { RolesCta } from "@/components/landing/roles-cta";

export const metadata: Metadata = {
  title: "Loshi Edu — Transform Your Learning Journey",
  description:
    "Loshi Edu offers 500+ expert-led online courses. Competitive Exams, Professional Skills, Academics & more.",
};

export default function HomePage() {
  return (
    <main className="flex flex-col">
      <BannerCarousel />
      <HeroSection />
      <CategoriesSection />
      <CoursesCarousel />
      <TrustSection />
      <InstructorsSection />
      <WorkshopCta />
      <RolesCta />
      <FaqSection />
      <SubscribeSection />
    </main>
  );
}
