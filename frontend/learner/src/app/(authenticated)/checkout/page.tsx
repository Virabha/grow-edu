"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLayout } from "@/components/layout/page-layout";

import { useCourseById } from "@/lib/hooks/use-courses";
import {
  useCreatePayment,
  useFreeEnroll,
  useMyPayment,
  type CreateManualQRResponse,
} from "@/lib/hooks/use-payments";
import { getApiError } from "@/lib/api/errors";

import { PaymentPanel } from "@/components/checkout/payment-panel";
import { ProofPanel } from "@/components/checkout/proof-panel";
import { OrderSummary } from "@/components/checkout/order-summary";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = searchParams.get("courseId");
  const sectionId = searchParams.get("sectionId");
  const itemTypeParam = searchParams.get("itemType");
  const itemType: "COURSE" | "SECTION" =
    itemTypeParam === "SECTION" && sectionId ? "SECTION" : "COURSE";

  const { data: course, isLoading } = useCourseById(courseId);
  const createPayment = useCreatePayment();
  const freeEnroll = useFreeEnroll();

  const targetSection = useMemo(
    () => course?.sections?.find((s) => s.sectionId === sectionId),
    [course?.sections, sectionId],
  );

  const baseAmount = useMemo(() => {
    if (!course) return 0;
    if (itemType === "SECTION" && targetSection?.sectionPrice) {
      return parseFloat(String(targetSection.sectionPrice));
    }
    return parseFloat(course.price);
  }, [course, itemType, targetSection?.sectionPrice]);

  // ── Payment state ────────────────────────────────────────────────────
  const [pending, setPending] = useState<CreateManualQRResponse | null>(null);
  const [done, setDone] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const autoAttempted = useRef(false);

  const { data: paymentStatus } = useMyPayment(pending?.paymentId ?? null);

  // Reset everything when the target item changes.
  useEffect(() => {
    setPending(null);
    setPaymentError(null);
    autoAttempted.current = false;
  }, [courseId, sectionId, itemType]);

  useEffect(() => {
    if (!course || autoAttempted.current) return;
    autoAttempted.current = true;

    if (baseAmount === 0) {
      freeEnroll
        .mutateAsync({
          courseId: course.courseId,
          sectionId:
            itemType === "SECTION" ? sectionId || undefined : undefined,
          itemType,
        })
        .then(() => {
          toast.success("Enrolled successfully!");
          router.push("/my-courses");
        })
        .catch((err) => {
          toast.error(getApiError(err, "Failed to enrol.").message);
        });
      return;
    }

    createPayment
      .mutateAsync({
        itemType,
        courseId: course.courseId,
        sectionId: itemType === "SECTION" ? sectionId || undefined : undefined,
      })
      .then((res) => {
        setPending(res);
      })
      .catch((err) => {
        const msg = getApiError(err, "Couldn't start the payment.").message;
        setPaymentError(msg);
        toast.error(msg);
      });
    // freeEnroll/createPayment are mutation objects (new reference every render);
    // re-running on them would loop on failure. The ref guard makes this safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, baseAmount, itemType, sectionId, router]);

  const finalAmount = baseAmount;

  const enrolFree = async () => {
    if (!course) return;
    try {
      await freeEnroll.mutateAsync({
        courseId: course.courseId,
        sectionId: itemType === "SECTION" ? sectionId || undefined : undefined,
        itemType,
      });
      toast.success("Enrolled successfully!");
      router.push("/my-courses");
    } catch (err) {
      toast.error(getApiError(err, "Failed to enrol.").message);
    }
  };

  // ── Loading / not-found / enrolling / done states ────────────────────
  if (isLoading) {
    return (
      <PageLayout header="Checkout" description="Loading your order…">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </PageLayout>
    );
  }

  if (!course) {
    return (
      <PageLayout header="Checkout">
        <EmptyState
          title="Course not found"
          description="The course you're looking for doesn't exist."
          icon={<ShoppingCart className="h-12 w-12" />}
        />
      </PageLayout>
    );
  }

  if (baseAmount === 0 && freeEnroll.isPending) {
    return (
      <PageLayout header="Enrolling…" description="Setting up your access.">
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">One moment…</p>
        </div>
      </PageLayout>
    );
  }

  if (done) {
    return (
      <PageLayout
        header="Payment submitted"
        description="The admin is verifying your transfer."
      >
        <div className="mx-auto max-w-md py-8">
          <div className="rounded-2xl border border-border bg-card p-7 text-center">
            <CheckCircle2 className="mx-auto size-12 text-primary" />
            <h2 className="font-display mt-4 text-2xl font-medium leading-tight tracking-tight text-foreground">
              You&apos;re in the queue.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We&apos;ve received your transaction ID and proof. You&apos;ll
              get an email the moment it&apos;s verified.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/courses")}
                className="rounded-full"
              >
                Browse more
              </Button>
              <Button
                onClick={() => router.push("/my-courses")}
                className="rounded-full"
              >
                My courses
              </Button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────
  const isPaymentStarted = !!pending && finalAmount > 0;
  const isAlreadySubmitted =
    pending?.status === "PROOF_UPLOADED" ||
    paymentStatus?.status === "PROOF_UPLOADED";

  return (
    <PageLayout
      header={isPaymentStarted ? "Pay & verify" : "Checkout"}
      description={
        isPaymentStarted
          ? "Pay via QR or bank transfer, then submit your transaction ID & screenshot."
          : "Review your order — your payment details will load in a moment."
      }
    >
      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[1fr_340px] lg:gap-5">
        <div className="min-w-0 space-y-4 lg:space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              You&apos;re purchasing
            </p>
            <h2 className="font-display mt-2 break-words text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl">
              {course.title}
            </h2>
            {itemType === "SECTION" && targetSection ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Section:{" "}
                <span className="text-foreground">{targetSection.title}</span>
              </p>
            ) : (
              course.description && (
                <p className="mt-3 line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground">
                  {course.description}
                </p>
              )
            )}
          </div>

          {isPaymentStarted && pending ? (
            <>
              <PaymentPanel
                qr={pending.qrSettings}
                amount={pending.amount}
                currency={pending.currency}
              />
              <ProofPanel
                pending={pending}
                isAlreadySubmitted={!!isAlreadySubmitted}
                onSubmitted={() => setDone(true)}
              />
            </>
          ) : paymentError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-6 text-center">
              <p className="font-display text-lg font-medium text-destructive">
                Payment couldn&apos;t start.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {paymentError}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    autoAttempted.current = false;
                    setPaymentError(null);
                  }}
                >
                  Try again
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => router.push("/my-courses")}
                >
                  Go to my courses
                </Button>
              </div>
            </div>
          ) : baseAmount > 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Preparing your payment details…
            </div>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-4 lg:h-fit">
          <OrderSummary
            itemType={itemType}
            baseAmount={baseAmount}
            finalAmount={finalAmount}
            freeEnrolButton={
              finalAmount === 0 ? (
                <Button
                  className="mt-5 h-11 w-full gap-2 rounded-full bg-foreground font-medium text-background hover:bg-foreground/90"
                  onClick={enrolFree}
                  disabled={freeEnroll.isPending}
                >
                  {freeEnroll.isPending ? "Enrolling…" : "Enrol for free"}
                </Button>
              ) : undefined
            }
          />
        </aside>
      </div>
    </PageLayout>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <PageLayout header="Checkout" description="Loading…">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </PageLayout>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
