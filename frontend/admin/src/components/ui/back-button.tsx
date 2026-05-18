"use client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
interface BackButtonProps {
  href?: string;
  label?: string;
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "link"
    | "destructive"
    | "secondary";
  className?: string;
  onClick?: () => void;
}
export function BackButton({
  href,
  label = "Back to Courses",
  variant = "outline",
  className = "gap-2",
  onClick,
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) onClick();
    else if (href) router.push(href);
    else router.back();
  };

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      className={cn("w-full sm:w-auto", className)}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">Back</span>
    </Button>
  );
}
