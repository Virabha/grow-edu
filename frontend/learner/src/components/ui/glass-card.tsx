import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassCardVariants = cva(
  "rounded-xl border backdrop-blur-md transition-all duration-300",
  {
    variants: {
      variant: {
        default:
          "bg-white/50 border-border/60 text-card-foreground backdrop-blur-md shadow-sm",
        light:
          "bg-white/40 border-border/40 text-foreground backdrop-blur-sm",
        accent:
          "bg-primary/[0.06] border-primary/20 text-foreground backdrop-blur-sm",
      },
      hover: {
        true: "hover:bg-white/65 hover:border-border/80 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
        false: "",
      },
      glow: {
        true: "shadow-[0_0_20px_rgba(99,102,241,0.08)]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      hover: false,
      glow: false,
    },
  }
);

type GlassCardProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof glassCardVariants>;

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  function GlassCard({ className, variant, hover, glow, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(glassCardVariants({ variant, hover, glow, className }))}
        {...props}
      />
    );
  }
);

export { GlassCard, glassCardVariants };
