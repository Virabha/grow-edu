"use client";
import { useRef } from "react";
import { useInView } from "framer-motion";
import { AnimatedNumber } from "@/components/analytics/animated-number";
const STATS = [
    {
        label: "Learners",
        value: 10000,
        suffix: "+",
        description: "Learning across courses and programs",
    },
    {
        label: "Learning paths",
        value: "Curated",
        description: "Structured journeys for real outcomes",
    },
    {
        label: "Certificates",
        value: "Credible",
        description: "Track progress and earn completion certificates",
    },
];
export function TrustStats() {
    const containerRef = useRef<HTMLDivElement>(null);
    const inView = useInView(containerRef, { once: true, amount: 0.35 });
    return (<section className="py-10 sm:py-12 bg-muted/30 border-y border-border" aria-label="Platform highlights">
      <div ref={containerRef} className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Trusted by learners, professionals, and institutions worldwide.
          </p>
        </div>

        <dl className="mt-8 grid gap-8 md:grid-cols-3" aria-label="Platform highlights">
          {STATS.map((s, idx) => (<div key={s.label} className={[
                "text-center md:text-left",
                idx !== 0 ? "md:border-l md:border-border/60 md:pl-8" : "",
            ].join(" ")}>
              <dd className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                {typeof s.value === "number" ? (inView ? (<AnimatedNumber value={s.value} suffix={s.suffix ?? ""} variant="plain" className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"/>) : (<span>0{s.suffix ?? ""}</span>)) : (s.value)}
              </dd>
              <dt className="mt-1 text-sm font-semibold text-foreground/90">
                {s.label}
              </dt>
              <dd className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {s.description}
              </dd>
            </div>))}
        </dl>
      </div>
    </section>);
}
