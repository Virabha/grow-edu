"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

const cards = [
  {
    role: "Become an Instructor",
    color: "from-violet-600 to-indigo-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    image: "/images/instructor.png",
    points: [
      "Teach from anywhere in India",
      "Earn from your expertise",
      "Full production support",
      "Free marketing on our platform",
    ],
    cta: "Start Teaching",
    href: "/become-teacher",
  },
  {
    role: "Enrol as a Student",
    color: "from-orange-500 to-amber-500",
    bg: "bg-orange-50",
    border: "border-orange-200",
    image: "/images/student.png",
    points: [
      "Learn from India's best tutors",
      "Lifetime course access",
      "Industry-recognised certificates",
      "AI-powered personalized paths",
    ],
    cta: "Start Learning",
    href: "/register",
  },
];

export function RolesCta() {
  return (
    <section className="py-12 md:py-10 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
            Join grotutor — However You Learn Best
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Whether you want to teach or learn, we have a place for you
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {cards.map((c, i) => (
            <motion.div
              key={c.role}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{}}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`overflow-hidden rounded-2xl border ${c.border} ${c.bg}`}
            >
              <div className="flex flex-col sm:flex-row">
                <div className="flex-1 p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${c.color} text-white shadow-sm`}
                    >
                      {i === 0 ? (
                        <GraduationCap className="size-5" />
                      ) : (
                        <BookOpen className="size-5" />
                      )}
                    </div>
                    <h3 className="text-base font-bold text-foreground sm:text-lg">
                      {c.role}
                    </h3>
                  </div>
                  <ul className="mb-5 space-y-2.5">
                    {c.points.map((pt) => (
                      <li
                        key={pt}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="sm"
                    className={`gap-2 bg-gradient-to-r ${c.color} text-white font-semibold shadow-sm hover:opacity-90 transition-all`}
                    asChild
                  >
                    <Link href={c.href}>
                      {c.cta} <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
                <div className="relative hidden sm:block sm:w-48 md:w-56">
                  <Image
                    width={100}
                    height={100}
                    src={c.image}
                    alt={c.role}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${c.color} opacity-10`}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
