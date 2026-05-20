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
        <div
          className={cn(
            "shrink-0 border-b border-border bg-background/95 backdrop-blur-sm py-2.5",
            /* Below lg, sidebar menu is fixed top-left — inset title row so it does not sit under the toggle */
            "pl-11 pr-3 sm:pl-12 sm:pr-4 md:pl-11 md:pr-5 lg:px-5",
          )}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-x-3 sm:gap-y-2 md:items-center">
            <div className="min-w-0 flex-1 space-y-0.5 pr-1">
              {subtitle && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
                  {subtitle}
                </p>
              )}
              {header && (
                <h1 className="font-display truncate text-lg font-medium tracking-tight text-foreground sm:text-xl md:text-2xl">
                  {header}
                </h1>
              )}
              {description && (
                <p className="text-pretty text-xs text-muted-foreground sm:text-sm">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex min-w-0 w-full flex-wrap items-center gap-2 sm:w-auto sm:max-w-[min(100%,24rem)] sm:flex-initial sm:justify-end md:max-w-none">
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
