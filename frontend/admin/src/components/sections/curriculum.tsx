"use client";
import { useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform, } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
const TIERS = [
    {
        name: "Foundations",
        price: "Tier 1",
        description: "For Beginners & Students. Build a strong learning foundation with core concepts and fundamentals.",
        features: [
            "Core Subject Fundamentals",
            "Study Skills & Techniques",
            "Interactive Practice Tests",
            "Daily Learning Modules",
        ],
    },
    {
        name: "Intermediate",
        price: "Tier 2",
        description: "For Growing Learners. Deep dive into advanced topics, project-based learning, and expert mentorship.",
        features: [
            "Advanced Course Library",
            "Project-Based Learning",
            "Live Mentorship Sessions",
            "Community Forum Access",
            "1-on-1 Mentorship Call",
        ],
        featured: true,
    },
    {
        name: "Pro Labs",
        price: "Tier 3",
        description: "For Professionals. Industry-grade certifications, capstone projects, and career placement support.",
        features: [
            "Industry Certifications",
            "Career Placement Support",
            "Capstone Projects",
            "Lifetime Course Updates",
            "In-Person Workshops",
        ],
    },
];
function TiltCard({ children, className = "", }: {
    children: React.ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 100 });
    function onMouseMove({ clientX, clientY, }: React.MouseEvent<HTMLDivElement>) {
        if (!ref.current)
            return;
        const { left, top, width, height } = ref.current.getBoundingClientRect();
        const xPct = (clientX - left) / width - 0.5;
        const yPct = (clientY - top) / height - 0.5;
        x.set(xPct);
        y.set(yPct);
        ref.current.style.setProperty("--mouse-x", `${clientX - left}px`);
        ref.current.style.setProperty("--mouse-y", `${clientY - top}px`);
    }
    function onMouseLeave() {
        x.set(0);
        y.set(0);
    }
    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["10deg", "-10deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-10deg", "10deg"]);
    const transform = useMotionTemplate `perspective(1000px) rotateX(${rotateX}) rotateY(${rotateY})`;
    return (<motion.div ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} style={{ transform, transformStyle: "preserve-3d" }} className={`group relative rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 md:p-8 backdrop-blur-sm transition-colors hover:border-primary/50 ${className}`}>
      <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100" style={{
            background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(99, 102, 241, 0.1), transparent 40%)`,
        }} aria-hidden="true"/>

      <div style={{ transform: "translateZ(20px)" }} className="h-full flex flex-col">
        {children}
      </div>
    </motion.div>);
}
export function Curriculum() {
    return (<section id="curriculum" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-background relative overflow-hidden" aria-labelledby="curriculum-heading">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] md:w-[1000px] h-[300px] sm:h-[400px] md:h-[500px] bg-primary/5 rounded-full blur-[80px] sm:blur-[100px] md:blur-[120px] pointer-events-none" aria-hidden="true"/>

      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10 sm:mb-14 md:mb-20">
          <h2 id="curriculum-heading" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Choose Your Path to Mastery.
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
            From beginner to professional. Select the tier that matches
            your learning goals.
          </p>
        </header>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 list-none p-0" role="list" aria-label="Learning tiers">
          {TIERS.map((tier, i) => (<li key={i}>
              <TiltCard className={`min-h-[400px] sm:min-h-[450px] md:min-h-[500px] flex flex-col ${tier.featured
                ? "border-primary/30 bg-primary/5"
                : "bg-card/50 border-border"}`}>
                <article className="flex flex-col h-full">
                  <header className="mb-5 sm:mb-6 md:mb-8">
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2">
                      {tier.name}
                    </h3>
                    <p className="text-2xl sm:text-3xl font-bold text-primary">
                      {tier.price}
                    </p>
                    <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                      {tier.description}
                    </p>
                  </header>

                  <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 flex-grow list-none p-0" role="list" aria-label={`${tier.name} tier features`}>
                    {tier.features.map((feature, j) => (<li key={j} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" aria-hidden="true"/>
                        <span>{feature}</span>
                      </li>))}
                  </ul>

                  <Link href="/signup" aria-label={`Enroll in ${tier.name} tier`} className="mt-auto">
                    <Button className={`w-full h-10 sm:h-11 text-sm sm:text-base ${tier.featured
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"}`}>
                      Enroll Now
                    </Button>
                  </Link>
                </article>
              </TiltCard>
            </li>))}
        </ul>
      </div>
    </section>);
}
