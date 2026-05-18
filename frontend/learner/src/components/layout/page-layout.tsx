"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  header: string;
  subtitle?: string;
  description?: string;
  className?: string;
}

function PageLayout({
  children,
  header,
  subtitle,
  description,
  className,
}: PageLayoutProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div>
        {subtitle && (
          <p className="text-muted-foreground text-sm font-medium">{subtitle}</p>
        )}
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {header}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export { PageLayout };
