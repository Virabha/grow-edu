"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useWhyChooseUs } from "@/lib/hooks/use-cms";
import { getLucideIcon } from "@/lib/lucide-icons";
import { Award, GraduationCap } from "lucide-react";

const bottomCards = [
  {
    Icon: Award,
    title: "Certified Institute",
    description:
      "Nationally recognized certifications that validate your learning and boost your career prospects.",
  },
  {
    Icon: GraduationCap,
    title: "Qualified Teachers",
    description:
      "Learn from experienced educators with deep domain expertise and a passion for teaching.",
  },
];

export function TrustSection() {
  const { data: features = [], isLoading } = useWhyChooseUs();

  return (
    <section className="py-12 md:py-10 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{}}
            transition={{ duration: 0.6 }}
            className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10"
          >
            <img
              src="/images/trust-section-1.jpg"
              alt="Students collaborating and learning together"
              width={500}
              height={500}
              className="absolute inset-0 h-full w-full rounded-2xl object-cover"
              loading="lazy"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{}}
            transition={{ duration: 0.6 }}
          >
            <svg
              width="80"
              height="20"
              viewBox="0 0 80 20"
              fill="none"
              className="mb-4"
            >
              <path
                d="M2 15 L10 5 L18 15 L26 5 L34 15 L42 5 L50 15"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>

            <h2 className="text-2xl font-bold text-foreground sm:text-3xl md:text-4xl leading-tight">
              Why Students Choose Us
              <br />
              for Gaining Knowledge!
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              We combine expert instruction, cutting-edge technology, and a
              supportive community to create learning experiences that truly
              transform careers. Our students consistently achieve top ranks
              and land dream roles.
            </p>
          </motion.div>
        </div>

        <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{}}
            transition={{ duration: 0.5 }}
          >
            <p className="text-2xl font-bold mt-5 text-foreground sm:text-3xl md:text-4xl">
              Join With Us to Learn Future-Ready Skills
            </p>
            <p className="text-sm text-muted-foreground mb-8 mt-2 sm:text-base">
              Become part of our learning community and gain access to industry-relevant courses designed by experts. Our platform empowers students and professionals with practical knowledge, modern tools, and career-focused training to succeed in the digital world.
            </p>

            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {bottomCards.map((card, i) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{}}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <card.Icon className="size-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">
                      {card.title}
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {card.description}
                  </p>
                </motion.div>
              ))}
            </div>

            <Link
              href="/about-us"
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-all hover:opacity-90 hover:shadow-lg"
            >
              More About Us
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10"
          >
            <img
              src="/images/trust-section-2.jpg"
              alt="Students in a classroom environment"
              width={500}
              height={500}
              className="absolute inset-0 h-full w-full rounded-2xl object-cover"
              loading="lazy"
            />
          </motion.div>
        </div>

        {!isLoading && features.length > 0 && (
          <div className="mt-14">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => {
                const Icon = getLucideIcon(f.iconName);
                const color = f.iconColor ?? "#3b82f6";
                const bg = f.iconBg ?? "#3b82f615";
                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{}}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                    className="rounded-xl border border-border/80 bg-white p-5 transition-all hover:shadow-md hover:border-primary/30"
                  >
                    <div
                      className="mb-3 flex size-10 items-center justify-center rounded-xl"
                      style={{ background: bg }}
                    >
                      <Icon className="size-5" style={{ color }} />
                    </div>
                    <h3 className="mb-1 text-sm font-bold text-foreground">
                      {f.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      {f.description ?? ""}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
