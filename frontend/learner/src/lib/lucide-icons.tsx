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

const iconMap: Record<string, LucideIcon> = {
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

export function getLucideIcon(name: string): LucideIcon {
  return iconMap[name] ?? BookOpen;
}
