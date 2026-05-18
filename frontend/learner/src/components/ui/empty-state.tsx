import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
}

function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed py-12 px-4 text-center",
        className
      )}
    >
      {icon && (
        <div className="text-muted-foreground mb-4 flex justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export { EmptyState };
