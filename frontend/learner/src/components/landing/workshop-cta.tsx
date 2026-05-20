"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const learnerPoints = [
  "Lifetime course access",
  "Industry-grade projects",
  "Live cohort doubt sessions",
  "Verified certificates",
];

const instructorPoints = [
  "Reach 50,000+ learners",
  "Production & marketing support",
  "Transparent revenue share",
  "Build your teaching brand",
];

export function WorkshopCta() {
  return (
    <section className="bg-background py-20 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="font-display text-base italic text-primary">
                06
              </span>
              <span className="inline-block h-px w-8 bg-border" />
              Two ways in
            </div>
            <h2 className="font-display mt-4 text-3xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Step in as a student.{" "}
              <em className="text-primary">Or as a mentor.</em>
            </h2>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="group relative overflow-hidden rounded-3xl bg-foreground p-7 text-background shadow-xl sm:p-10"
          >
            <div className="absolute inset-0 opacity-30">
              <Image
                src="/images/landing/study-1.jpg"
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-foreground via-foreground/85 to-foreground/60" />
            </div>
            <div className="relative">
              <p className="font-display text-xs italic tracking-wide text-background/70">
                For learners
              </p>
              <h3 className="font-display mt-3 text-3xl font-medium leading-tight sm:text-4xl">
                Learn the skills that ship.
              </h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-background/75">
                Curated programmes across academics, executive courses and
                languages — all built for outcomes you can put on a resume.
              </p>
              <ul className="mt-7 grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
                {learnerPoints.map((p) => (
                  <li
                    key={p}
                    className="flex items-center gap-2 text-sm text-background/90"
                  >
                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                    {p}
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className="mt-8 h-12 gap-2 rounded-full bg-background px-6 font-medium text-foreground hover:bg-background/95"
                asChild
              >
                <Link href="/courses">
                  Explore courses
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card p-7 sm:p-10"
          >
            <div className="absolute inset-0 opacity-30">
              <Image
                src="/images/landing/classroom-2.jpg"
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-card via-card/90 to-card/70" />
            </div>
            <div className="relative">
              <p className="font-display text-xs italic tracking-wide text-muted-foreground">
                For instructors
              </p>
              <h3 className="font-display mt-3 text-3xl font-medium leading-tight text-foreground sm:text-4xl">
                Turn expertise into impact.
              </h3>
              <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
                Join a vetted network of educators. We handle the platform —
                you focus on teaching what you do best.
              </p>
              <ul className="mt-7 grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
                {instructorPoints.map((p) => (
                  <li
                    key={p}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                    {p}
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className="mt-8 h-12 gap-2 rounded-full bg-foreground px-6 font-medium text-background hover:bg-foreground/90"
                asChild
              >
                <Link href="/become-teacher">
                  Become an instructor
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
