import { cn } from "@/lib/utils";
import type { OrderStatus, RefundStatus } from "@/lib/hooks/use-orders";

const ORDER_TONE: Record<OrderStatus, { label: string; className: string }> = {
  COMPLETED: {
    label: "Paid",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  PENDING: {
    label: "Awaiting payment",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
  PROOF_UPLOADED: {
    label: "Under review",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  },
  REFUNDED: {
    label: "Refunded",
    className:
      "bg-stone-200 text-stone-700 dark:bg-stone-700/50 dark:text-stone-200",
  },
};

const REFUND_TONE: Record<
  Exclude<RefundStatus, "NONE">,
  { label: string; className: string }
> = {
  REQUESTED: {
    label: "Refund requested",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
  APPROVED: {
    label: "Refund approved",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  DECLINED: {
    label: "Refund declined",
    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  },
};

const BASE =
  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap";

const NEUTRAL =
  "bg-stone-200 text-stone-700 dark:bg-stone-700/50 dark:text-stone-200";

export function OrderStatusChip({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  // status arrives over the network — a value the union does not know about
  // must degrade, not crash the list.
  const tone = ORDER_TONE[status];
  return (
    <span className={cn(BASE, tone?.className ?? NEUTRAL, className)}>
      {tone?.label ?? status}
    </span>
  );
}

export function RefundStatusChip({
  status,
  className,
}: {
  status: RefundStatus;
  className?: string;
}) {
  if (status === "NONE") return null;
  const tone = REFUND_TONE[status];
  return (
    <span className={cn(BASE, tone?.className ?? NEUTRAL, className)}>
      {tone?.label ?? status}
    </span>
  );
}
