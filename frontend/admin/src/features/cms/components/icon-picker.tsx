"use client";

import {
  Brain,
  GraduationCap,
  Award,
  Gamepad2,
  Globe,
  Clock,
  BookOpen,
  Users,
  Sparkles,
  Target,
  Eye,
  Rocket,
  Briefcase,
  Star,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Brain,
  GraduationCap,
  Award,
  Gamepad2,
  Globe,
  Clock,
  BookOpen,
  Users,
  Sparkles,
  Target,
  Eye,
  Rocket,
  Briefcase,
  Star,
  TrendingUp,
  Zap,
};

const ICON_NAMES = Object.keys(ICONS);

export { ICON_NAMES };

export function IconPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (name: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-4 sm:grid-cols-6 gap-2", className)}>
      {ICON_NAMES.map((name) => {
        const Icon = ICONS[name];
        if (Icon === undefined) return null;
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs transition-colors",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted"
            )}
            title={name}
          >
            <Icon className="size-5" />
            <span className="truncate w-full text-center">{name}</span>
          </button>
        );
      })}
    </div>
  );
}
