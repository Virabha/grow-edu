"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
function ToolkitItem({ title, headline, description, index, imageSrc, imageAlt, }: {
    title: string;
    headline: string;
    description: string;
    index: number;
    imageSrc: string;
    imageAlt: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });
    const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
    const isEven = index % 2 === 0;
    return (<article ref={ref} className={`flex flex-col md:flex-row items-center gap-8 sm:gap-8 md:gap-16 lg:gap-24 py-8 sm:py-10 md:py-12 ${isEven ? "" : "md:flex-row-reverse"}`}>
      <div className="flex-1 space-y-4 sm:space-y-6 text-center md:text-left">
        <header>
          <p className="flex items-center justify-center md:justify-start gap-3 text-primary mb-2">
            <span className="text-xs sm:text-sm font-bold tracking-widest uppercase">
              {title}
            </span>
          </p>
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            {headline}
          </h3>
        </header>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
          {description}
        </p>
        <Link href="/signup" aria-label={`Learn more about ${title}`}>
          <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            Learn More
          </Button>
        </Link>
      </div>
      <figure className="flex-1 w-full relative aspect-video bg-card/50 rounded-lg sm:rounded-xl overflow-hidden border border-border group m-0">
        <div className={`absolute inset-0 bg-gradient-to-br ${isEven
            ? "from-blue-900/10 to-background"
            : "from-emerald-900/10 to-background"} z-0`} aria-hidden="true"/>

        <motion.div style={{ y }} className="absolute inset-0 w-full h-full p-4 sm:p-6 md:p-8 flex items-center justify-center z-10">
          <div className="relative w-full h-full">
            <Image src={imageSrc} alt={imageAlt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-105" loading="lazy"/>
          </div>
        </motion.div>
      </figure>
    </article>);
}
export function Toolkits() {
    return (<section id="toolkits" className="py-12 sm:py-10 md:py-14 px-4 sm:px-6 bg-background" aria-labelledby="toolkits-heading">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10 sm:mb-10 md:mb-24">
          <h2 id="toolkits-heading" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Learning Toolkits
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
            Equip yourself with powerful tools to track your progress and master new skills.
          </p>
        </header>

        <div className="space-y-6 sm:space-y-16 md:space-y-24" role="list" aria-label="Learning tools">
          <ToolkitItem index={0} title="Progress Tracker" headline="Stay On Track With Your Goals." description="Our dynamic progress tracker adapts to your learning pace and highlights areas where you need more practice." imageSrc="/illustrations/risk_calculator.svg" imageAlt="Progress tracker showing learning analytics and skill assessments"/>
          <ToolkitItem index={1} title="Study Journal" headline="The Learner's Edge." description="Track your study habits, note key concepts, and measure your improvement. Data-driven learning leads to better outcomes." imageSrc="/illustrations/analytics_setup.svg" imageAlt="Study journal interface showing learning progress and notes"/>
        </div>
      </div>
    </section>);
}
