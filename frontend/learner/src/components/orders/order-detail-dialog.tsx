"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Printer, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { SecureImage } from "@/components/ui/secure-image";
import {
  OrderStatusChip,
  RefundStatusChip,
} from "@/components/orders/order-status-chip";
import { useRequestRefund, type Order } from "@/lib/hooks/use-orders";
import { formatDateTime, formatMoney } from "@/lib/format";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

const GATEWAY_LABEL: Record<Order["gateway"], string> = {
  RAZORPAY: "Razorpay",
  MANUAL_QR: "UPI / bank transfer",
  FREE: "Free enrolment",
};

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [reason, setReason] = useState("");
  const requestRefund = useRequestRefund();

  if (!order) return null;

  const canRefund =
    order.status === "COMPLETED" && order.refundStatus === "NONE";

  function close(next: boolean) {
    if (!next) {
      setShowRefundForm(false);
      setReason("");
    }
    onOpenChange(next);
  }

  function submitRefund() {
    if (!order) return;
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      toast.error("Tell us a little more — at least 10 characters.");
      return;
    }
    requestRefund.mutate(
      { orderId: order.orderId, reason: trimmed },
      {
        onSuccess: () => {
          toast.success("Refund requested. We will email you within 3 days.");
          setShowRefundForm(false);
          setReason("");
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not request a refund",
          ),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={close} className="max-w-2xl">
      <DialogHeader className="border-b border-border/60">
        <div className="flex items-start justify-between gap-3 pr-8">
          <div>
            <DialogTitle className="font-display text-lg font-medium">
              Invoice {order.invoiceNo}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Placed {formatDateTime(order.placedAt)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <OrderStatusChip status={order.status} />
            <RefundStatusChip status={order.refundStatus} />
          </div>
        </div>
      </DialogHeader>

      <DialogContent className="print-invoice space-y-4 pt-3">
        {/* Printed sheets need the letterhead the screen gets from the app chrome. */}
        <div className="hidden print:mb-6 print:block">
          <p className="font-display text-xl font-medium">{BRAND.name}</p>
          <p className="text-xs text-muted-foreground">{BRAND.address}</p>
          <p className="text-xs text-muted-foreground">{BRAND.email}</p>
        </div>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Items
          </h3>
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
            {order.items.map((item) => (
              <li key={item.itemId} className="flex items-center gap-3 p-2.5">
                <div className="h-10 w-16 shrink-0 overflow-hidden rounded bg-muted print:hidden">
                  <SecureImage
                    src={item.thumbnail}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {item.itemType === "SECTION"
                      ? "Section access"
                      : item.itemType === "BOOK"
                        ? "Book"
                        : "Full course"}
                  </p>
                </div>
                <p className="shrink-0 text-sm tabular-nums">
                  {formatMoney(item.unitPrice, order.currency)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-border/60 p-3">
          <dl className="space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatMoney(order.subtotal, order.currency)} />
            {order.discount > 0 && (
              <Row
                label={
                  order.couponCode
                    ? `Discount (${order.couponCode})`
                    : "Discount"
                }
                value={`− ${formatMoney(order.discount, order.currency)}`}
                tone="positive"
              />
            )}
            <Row label="GST (18%)" value={formatMoney(order.tax, order.currency)} />
            <div className="!mt-2 border-t border-border/60 pt-2">
              <Row
                label="Total paid"
                value={formatMoney(order.total, order.currency)}
                emphasis
              />
            </div>
          </dl>
        </section>

        <section className="grid gap-x-6 gap-y-2 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
          <Field label="Payment method" value={GATEWAY_LABEL[order.gateway]} />
          <Field
            label="Transaction reference"
            value={order.transactionId ?? "Not available"}
          />
          <Field label="Billed to" value={order.billingName} />
          <Field label="Email" value={order.billingEmail} />
        </section>

        {order.refundStatus !== "NONE" && order.refundReason && (
          <section className="rounded-lg border border-border/60 bg-muted/40 p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {order.refundStatus === "DECLINED"
                ? "Why the refund was declined"
                : "Your refund reason"}
            </h3>
            <p className="mt-1 text-sm">{order.refundReason}</p>
          </section>
        )}

        {showRefundForm && (
          <section className="space-y-2 rounded-lg border border-border/60 p-3 print:hidden">
            <label
              htmlFor="refund-reason"
              className="text-sm font-medium leading-none"
            >
              Why are you requesting a refund?
            </label>
            <Textarea
              id="refund-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell us what went wrong so we can put it right."
            />
            <p className="text-[11px] text-muted-foreground">
              Refunds are available within 14 days of purchase if you have
              completed less than 30% of the course.
            </p>
          </section>
        )}
      </DialogContent>

      <DialogFooter className="gap-2 border-t border-border/60 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => close(false)}>
          Close
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer className="mr-1.5 size-3.5" />
          Print invoice
        </Button>
        {canRefund &&
          (showRefundForm ? (
            <Button
              size="sm"
              onClick={submitRefund}
              disabled={requestRefund.isPending}
            >
              {requestRefund.isPending ? "Sending…" : "Send refund request"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRefundForm(true)}
            >
              <RotateCcw className="mr-1.5 size-3.5" />
              Request refund
            </Button>
          ))}
      </DialogFooter>
    </Dialog>
  );
}

function Row({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "positive";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt
        className={
          emphasis ? "text-sm font-medium" : "text-sm text-muted-foreground"
        }
      >
        {label}
      </dt>
      <dd
        className={cn(
          "tabular-nums",
          emphasis ? "text-base font-medium" : "text-sm",
          tone === "positive" && "text-emerald-700 dark:text-emerald-400",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm">{value}</p>
    </div>
  );
}
