"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => onOpenChange(false)}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-50 w-full max-w-4xl max-h-[90vh] flex flex-col bg-background rounded-lg shadow-xl border border-border mx-4 my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col space-y-1 p-4 pb-2 shrink-0", className)}>
      {children}
    </div>
  );
}

function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-2xl font-semibold leading-none tracking-tight", className)}>
      {children}
    </h2>
  );
}

function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  );
}

function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("p-4 pt-0 overflow-y-auto flex-1 min-h-0", className)}>
      {children}
    </div>
  );
}

function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-4 pt-2 shrink-0", className)}>
      {children}
    </div>
  );
}

function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      onClick={onClose}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </Button>
  );
}

export { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, DialogClose };
