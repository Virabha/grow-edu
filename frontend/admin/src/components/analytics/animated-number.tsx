"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
interface AnimatedNumberProps {
    value: number;
    suffix?: string;
    decimals?: number;
    useGrouping?: boolean;
    variant?: "gradient" | "plain";
    className?: string;
    durationMs?: number;
    steps?: number;
}
export function AnimatedNumber({ value, suffix = "", decimals = 0, useGrouping = true, variant = "gradient", className, durationMs = 1500, steps = 60, }: AnimatedNumberProps) {
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
        const increment = value / steps;
        const stepDuration = durationMs / steps;
        let current = 0;
        let step = 0;
        const timer = setInterval(() => {
            step++;
            current = Math.min(increment * step, value);
            setDisplayValue(current);
            if (step >= steps) {
                setDisplayValue(value);
                clearInterval(timer);
            }
        }, stepDuration);
        return () => clearInterval(timer);
    }, [value, durationMs, steps]);
    const formatted = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping,
    }).format(displayValue);
    return (<motion.span key={value} initial={{ opacity: 0, scale: 0.5, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, type: "spring", stiffness: 100 }} className={cn(variant === "gradient"
            ? "text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent break-words"
            : "font-bold", className)}>
      {formatted}
      {suffix}
    </motion.span>);
}
