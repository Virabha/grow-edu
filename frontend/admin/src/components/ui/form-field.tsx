"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
interface FormFieldProps {
    label?: string;
    error?: string;
    description?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}
export function FormField({ label, error, description, required, children, className, }: FormFieldProps) {
    return (<div className={cn("space-y-1.5", className)}>
      {label && (<Label htmlFor={undefined}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>)}
      {children}
      {description && !error && (<p className="text-xs text-muted-foreground">{description}</p>)}
      {error && (<p className="text-xs text-destructive">{error}</p>)}
    </div>);
}
