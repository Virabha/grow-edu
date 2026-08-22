"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  CopyIcon,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentStatusBadge } from "./payment-status-badge";
import type { PaymentDetail } from "../api/payments.api";
import { useApprovePayment, useRejectPayment } from "../hooks/use-payments";
import { getApiError } from "@/lib/api/errors";

type Action = "approve" | "reject" | null;

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
  const approve = useApprovePayment();
  const reject = useRejectPayment();
  const [action, setAction] = useState<Action>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) {
      setAction(null);
      setNotes("");
    }
  }, [open]);

  const canReview = payment?.status === "PROOF_UPLOADED";
  const isSubmitting = approve.isPending || reject.isPending;

  const onConfirm = async () => {
    if (!payment || !action) return;
    if (action === "reject" && !notes.trim()) {
      toast.error("Rejection notes are required.");
      return;
    }
    try {
      if (action === "approve") {
        await approve.mutateAsync({
          paymentId: payment.paymentId,
          notes: notes.trim() || undefined,
        });
        toast.success("Payment approved.");
      } else {
        await reject.mutateAsync({
          paymentId: payment.paymentId,
          notes: notes.trim(),
        });
        toast.success("Payment rejected.");
      }
      setAction(null);
      setNotes("");
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiError(err, "Action failed.").message);
    }
  };

  return (
    <>
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
                  <Row
                    label="Payment ID"
                    value={payment.paymentId}
                    mono
                    copyable
                  />
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
                      <Row
                        label="Payer name (declared)"
                        value={payment.payerName}
                      />
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
                        <Row
                          label="Email"
                          value={payment.user.email}
                          copyable
                        />
                      </>
                    )}
                  </Section>
                )}

                {(payment.batch || payment.itemType) && (
                  <Section title="Item">
                    {payment.batch && (
                      <Row label="Batch" value={payment.batch.title} />
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

          {canReview && (
            <SheetFooter className="border-t border-border">
              <div className="flex w-full items-center justify-end gap-2">
                <Button
                  variant="outline"
                  className="gap-1.5 flex-1"
                  disabled={isSubmitting}
                  onClick={() => {
                    setAction("reject");
                    setNotes("");
                  }}
                >
                  <XCircle className="size-3.5" />
                  Reject
                </Button>
                <Button
                  className="gap-1.5 flex-1"
                  disabled={isSubmitting}
                  onClick={() => {
                    setAction("approve");
                    setNotes("");
                  }}
                >
                  <CheckCircle2 className="size-3.5" />
                  Approve
                </Button>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!action}
        onOpenChange={(o) => {
          if (!o) {
            setAction(null);
            setNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Review payment
            </p>
            <DialogTitle>
              {action === "approve"
                ? "Approve & enrol the learner?"
                : "Reject this payment?"}
            </DialogTitle>
          </DialogHeader>

          {payment && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <p className="font-display text-base font-medium text-foreground">
                {payment.batch?.title || "Batch"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {payment.user?.email} · ₹{Number(payment.amount).toFixed(2)} ·{" "}
                {payment.transactionId
                  ? `txn ${payment.transactionId}`
                  : "no txn id"}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label
              htmlFor="review-notes"
              className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            >
              Notes
              {action === "reject" && (
                <span className="ml-1 text-destructive">*</span>
              )}
            </Label>
            <Textarea
              id="review-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                action === "approve"
                  ? "Optional note for the record"
                  : "Why are you rejecting? This is shown to the learner."
              }
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setAction(null);
                setNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isSubmitting}
              variant={action === "reject" ? "destructive" : "default"}
              className="gap-1.5"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              {action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
