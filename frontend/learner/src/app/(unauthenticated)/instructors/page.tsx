"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Users, BookOpen, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstructors } from "@/lib/hooks/use-cms";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const fallbackAvatars = [
  "/images/landing/mentor-1.jpg",
  "/images/landing/mentor-2.jpg",
  "/images/landing/mentor-3.jpg",
  "/images/landing/mentor-4.jpg",
];

export default function InstructorsPage() {
  const { data: instructors, isLoading } = useInstructors();

  return (
    <main className="bg-background">
      <section className="relative overflow-hidden border-b border-border bg-foreground py-16 text-background md:py-20">
        <Image
          src="/images/landing/classroom-2.jpg"
          alt=""
          fill
          className="object-cover opacity-30"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/85 via-foreground/70 to-foreground/45" />
        <div className="absolute inset-0 bg-primary/15 mix-blend-multiply" />
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-background/70">
              <span className="inline-block h-px w-8 bg-background/30" />
              The faculty
              <span className="inline-block h-px w-8 bg-background/30" />
            </div>
            <h1 className="font-display mt-5 text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Practitioners. Researchers.{" "}
              <em className="text-primary">Teachers.</em>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-background/80">
              Every mentor on grotutor has shipped, built, or trained in the
              field they teach.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-96 rounded-2xl" />
              ))}
            </div>
          ) : instructors && instructors.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {instructors.map((instructor, i) => (
                <motion.div
                  key={instructor.profileId}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Link
                    href={`/instructors/${instructor.userId}`}
                    className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_40px_-20px_rgba(28,25,23,0.18)]"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                      {instructor.avatarUrl ? (
                        <Image
                          src={instructor.avatarUrl}
                          alt={instructor.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 1024px) 50vw, 25vw"
                          unoptimized={instructor.avatarUrl.startsWith("http")}
                        />
                      ) : (
                        <Image
                          src={fallbackAvatars[i % fallbackAvatars.length]}
                          alt={instructor.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 1024px) 50vw, 25vw"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/65 via-foreground/15 to-transparent" />
                      <span className="font-display absolute right-4 top-4 text-[10px] uppercase tracking-widest text-white/70">
                        {getInitials(instructor.name)}
                      </span>
                      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-display truncate text-lg font-medium leading-tight text-white sm:text-xl">
                            {instructor.name}
                          </p>
                          {instructor.experience ? (
                            <p className="mt-0.5 truncate text-[11px] uppercase tracking-widest text-white/75">
                              {instructor.experience}
                            </p>
                          ) : instructor.expertise?.length ? (
                            <p className="mt-0.5 truncate text-[11px] uppercase tracking-widest text-white/75">
                              {instructor.expertise[0]}
                            </p>
                          ) : null}
                        </div>
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background/85 text-foreground backdrop-blur-md transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                          <ArrowUpRight className="size-4" />
                        </span>
                      </div>
                    </div>

                    {instructor.expertise &&
                      instructor.expertise.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 border-b border-border/60 px-4 py-3">
                          {instructor.expertise.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

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
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="size-12 text-muted-foreground/30" />
              <p className="font-display mt-4 text-xl font-medium text-foreground">
                No instructors yet.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Check back soon — applications are reviewed weekly.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-foreground p-10 text-center text-background sm:p-14">
            <Image
              src="/images/landing/study-1.jpg"
              alt=""
              fill
              className="object-cover opacity-25"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/85 via-foreground/65 to-foreground/45" />
            <div className="relative mx-auto max-w-2xl">
              <p className="font-display text-xs italic tracking-wide text-background/70">
                — A note for educators
              </p>
              <h2 className="font-display mt-4 text-3xl font-medium leading-tight sm:text-4xl md:text-5xl">
                Want to teach on{" "}
                <em className="text-primary">grotutor?</em>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-background/80">
                Share your expertise with thousands of learners. We&apos;ll
                handle the platform — you teach what you know best.
              </p>
              <Link
                href="/become-teacher"
                className="group/btn mt-8 inline-flex items-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-background/95"
              >
                Become an instructor
                <ArrowUpRight className="size-4 transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
