"use client";

import { useState, useEffect, useMemo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import "swiper/css/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useBanners } from "@/lib/hooks/use-cms";
import type { Banner } from "@/lib/api/services/cms";

function getAlignmentClasses(align: string | null): {
  container: string;
  text: string;
} {
  switch (align) {
    case "center":
      return { container: "items-center text-center mx-auto", text: "mx-auto" };
    case "right":
      return { container: "items-end text-right ml-auto", text: "ml-auto" };
    default:
      return { container: "items-start text-left", text: "" };
  }
}

function getCtaVariant(
  style: string | null,
): "default" | "secondary" | "outline" | "ghost" {
  switch (style) {
    case "secondary":
      return "secondary";
    case "outline":
      return "outline";
    case "ghost":
      return "ghost";
    default:
      return "default";
  }
}

function BannerSlide({ banner }: { banner: Banner }) {
  const alignment = useMemo(
    () => getAlignmentClasses(banner.textAlign),
    [banner.textAlign],
  );
  const ctaVariant = useMemo(
    () => getCtaVariant(banner.ctaStyle),
    [banner.ctaStyle],
  );
  const overlayStyle = useMemo(() => {
    const opacity = (banner.overlayOpacity ?? 40) / 100;
    const color = banner.overlayColor ?? "rgba(0,0,0,0.4)";
    if (color.startsWith("rgba")) return color;
    return `rgba(0,0,0,${opacity})`;
  }, [banner.overlayColor, banner.overlayOpacity]);

  return (
    <div className="relative w-full h-full min-h-[300px] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={banner.imageUrl}
          alt={banner.title}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      </div>

      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to right, ${overlayStyle}, ${overlayStyle.replace(/[\d.]+\)$/, "0.2)")}, transparent)`,
        }}
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
        <div
          className={`w-full md:max-w-[85%] flex flex-col gap-1.5 ${alignment.container}`}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col gap-1.5 ${alignment.container}`}
          >
            {banner.badgeText && (
              <span
                className="inline-block px-2 py-0.5 text-[10px] sm:text-xs font-semibold tracking-wider rounded-full uppercase w-fit"
                style={{
                  backgroundColor: banner.badgeColor ?? "#eab308",
                  color:
                    banner.badgeColor && banner.badgeColor !== "#eab308"
                      ? "#ffffff"
                      : "#000000",
                }}
              >
                {banner.badgeText}
              </span>
            )}

            <h2
              className="text-lg sm:text-xl md:text-2xl font-bold leading-tight"
              style={{ color: banner.textColor ?? "#ffffff" }}
            >
              {banner.title}
            </h2>

            {banner.subtitle && (
              <p
                className="text-xs sm:text-sm font-medium opacity-90 line-clamp-1"
                style={{ color: banner.textColor ?? "#ffffff" }}
              >
                {banner.subtitle}
              </p>
            )}

            {banner.description && (
              <p
                className={`text-xs opacity-80 max-w-md line-clamp-1 ${alignment.text}`}
                style={{ color: banner.textColor ?? "#ffffff" }}
              >
                {banner.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-0.5">
              {banner.ctaText && banner.ctaLink && (
                <Button
                  asChild
                  size="sm"
                  variant={ctaVariant}
                  className="rounded-full font-semibold px-4 h-8 text-xs sm:text-sm"
                >
                  <Link href={banner.ctaLink}>
                    {banner.ctaText} <ArrowRight className="ml-1.5 size-3.5" />
                  </Link>
                </Button>
              )}

              {banner.secondaryCtaText && banner.secondaryCtaLink && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-full font-semibold px-4 h-8 text-xs sm:text-sm border-white/50 bg-black/10 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href={banner.secondaryCtaLink}>
                    {banner.secondaryCtaText}
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function BannerCarousel() {
  const { data: banners = [], isLoading } = useBanners();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (isLoading) {
    return (
      <section className="w-full max-w-full bg-transparent overflow-hidden">
        <div className="w-full h-[300px] max-h-[300px] animate-pulse bg-muted/50" />
      </section>
    );
  }
  if (!banners.length) return null;

  return (
    <section className="w-full max-w-full bg-transparent backdrop-blur-0 overflow-hidden">
      <div className="w-full relative group h-[300px] max-h-[300px]">
        <Swiper
          modules={[Autoplay, Pagination, EffectFade, Navigation]}
          effect="fade"
          pagination={{
            clickable: true,
            dynamicBullets: true,
            bulletClass: "swiper-pagination-bullet !w-1.5 !h-1.5",
          }}
          navigation={{
            nextEl: ".swiper-button-next-custom",
            prevEl: ".swiper-button-prev-custom",
          }}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          loop={banners.length > 1}
          className="w-full h-full max-h-[300px] !overflow-hidden"
        >
          {banners.map((banner) => (
            <SwiperSlide key={banner.bannerId} className="!h-[300px]">
              <BannerSlide banner={banner} />
            </SwiperSlide>
          ))}
        </Swiper>
        {banners.length > 1 && (
          <>
            <div className="swiper-button-prev-custom absolute left-2 top-1/2 -translate-y-1/2 z-10 size-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-all hover:bg-white/40">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </div>
            <div className="swiper-button-next-custom absolute right-2 top-1/2 -translate-y-1/2 z-10 size-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-all hover:bg-white/40">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
