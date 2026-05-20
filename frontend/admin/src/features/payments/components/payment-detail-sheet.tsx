"use client";
import Image from "next/image";
import { CopyIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentStatusBadge } from "./payment-status-badge";
import type { PaymentDetail } from "../api/payments.api";

function Row({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  copyable?: boolean;
}) {
  if (value == null || value === "") return null;
  const display = String(value);
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center justify-between gap-3">
        <p
          className={
            mono
              ? "break-all font-mono text-sm text-foreground"
              : "text-sm text-foreground"
          }
        >
          {display}
        </p>
        {copyable && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(display);
              toast.success(`${label} copied`);
            }}
            className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            aria-label={`Copy ${label}`}
          >
            <CopyIcon className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        — {title}
      </p>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

interface PaymentDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentDetail | undefined;
  isLoading: boolean;
}

export function PaymentDetailSheet({
  open,
  onOpenChange,
  payment,
  isLoading,
}: PaymentDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader className="py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Payment
          </p>
          <SheetTitle>
            {payment
              ? `₹${parseFloat(String(payment.amount)).toFixed(2)}`
              : "Loading…"}
          </SheetTitle>
          {payment && <PaymentStatusBadge status={payment.status} />}
        </SheetHeader>

        <SheetBody className="scrollbar-hide">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : payment ? (
            <div className="space-y-7">
              <Section title="Identifiers">
                <Row label="Payment ID" value={payment.paymentId} mono copyable />
                {payment.transactionId && (
                  <Row
                    label="Transaction ID / UTR"
                    value={payment.transactionId}
                    mono
                    copyable
                  />
                )}
                {payment.gateway && (
                  <Row label="Gateway" value={payment.gateway} />
                )}
              </Section>

              <Section title="Amount">
                <div className="grid grid-cols-2 gap-4">
                  <Row
                    label="Final"
                    value={`₹${parseFloat(String(payment.amount)).toFixed(2)}`}
                  />
                  {payment.originalAmount != null && (
                    <Row
                      label="Original"
                      value={`₹${parseFloat(String(payment.originalAmount)).toFixed(2)}`}
                    />
                  )}
                  {payment.discountAmount != null &&
                    parseFloat(String(payment.discountAmount)) > 0 && (
                      <Row
                        label="Discount"
                        value={`−₹${parseFloat(String(payment.discountAmount)).toFixed(2)}`}
                      />
                    )}
                  {payment.coupon && (
                    <Row
                      label="Coupon"
                      value={payment.coupon.couponCode}
                      mono
                    />
                  )}
                </div>
              </Section>

              {(payment.payerName || payment.user) && (
                <Section title="Payer">
                  {payment.payerName && (
                    <Row label="Payer name (declared)" value={payment.payerName} />
                  )}
                  {payment.user && (
                    <>
                      <Row
                        label="Account holder"
                        value={
                          [payment.user.firstName, payment.user.lastName]
                            .filter(Boolean)
                            .join(" ") || "—"
                        }
                      />
                      <Row label="Email" value={payment.user.email} copyable />
                    </>
                  )}
                </Section>
              )}

              {(payment.course || payment.section) && (
                <Section title="Item">
                  {payment.course && (
                    <Row label="Course" value={payment.course.title} />
                  )}
                  {payment.section && (
                    <Row label="Section" value={payment.section.title} />
                  )}
                  {payment.itemType && (
                    <Row label="Type" value={payment.itemType} />
                  )}
                </Section>
              )}

              {payment.paymentProofUrl && (
                <Section title="Proof">
                  <a
                    href={payment.paymentProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block overflow-hidden rounded-xl border border-border bg-background"
                  >
                    <div className="relative aspect-video">
                      <Image
                        src={payment.paymentProofUrl}
                        alt="Payment proof"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
                      <span className="text-muted-foreground">
                        Click to view full size
                      </span>
                      <ExternalLink className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </div>
                  </a>
                </Section>
              )}

              <Section title="Timestamps">
                <Row
                  label="Created"
                  value={new Date(payment.createdAt).toLocaleString()}
                />
                {payment.proofUploadedAt && (
                  <Row
                    label="Proof uploaded"
                    value={new Date(payment.proofUploadedAt).toLocaleString()}
                  />
                )}
                {payment.reviewedAt && (
                  <Row
                    label="Reviewed"
                    value={new Date(payment.reviewedAt).toLocaleString()}
                  />
                )}
                {payment.reviewNotes && (
                  <Row label="Review notes" value={payment.reviewNotes} />
                )}
              </Section>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No payment data found.
            </p>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
