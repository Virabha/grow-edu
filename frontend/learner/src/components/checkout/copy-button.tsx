"use client";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        toast.success(`${label} copied`);
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      aria-label={`Copy ${label}`}
    >
      <Copy className="size-3" /> Copy
    </button>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
}

export function DetailRow({ label, value, copyable, mono }: DetailRowProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 py-1.5 text-sm">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="flex max-w-full items-center gap-2 text-right">
        <span
          className={
            mono
              ? "break-all font-mono text-foreground"
              : "break-words text-foreground"
          }
        >
          {value}
        </span>
        {copyable && <CopyButton value={value} label={label} />}
      </span>
    </div>
  );
}
