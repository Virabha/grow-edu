"use client";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  COMPLETED: "border-emerald-300/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
  PENDING:
    "border-amber-300/40 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
  PROOF_UPLOADED:
    "border-blue-300/40 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200",
  FAILED:
    "border-destructive/30 bg-destructive/5 text-destructive",
  REJECTED:
    "border-destructive/30 bg-destructive/5 text-destructive",
  REFUNDED:
    "border-border bg-muted text-muted-foreground",
};

const labels: Record<string, string> = {
  COMPLETED: "Completed",
  PENDING: "Pending",
  PROOF_UPLOADED: "Awaiting review",
  FAILED: "Failed",
  REJECTED: "Rejected",
  REFUNDED: "Refunded",
};

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest",
        styles[status] ?? "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}
