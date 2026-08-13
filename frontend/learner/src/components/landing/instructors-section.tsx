"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen, Star, Users } from "lucide-react";
import { useInstructors } from "@/lib/hooks/use-cms";

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const fallbackAvatars = [
  "/images/landing/mentor-1.jpg",
  "/images/landing/mentor-2.jpg",
  "/images/landing/mentor-3.jpg",
  "/images/landing/mentor-4.jpg",
];

export function InstructorsSection() {
  const { data: instructors = [], isLoading } = useInstructors();

  if (isLoading) {
    return (
      <section className="bg-background py-20 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-80 animate-pulse rounded-2xl bg-card"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!instructors.length) return null;

  return (
    <section
      className="bg-background py-20 md:py-24"
      aria-labelledby="instructors-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="max-w-xl">
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="font-display text-base italic text-primary">
                04
              </span>
              <span className="inline-block h-px w-8 bg-border" />
              The faculty
            </div>
            <h2
              id="instructors-heading"
              className="font-display mt-4 text-3xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-4xl md:text-5xl"
            >
              Practitioners. Researchers.{" "}
              <em className="text-primary">Teachers.</em>
            </h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
              Every mentor on grotutor has shipped, built, or trained in the
              field they teach. No exceptions.
            </p>
          </div>
          <Link
            href="/instructors"
            className="group inline-flex shrink-0 items-center gap-2 self-start border-b border-foreground pb-1 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary sm:self-end"
          >
            Meet the faculty
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {instructors.slice(0, 8).map((person, i) => (
            <motion.div
              key={person.profileId}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <Link
                href={`/instructors/${person.userId}`}
                className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_40px_-20px_rgba(28,25,23,0.18)]"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                  {person.avatarUrl ? (
                    <Image
                      src={person.avatarUrl}
                      alt={person.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      unoptimized={person.avatarUrl.startsWith("http")}
                    />
                  ) : (
                    <Image
                      src={fallbackAvatars[i % fallbackAvatars.length] ?? "/images/landing/mentor-1.jpg"}
                      alt={person.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent" />
                  <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display truncate text-lg font-medium leading-tight text-white sm:text-xl">
                        {person.name}
                      </p>
                      {person.expertise?.length ? (
                        <p className="mt-0.5 truncate text-[11px] uppercase tracking-widest text-white/75">
                          {person.expertise[0]}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] uppercase tracking-widest text-white/65">
                          Faculty
                        </p>
                      )}
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background/85 text-foreground backdrop-blur-md transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowUpRight className="size-4" />
                    </span>
                  </div>
                  {!person.avatarUrl && (
                    <span className="font-display absolute right-4 top-4 text-[10px] uppercase tracking-widest text-white/70">
                      {getInitials(person.name)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Star className="size-3 fill-primary text-primary" />
                    <span className="font-semibold text-foreground">5.0</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="size-3" /> Courses
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3" /> Cohorts
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
