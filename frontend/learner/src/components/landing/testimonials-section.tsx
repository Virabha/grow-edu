"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "Aisha Verma",
    role: "JEE Advanced, 2024",
    quote:
      "The mentors didn't just teach the syllabus — they taught me how to think. Adaptive tests caught gaps I didn't even know I had.",
    avatar: "/images/landing/testimonial-1.jpg",
  },
  {
    name: "Rohan Iyer",
    role: "Product Manager, Bengaluru",
    quote:
      "I went from spreadsheets to shipping AI features in six months. The executive program is genuinely outcome-focused.",
    avatar: "/images/landing/testimonial-2.jpg",
  },
  {
    name: "Sneha Pillai",
    role: "IELTS 8.5 band",
    quote:
      "Small-batch live sessions. Real writing feedback on every essay — not generic templates. Best decision I made this year.",
    avatar: "/images/landing/testimonial-3.jpg",
  },
];

export function TestimonialsSection() {
  return (
    <section
      className="bg-muted/30 py-20 md:py-24"
      aria-labelledby="testimonials-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <div className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="font-display text-base italic text-primary">
              05
            </span>
            <span className="inline-block h-px w-8 bg-border" />
            Letters from learners
            <span className="inline-block h-px w-8 bg-border" />
          </div>
          <h2
            id="testimonials-heading"
            className="font-display mt-5 text-3xl font-medium leading-[1.1] tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            Read what they had{" "}
            <em className="text-primary">to say.</em>
          </h2>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group relative flex h-full flex-col rounded-3xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_50px_-20px_rgba(28,25,23,0.18)]"
            >
              <Quote className="size-7 text-primary/25 transition-colors group-hover:text-primary/50" />
              <blockquote className="font-display mt-4 flex-1 text-lg italic leading-relaxed text-foreground sm:text-xl">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/70 pt-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-full border border-border">
                    <Image
                      src={t.avatar}
                      alt={t.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </span>
                  <figcaption className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {t.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.role}
                    </p>
                  </figcaption>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className="size-3.5 fill-primary text-primary"
                    />
                  ))}
                </div>
              </div>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
