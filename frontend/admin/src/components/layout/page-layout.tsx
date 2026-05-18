"use client";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PageLayoutProps {
  children: ReactNode;
  header?: string;
  subtitle?: string;
  description?: string;
  actions?: ReactNode;
  /** Sticky filter bar rendered below the header */
  filters?: ReactNode;
  className?: string;
  containerClassName?: string;
  enableTransition?: boolean;
}

export function PageLayout({
  children,
  header,
  subtitle,
  description,
  actions,
  filters,
  className,
  containerClassName,
}: PageLayoutProps) {
  const hasHeader = header || subtitle || description || actions;

  return (
    <div
      className={cn(
        "flex flex-col h-[100dvh] bg-background w-full max-w-full overflow-hidden",
        containerClassName,
      )}
    >
      {/* Sticky header — never scrolls */}
      {hasHeader && (
        <div className="shrink-0 border-b border-border bg-background/95 backdrop-blur-sm px-3 sm:px-4 md:px-5 py-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
            <div className="space-y-0.5 flex-1 min-w-0">
              {subtitle && (
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  {subtitle}
                </p>
              )}
              {header && (
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  {header}
                </h1>
              )}
              {description && (
                <p className="text-sm font-medium text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sticky filter bar — never scrolls */}
      {filters && (
        <div className="shrink-0 border-b border-border bg-muted/30 px-3 sm:px-4 md:px-5 py-2">
          {filters}
        </div>
      )}

      {/* Scrollable content using ScrollArea */}
      <ScrollArea className="flex-1">
        <div
          className={cn(
            "px-3 sm:px-4 md:px-5 py-2.5 space-y-2 sm:space-y-2.5 w-full max-w-full",
            className,
          )}
        >
          {children}
        </div>
      </ScrollArea>
    </div>
  );
}
