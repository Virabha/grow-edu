"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "50,000", suffix: "+", label: "Learners enrolled" },
  { value: "500", suffix: "+", label: "Expert-led courses" },
  { value: "100", suffix: "+", label: "Industry mentors" },
  { value: "95", suffix: "%", label: "Completion rate" },
];

export function StatsStrip() {
  return (
    <section
      className="relative border-y border-border/70 bg-card"
      aria-label="Platform statistics"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 divide-x divide-border/70 sm:grid-cols-4">
          {stats.map(({ value, suffix, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="flex flex-col items-start gap-1 px-4 py-7 first:pl-0 last:pr-0 sm:px-7"
            >
              <span className="font-display text-[2.5rem] font-medium leading-none tracking-tight text-foreground sm:text-5xl">
                {value}
                <span className="text-primary">{suffix}</span>
              </span>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">
                {label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
