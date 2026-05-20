"use client";

import { motion } from "framer-motion";
import { ShoppingCart, ArrowRight, BookOpen, Sparkles, GraduationCap, Rocket, Lightbulb, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CartPage() {
  return (
    <>
      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden py-14">
          {/* Animated floating icon particles */}
          {[BookOpen, GraduationCap, Sparkles, Rocket, Lightbulb, Star].map((Icon, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute select-none opacity-15"
              style={{
                left: `${8 + i * 15}%`,
                top: `${15 + (i % 2 === 0 ? 20 : 45)}%`,
              }}
              animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4 + i * 0.5, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
            >
              <Icon className="size-6 text-primary" />
            </motion.span>
          ))}

          <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-md text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", damping: 14, stiffness: 180 }}
                className="mx-auto mb-6 flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-[#a07028] shadow-2xl shadow-primary/30"
              >
                <ShoppingCart className="size-12 text-white" />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <h1 className="section-heading text-3xl font-black text-foreground sm:text-4xl">
                  Your Cart is <span className="text-primary">Empty</span>
                </h1>
                <p className="mt-3 text-muted-foreground">
                  Looks like you haven&apos;t added any courses yet. Let&apos;s fix that!
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-8 flex flex-col items-center gap-3"
              >
                <Button size="lg" className="w-full gap-2 bg-primary font-bold shadow-lg hover:bg-primary/90 hover:-translate-y-0.5 transition-all" asChild>
                  <Link href="/courses">
                    <BookOpen className="size-4" /> Browse Courses
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full gap-2 border-2 hover:border-primary hover:-translate-y-0.5 transition-all" asChild>
                  <Link href="/courses">
                    <Sparkles className="size-4 text-primary" /> View All Courses on grotutor
                  </Link>
                </Button>
              </motion.div>

              {/* Social proof nudge */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 text-xs text-muted-foreground"
              >
                Join <span className="font-semibold text-foreground">50,000+</span> learners already upskilling on grotutor
              </motion.p>
            </div>
          </div>
      </section>
    </>
  );
}
