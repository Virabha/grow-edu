"use client";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
interface PageHeaderProps {
    title: string;
    subtitle?: string;
    description?: string;
    actions?: ReactNode;
    className?: string;
}
export function PageHeader({ title, subtitle, description, actions, className, }: PageHeaderProps) {
    return (<div className={cn("mb-4 space-y-1.5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          {subtitle && (<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {subtitle}
            </p>)}
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (<p className="text-sm text-muted-foreground max-w-3xl mt-1">
              {description}
            </p>)}
        </div>
        {actions && (<div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>)}
      </div>
    </div>);
}
