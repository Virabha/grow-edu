"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Users, BookOpen, ArrowRight, Facebook, Linkedin, Youtube, Instagram } from "lucide-react";
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

const COLORS = ["#6366f1", "#f97316", "#10b981", "#ec4899", "#0ea5e9", "#8b5cf6"];

const socialIcons = [
  { icon: Facebook, color: "#1877f2" },
  { icon: Linkedin, color: "#0a66c2" },
  { icon: Youtube, color: "#ff0000" },
  { icon: Instagram, color: "#e1306c" },
];

export default function InstructorsPage() {
  const { data: instructors, isLoading } = useInstructors();

  return (
    <main>
      <section className="relative overflow-hidden border-b border-border bg-[#000052] py-14 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-white text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
              Learn from the Best
            </p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl md:text-5xl">
              Our Instructors
            </h1>
            <p className="mt-3 leading-relaxed text-white text-base">
              Meet our team of expert instructors — industry leaders,
              researchers, and educators who are passionate about helping you
              succeed.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-2xl" />
              ))}
            </div>
          ) : instructors && instructors.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {instructors.map((instructor, i) => (
                <motion.div
                  key={instructor.profileId}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                >
                  <Link
                    href={`/instructors/${instructor.userId}`}
                    className="group block overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm text-center transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="relative pt-8 pb-5 px-4">
                      <div className="relative mx-auto mb-4 size-24 sm:size-28">
                        {instructor.avatarUrl ? (
                          <div className="relative size-full overflow-hidden rounded-full ring-4 ring-primary/10">
                            <Image
                              src={instructor.avatarUrl}
                              alt={instructor.name}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-110"
                              unoptimized={instructor.avatarUrl.startsWith("http")}
                            />
                          </div>
                        ) : (
                          <div
                            className="flex size-full items-center justify-center rounded-full text-2xl font-black text-white shadow-md ring-4 ring-primary/10 transition-transform duration-300 group-hover:scale-110"
                            style={{ background: `linear-gradient(135deg, ${COLORS[i % COLORS.length]}, ${COLORS[i % COLORS.length]}cc)` }}
                          >
                            {getInitials(instructor.name)}
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-primary/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <div className="flex gap-1.5">
                            {socialIcons.map((s, idx) => (
                              <span
                                key={idx}
                                className="flex size-7 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/40"
                              >
                                <s.icon className="size-3.5" />
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-foreground transition-colors group-hover:text-primary">
                        {instructor.name}
                      </h3>
                      {instructor.experience && (
                        <p className="mt-0.5 text-sm text-foreground/70">
                          {instructor.experience}
                        </p>
                      )}
                      {instructor.expertise && instructor.expertise.length > 0 && (
                        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
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
                    </div>

                    <div className="border-t border-border/60 px-4 py-3 bg-muted/20">
                      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-foreground">5.0</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="size-3" />
                          Courses
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          Students
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="size-12 text-muted-foreground/30" />
              <p className="mt-3 text-lg font-semibold text-foreground">No instructors found</p>
              <p className="text-sm text-muted-foreground">Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-br from-[#000052] to-primary p-8 text-center text-white">
            <h2 className="text-2xl font-black sm:text-3xl">
              Want to Teach on Loshi Edu?
            </h2>
            <p className="mt-2 text-sm text-white/80">
              Share your expertise with thousands of students and earn on your
              own terms.
            </p>
            <div className="mt-5">
              <Link
                href="/become-teacher"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-lg transition-all hover:bg-white/90"
              >
                Become an Instructor
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
