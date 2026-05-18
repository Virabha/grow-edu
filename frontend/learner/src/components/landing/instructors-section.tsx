"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, BookOpen, Users, ArrowRight, Facebook, Linkedin, Youtube, Instagram } from "lucide-react";
import { useInstructors } from "@/lib/hooks/use-cms";

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const avatarColors = ["#6366f1", "#10b981", "#f97316", "#ec4899"];

const socialIcons = [
  { icon: Facebook, color: "#1877f2" },
  { icon: Linkedin, color: "#0a66c2" },
  { icon: Youtube, color: "#ff0000" },
  { icon: Instagram, color: "#e1306c" },
];

export function InstructorsSection() {
  const { data: instructors = [], isLoading } = useInstructors();

  if (isLoading) {
    return (
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Our Experts</p>
            <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl md:text-3xl">Meet the Instructors</h2>
          </div>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!instructors.length) return null;

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{}}
          transition={{ duration: 0.5 }}
          className="mb-8 flex items-end justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Our Experts</p>
            <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl md:text-3xl">Meet the Instructors</h2>
            <p className="mt-1 text-sm text-muted-foreground">Learn from industry leaders and experienced educators</p>
          </div>
          <Link href="/instructors" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex">
            All instructors <ArrowRight className="size-3.5" />
          </Link>
        </motion.div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {instructors.map((person, i) => (
            <motion.div
              key={person.profileId}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{}}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Link
                href={`/instructors/${person.userId}`}
                className="group block rounded-2xl border border-border/80 bg-white shadow-sm text-center transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
              >
                <div className="relative pt-8 pb-5 px-4">
                  <div className="relative mx-auto mb-4 size-24 sm:size-28">
                    {person.avatarUrl ? (
                      <div className="relative size-full overflow-hidden rounded-full ring-4 ring-primary/10">
                        <Image
                          src={person.avatarUrl}
                          alt={person.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                          unoptimized={person.avatarUrl.startsWith("http")}
                        />
                      </div>
                    ) : (
                      <div
                        className="flex size-full items-center justify-center rounded-full text-2xl font-black text-white shadow-md ring-4 ring-primary/10 transition-transform duration-300 group-hover:scale-110"
                        style={{ background: `linear-gradient(135deg, ${avatarColors[i % 4]}, ${avatarColors[i % 4]}cc)` }}
                      >
                        {getInitials(person.name)}
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

                  <h3 className="text-sm font-bold text-foreground transition-colors group-hover:text-primary sm:text-base">
                    {person.name}
                  </h3>
                  {person.expertise?.length ? (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1 sm:text-sm">
                      {person.expertise[0]}
                    </p>
                  ) : null}
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

        <div className="mt-6 flex justify-center sm:hidden">
          <Link href="/instructors" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            All instructors <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
