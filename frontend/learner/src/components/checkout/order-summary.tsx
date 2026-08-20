"use client";

interface OrderSummaryProps {
  itemType: "COURSE" | "SECTION";
  baseAmount: number;
  finalAmount: number;
  /** Shown only when amount is zero (free enrol path). */
  freeEnrolButton?: React.ReactNode;
}

export function OrderSummary({
  itemType,
  baseAmount,
  finalAmount,
  freeEnrolButton,
}: OrderSummaryProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Order summary
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">
            {itemType === "SECTION" ? "Section price" : "Course price"}
          </dt>
          <dd className="font-medium text-foreground">
            ₹{baseAmount.toFixed(2)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-baseline justify-between border-t border-border/70 pt-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Total
        </span>
        <span className="font-display text-2xl font-medium leading-none tracking-tight text-foreground">
          ₹{finalAmount.toFixed(2)}
        </span>
      </div>

      {freeEnrolButton}
    </div>
  );
}
