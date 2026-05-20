"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { CouponValidationResult } from "@/lib/hooks/use-coupons";

interface OrderSummaryProps {
  itemType: "COURSE" | "SECTION";
  baseAmount: number;
  finalAmount: number;
  effectiveCoupon: CouponValidationResult | null;
  couponInput: string;
  couponPreview: CouponValidationResult | null;
  isValidating: boolean;
  onCouponInputChange: (value: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  /** Shown only when amount is zero (free enrol path). */
  freeEnrolButton?: React.ReactNode;
}

export function OrderSummary({
  itemType,
  baseAmount,
  finalAmount,
  effectiveCoupon,
  couponInput,
  couponPreview,
  isValidating,
  onCouponInputChange,
  onApplyCoupon,
  onRemoveCoupon,
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
        {effectiveCoupon && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Discount · {effectiveCoupon.couponCode}
            </dt>
            <dd className="font-medium text-primary">
              −₹
              {parseFloat(String(effectiveCoupon.discountAmount)).toFixed(2)}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex items-baseline justify-between border-t border-border/70 pt-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Total
        </span>
        <span className="font-display text-2xl font-medium leading-none tracking-tight text-foreground">
          ₹{finalAmount.toFixed(2)}
        </span>
      </div>

      <div className="mt-5">
        {effectiveCoupon ? (
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="truncate font-medium text-primary">
              {effectiveCoupon.couponCode} applied
            </span>
            <button
              type="button"
              onClick={onRemoveCoupon}
              className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label
              htmlFor="coupon"
              className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            >
              Coupon
            </Label>
            <div className="flex gap-2">
              <Input
                id="coupon"
                placeholder="Enter code"
                value={couponInput}
                onChange={(e) => onCouponInputChange(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (!couponPreview) {
                    toast.error("Enter a coupon code first.");
                    return;
                  }
                  if (!couponPreview.valid) {
                    toast.error(couponPreview.message);
                    return;
                  }
                  onApplyCoupon();
                }}
                disabled={isValidating || !couponInput.trim()}
              >
                Apply
              </Button>
            </div>
            {couponPreview && (
              <p
                className={`text-[11px] ${
                  couponPreview.valid ? "text-primary" : "text-destructive"
                }`}
              >
                {couponPreview.message}
              </p>
            )}
          </div>
        )}
      </div>

      {freeEnrolButton}
    </div>
  );
}
