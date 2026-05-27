"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentPanel } from "@/components/checkout/payment-panel";
import { ProofPanel } from "@/components/checkout/proof-panel";
import {
  useBatchBySlug,
  useStartBatchCheckout,
} from "@/lib/hooks/use-batches";
import {
  useMyPayment,
  useQRSettings,
  type CreateManualQRResponse,
} from "@/lib/hooks/use-payments";

export default function BatchCheckoutPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(props.params);
  const router = useRouter();
  const { data: batch, isLoading } = useBatchBySlug(slug);
  const startCheckout = useStartBatchCheckout();
  const { data: qrSettings } = useQRSettings();
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const { data: payment } = useMyPayment(paymentId);

  useEffect(() => {
    if (!batch || paymentId !== null || startCheckout.isPending) return;
    if (batch.isEnrolled) {
      router.replace(`/batches/${slug}`);
      return;
    }
    startCheckout
      .mutateAsync({ batchId: batch.batchId })
      .then((res) => {
        if (res.enrolled) {
          toast.success("Enrolled — it was free!");
          router.replace(`/batches/${slug}`);
          return;
        }
        if (res.paymentId) setPaymentId(res.paymentId);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to start checkout";
        setInitError(msg);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.batchId]);

  const pending: CreateManualQRResponse | null = useMemo(() => {
    if (!payment || !qrSettings || !paymentId) return null;
    return {
      paymentId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      qrSettings,
    };
  }, [payment, qrSettings, paymentId]);

  if (isLoading) {
    return (
      <PageLayout header="Loading…">
        <Skeleton className="h-48 w-full" />
      </PageLayout>
    );
  }

  if (!batch) {
    return (
      <PageLayout header="Not found">
        <EmptyState title="Batch not found" />
      </PageLayout>
    );
  }

  return (
    <PageLayout subtitle="Enroll" header={batch.title}>
      <div className="-mt-4 mb-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/batches/${slug}`}>
            <ArrowLeft className="size-3.5 mr-1.5" />
            Back to batch
          </Link>
        </Button>
      </div>

      {initError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {initError}
        </div>
      ) : !pending || startCheckout.isPending ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Setting up your payment…
        </div>
      ) : payment?.status === "COMPLETED" ? (
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
          <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
          <p className="mt-2 font-display text-lg font-medium">
            Payment approved — you're enrolled
          </p>
          <Button asChild className="mt-4">
            <Link href={`/batches/${slug}`}>Open batch</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <PaymentPanel
            qr={pending.qrSettings}
            amount={pending.amount}
            currency={pending.currency}
          />
          <ProofPanel
            pending={pending}
            isAlreadySubmitted={
              payment?.status === "PROOF_UPLOADED" || payment?.status === "COMPLETED"
            }
            onSubmitted={() => {
              toast.success(
                "Proof submitted — we'll enroll you once admin approves."
              );
            }}
          />
        </div>
      )}
    </PageLayout>
  );
}
