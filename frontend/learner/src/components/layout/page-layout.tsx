"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  header: string;
  subtitle?: string;
  description?: string;
  /** Override the body container styling (rarely needed). */
  className?: string;
  /** Override the outer container — pass an empty string to remove all padding. */
  containerClassName?: string;
}

const DEFAULT_CONTAINER =
  "container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10";

function PageLayout({
  children,
  header,
  subtitle,
  description,
  className,
  containerClassName,
}: PageLayoutProps) {
  return (
    <div className={cn(containerClassName ?? DEFAULT_CONTAINER)}>
      <div className={cn("space-y-6", className)}>
        <header className="space-y-1">
          {subtitle && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {subtitle}
            </p>
          )}
          <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
            {header}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {description}
            </p>
          )}
        </header>
        {children}
      </div>
    </div>
  );
}

export { PageLayout };
