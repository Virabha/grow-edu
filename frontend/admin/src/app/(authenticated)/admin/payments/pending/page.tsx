"use client";
import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  usePendingPayments,
  useApprovePayment,
  useRejectPayment,
} from "@/features/payments/hooks/use-payments";
import { PaymentStatusBadge } from "@/features/payments/components/payment-status-badge";
import type { PaymentDetail } from "@/features/payments/api/payments.api";

type Action = "approve" | "reject" | null;

function CopyChip({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        toast.success(`${label} copied`);
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      aria-label={`Copy ${label}`}
    >
      <span className="text-[10px] font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-foreground">{value}</span>
    </button>
  );
}

export default function PendingPaymentsPage() {
  const { data, isLoading } = usePendingPayments(1, 50);
  const approve = useApprovePayment();
  const reject = useRejectPayment();

  const [reviewing, setReviewing] = useState<PaymentDetail | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [notes, setNotes] = useState("");

  const reset = () => {
    setReviewing(null);
    setAction(null);
    setNotes("");
  };

  const onSubmit = async () => {
    if (!reviewing || !action) return;
    if (action === "reject" && !notes.trim()) {
      toast.error("Rejection notes are required.");
      return;
    }
    try {
      if (action === "approve") {
        await approve.mutateAsync({
          paymentId: reviewing.paymentId,
          notes: notes || undefined,
        });
        toast.success("Payment approved.");
      } else {
        await reject.mutateAsync({
          paymentId: reviewing.paymentId,
          notes,
        });
        toast.success("Payment rejected.");
      }
      reset();
    } catch (e) {
      toast.error((e as Error)?.message || "Action failed.");
    }
  };

  const rows = (data?.data ?? []) as PaymentDetail[];

  return (
    <PageLayout
      subtitle="Console"
      header="Pending reviews"
      description="Manual-QR payments awaiting verification. Cross-check the transaction ID before approving."
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nothing to review"
          description="All caught up. New submissions land here automatically."
          icon={<CheckCircle2 className="h-12 w-12" />}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((p) => (
            <article
              key={p.paymentId}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <header className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {p.itemType ?? "Course"}
                  </p>
                  <p className="font-display mt-1 truncate text-lg font-medium text-foreground">
                    {p.course?.title || p.section?.title || "Untitled"}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {[p.user?.firstName, p.user?.lastName]
                      .filter(Boolean)
                      .join(" ") || "Unknown"}{" "}
                    · {p.user?.email}
                  </p>
                </div>
                <div className="text-right">
                  <PaymentStatusBadge status={p.status} />
                  <p className="font-display mt-2 text-xl font-medium leading-none text-foreground">
                    ₹{Number(p.amount).toFixed(2)}
                  </p>
                </div>
              </header>

              <div className="grid gap-4 p-5 sm:grid-cols-[120px_1fr]">
                {p.paymentProofUrl ? (
                  <a
                    href={p.paymentProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-background"
                  >
                    <Image
                      src={p.paymentProofUrl}
                      alt="Payment proof"
                      fill
                      className="object-cover"
                      sizes="120px"
                      unoptimized
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-foreground/70 py-1.5 text-[10px] font-medium uppercase tracking-widest text-background opacity-0 transition-opacity group-hover:opacity-100">
                      Full size <ExternalLink className="size-3" />
                    </div>
                  </a>
                ) : (
                  <div className="grid aspect-[3/4] place-items-center rounded-xl border border-dashed border-border bg-muted/30 text-[11px] uppercase tracking-widest text-muted-foreground">
                    No image
                  </div>
                )}

                <dl className="space-y-2.5 text-sm">
                  {p.transactionId && (
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Transaction ID
                      </dt>
                      <dd className="mt-1">
                        <CopyChip
                          label="UTR"
                          value={p.transactionId}
                        />
                      </dd>
                    </div>
                  )}
                  {p.payerName && (
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Payer (declared)
                      </dt>
                      <dd className="mt-1 text-foreground">{p.payerName}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Submitted
                    </dt>
                    <dd className="mt-1 text-xs text-muted-foreground">
                      {p.proofUploadedAt
                        ? new Date(p.proofUploadedAt).toLocaleString()
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              <footer className="flex items-center justify-end gap-2 border-t border-border/70 bg-muted/20 px-5 py-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setReviewing(p);
                    setAction("reject");
                    setNotes("");
                  }}
                >
                  <XCircle className="size-3.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setReviewing(p);
                    setAction("approve");
                    setNotes("");
                  }}
                >
                  <CheckCircle2 className="size-3.5" />
                  Approve
                </Button>
              </footer>
            </article>
          ))}
        </div>
      )}

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && reset()}>
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

          {reviewing && (
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <p className="font-display text-base font-medium text-foreground">
                {reviewing.course?.title ||
                  reviewing.section?.title ||
                  "Course"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {reviewing.user?.email} · ₹
                {Number(reviewing.amount).toFixed(2)} ·{" "}
                {reviewing.transactionId
                  ? `txn ${reviewing.transactionId}`
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
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={approve.isPending || reject.isPending}
              variant={action === "reject" ? "destructive" : "default"}
              className="gap-1.5"
            >
              {(approve.isPending || reject.isPending) && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              {action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
