"use client";
import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  description?: string;
  value: string | number;
  icon?: LucideIcon;
  /** Kept for backward compat; unused in editorial style. */
  gradient?: string;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}

export function StatCard({
  title,
  description,
  value,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("h-full", className)}
    >
      <div className="group relative flex h-full flex-col justify-between gap-4 rounded-2xl border border-border/70 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_4px_20px_-4px_rgba(28,25,23,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {title}
            </p>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground/80">
                {description}
              </p>
            )}
          </div>
          {Icon && (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-primary">
              <Icon className="size-4" />
            </span>
          )}
        </div>
        <div>
          <p className="font-display text-3xl font-medium leading-none tracking-tight text-foreground sm:text-4xl">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                "mt-2 inline-flex items-center gap-1 text-xs font-medium",
                trend.isPositive ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="size-3.5" />
              ) : (
                <TrendingDown className="size-3.5" />
              )}
              {Math.abs(trend.value)}%
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
