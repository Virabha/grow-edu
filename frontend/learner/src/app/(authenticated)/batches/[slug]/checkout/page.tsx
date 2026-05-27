"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SecureImage } from "@/components/ui/secure-image";
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
        const msg =
          err instanceof Error ? err.message : "Failed to start checkout";
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
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  if (!batch) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-10">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-muted/30">
          <GraduationCap className="size-10 text-muted-foreground/50" />
        </div>
        <h1 className="mb-3 font-display text-2xl font-medium text-foreground sm:text-3xl">
          Batch not found
        </h1>
        <p className="mx-auto mb-6 max-w-md text-center text-sm text-muted-foreground">
          The batch you&apos;re trying to enroll in doesn&apos;t exist.
        </p>
        <Button asChild size="sm">
          <Link href="/batches">
            <ArrowLeft className="size-3.5 mr-1.5" />
            Browse all batches
          </Link>
        </Button>
      </div>
    );
  }

  const discount =
    batch.compareAtPrice && batch.compareAtPrice > batch.price
      ? Math.round(
          ((batch.compareAtPrice - batch.price) / batch.compareAtPrice) * 100,
        )
      : null;
  const submitted =
    payment?.status === "PROOF_UPLOADED" || payment?.status === "COMPLETED";
  const completed = payment?.status === "COMPLETED";

  return (
    <PageLayout
      subtitle="Checkout"
      header={completed ? "All set" : "Enroll in batch"}
      description={
        completed
          ? "Your payment has been approved."
          : "Pay via UPI or bank, then upload your proof to confirm."
      }
    >
      <div className="-mt-2 mb-3">
        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
          <Link href={`/batches/${slug}`}>
            <ArrowLeft className="size-3 mr-1" />
            Back to batch
          </Link>
        </Button>
      </div>

      {/* Order summary header */}
      <section className="mb-3 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-stretch gap-3 p-3">
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-20 sm:w-32">
            {batch.thumbnail ? (
              <SecureImage
                src={batch.thumbnail}
                alt={batch.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <GraduationCap className="size-6 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {batch.targetExam && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                {batch.targetExam}
              </p>
            )}
            <h2 className="font-display line-clamp-1 text-sm font-medium leading-tight text-foreground sm:text-base">
              {batch.title}
            </h2>
            <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <CalendarDays className="size-3 shrink-0" />
              {formatDate(batch.startDate)} – {formatDate(batch.endDate)}
            </p>
          </div>
          <div className="hidden flex-col items-end justify-center text-right sm:flex">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-lg font-semibold">
                {batch.currency} {batch.price.toFixed(0)}
              </span>
              {batch.compareAtPrice && batch.compareAtPrice > batch.price && (
                <span className="text-[11px] text-muted-foreground line-through">
                  {batch.currency} {batch.compareAtPrice.toFixed(0)}
                </span>
              )}
            </div>
            {discount && (
              <span className="mt-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                −{discount}% off
              </span>
            )}
          </div>
        </div>
      </section>

      {/* State: initialization error */}
      {initError ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="size-5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-medium text-destructive">
              Can&apos;t start checkout
            </p>
            <p className="mt-1 text-xs text-destructive/85">{initError}</p>
            <div className="mt-3 flex gap-2">
              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link href={`/batches/${slug}`}>Back to batch</Link>
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setInitError(null);
                  startCheckout
                    .mutateAsync({ batchId: batch.batchId })
                    .then((res) => {
                      if (res.enrolled) {
                        toast.success("Enrolled");
                        router.replace(`/batches/${slug}`);
                      } else if (res.paymentId) {
                        setPaymentId(res.paymentId);
                      }
                    })
                    .catch((err) => {
                      setInitError(
                        err instanceof Error
                          ? err.message
                          : "Failed to start checkout",
                      );
                    });
                }}
              >
                Try again
              </Button>
            </div>
          </div>
        </div>
      ) : !pending || startCheckout.isPending ? (
        /* State: preparing */
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Setting up your payment…
        </div>
      ) : completed ? (
        /* State: completed */
        <section className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
          <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
          <h2 className="mt-3 font-display text-lg font-medium text-foreground">
            Payment approved — you&apos;re enrolled
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Jump in and start with today&apos;s schedule.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/my-batches">My batches</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/batches/${slug}`}>Open batch</Link>
            </Button>
          </div>
        </section>
      ) : (
        /* State: payment + proof */
        <div className="space-y-3">
          {submitted && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              <Loader2 className="size-3.5 animate-spin" />
              <span>
                Proof submitted — we&apos;ll enroll you once an admin reviews
                it.
              </span>
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
            <PaymentPanel
              qr={pending.qrSettings}
              amount={pending.amount}
              currency={pending.currency}
            />
            <ProofPanel
              pending={pending}
              isAlreadySubmitted={submitted}
              onSubmitted={() => {
                toast.success(
                  "Proof submitted — we'll enroll you once admin approves.",
                );
              }}
            />
          </div>
        </div>
      )}
    </PageLayout>
  );
}
