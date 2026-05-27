"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Standard form sheet: sticky header, scrolling form body, sticky footer with
 * two half-width buttons. Use for every admin form dialog so layout/spacing is
 * uniform across the app.
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  submitting = false,
  submitDisabled = false,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitting?: boolean;
  submitDisabled?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const widthCls =
    size === "sm"
      ? "sm:max-w-md"
      : size === "lg"
        ? "sm:max-w-xl"
        : "sm:max-w-lg";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn("flex w-full flex-col gap-0 p-0", widthCls)}
      >
        <form
          onSubmit={onSubmit}
          className="flex h-full min-h-0 flex-col"
        >
          <SheetHeader className="shrink-0 border-b border-border px-5 py-3.5">
            <SheetTitle className="font-display text-base font-semibold">
              {title}
            </SheetTitle>
            {description && (
              <SheetDescription className="text-xs text-muted-foreground">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
            {children}
          </div>

          <div className="shrink-0 border-t border-border bg-background px-5 py-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9 w-full"
              >
                {cancelLabel}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || submitDisabled}
                className="h-9 w-full"
              >
                {submitting ? "Saving…" : submitLabel}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
