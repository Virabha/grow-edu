"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import Link from "next/link";

const checklistItems = [
  "Expert-led courses with real-world projects and mentorship.",
  "Learn at your own pace with lifetime access to all materials.",
  "Industry-recognized certifications to boost your career.",
];

const imageCards = [
  {
    src: "/images/instructor.jpg",
    alt: "Team collaborating on a project at whiteboard",
    label: "Our Expertise Is Best Earned Through Our Experience",
  },
  {
    src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80",
    alt: "Student learning on laptop",
    label: "",
  },
  {
    src: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=600&q=80",
    alt: "Studying with notes and books",
    label: "",
  },
  {
    src: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80",
    alt: "Education team discussing strategies",
    label: "Our Best Team For Your Education Advice",
  },
];

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

export function WorkshopCta() {
  return (
    <section className="relative overflow-hidden bg-foreground py-10 md:py-10">
      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='1' fill='white'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
          {/* ── Left column: text content ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{}}
            transition={{ duration: 0.6 }}
          >
            <ZigzagDecor />

            <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl">
              Limitless Learning,{" "}
              <span className="block">Limitless Possibilities!</span>
            </h2>

            <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base">
              Join {BRAND.name} and unlock a world of knowledge. Our expert-led
              courses are designed to take you from where you are to where you
              want to be — at your own pace.
            </p>

            {/* Checklist items */}
            <ul className="mt-6 space-y-3">
              {checklistItems.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{}}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-3 text-sm font-medium text-white/90"
                >
                  {/* Pink checkmark */}
                  <svg
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {item}
                </motion.li>
              ))}
            </ul>

            {/* CTA button */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{}}
              transition={{ duration: 0.4, delay: 0.5 }}
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
          </motion.div>

          {/* ── Right column: 2x2 image grid ── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="grid grid-cols-2 gap-4"
          >
            {imageCards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{}}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                className="relative overflow-hidden rounded-2xl aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.src}
                  alt={card.alt}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />

                {/* Dark overlay for text readability */}
                {card.label && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end p-4">
                    <p className="text-sm font-bold leading-snug text-white sm:text-base">
                      {card.label}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
