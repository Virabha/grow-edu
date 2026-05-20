"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Loader2, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLayout } from "@/components/layout/page-layout";

import { useCourseById } from "@/lib/hooks/use-courses";
import {
  useFreeEnroll,
  useInitiatePhonePe,
} from "@/lib/hooks/use-payments";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useValidateCoupon,
  type CouponValidationResult,
} from "@/lib/hooks/use-coupons";
import { getApiErrorMessage } from "@/lib/utils";

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
  const initiate = useInitiatePhonePe();
  const freeEnroll = useFreeEnroll();
  const validateCoupon = useValidateCoupon();

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

  const [couponInput, setCouponInput] = useState("");
  const debouncedCoupon = useDebounce(couponInput.trim(), 400);
  const [couponPreview, setCouponPreview] =
    useState<CouponValidationResult | null>(null);
  const [appliedCoupon, setAppliedCoupon] =
    useState<CouponValidationResult | null>(null);

  useEffect(() => {
    setAppliedCoupon(null);
    setCouponPreview(null);
    setCouponInput("");
  }, [courseId, sectionId, itemType]);

  useEffect(() => {
    if (!course || !debouncedCoupon) {
      setCouponPreview(null);
      return;
    }
    let cancelled = false;
    validateCoupon
      .mutateAsync({
        couponCode: debouncedCoupon,
        courseId: course.courseId,
        sectionId: itemType === "SECTION" ? sectionId || undefined : undefined,
        itemType,
      })
      .then((res) => {
        if (!cancelled) setCouponPreview(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setCouponPreview({
            valid: false,
            couponCode: debouncedCoupon.toUpperCase(),
            reason: "ERROR",
            message: getApiErrorMessage(e, "Couldn't validate coupon."),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [course, debouncedCoupon, itemType, sectionId, validateCoupon]);

  const effectiveCoupon = appliedCoupon?.valid ? appliedCoupon : null;
  const finalAmount = effectiveCoupon
    ? parseFloat(String(effectiveCoupon.finalAmount))
    : baseAmount;

  const enrolFree = async () => {
    if (!course) return;
    try {
      await freeEnroll.mutateAsync({
        courseId: course.courseId,
        sectionId: itemType === "SECTION" ? sectionId || undefined : undefined,
        itemType,
        couponCode: effectiveCoupon?.couponCode,
      });
      toast.success("Enrolled successfully!");
      router.push("/my-courses");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to enrol."));
    }
  };

  const payNow = async () => {
    if (!course) return;
    try {
      const { paymentUrl } = await initiate.mutateAsync({
        itemType,
        courseId: course.courseId,
        sectionId: itemType === "SECTION" ? sectionId || undefined : undefined,
        couponCode: effectiveCoupon?.couponCode,
      });
      window.location.href = paymentUrl;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't start the payment."));
    }
  };

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

  return (
    <PageLayout
      header="Checkout"
      description="Review your order and continue to payment."
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

          {finalAmount > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ArrowRight className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Secure payment
                  </p>
                  <h3 className="font-display mt-1 text-lg font-medium leading-snug text-foreground sm:text-xl">
                    Pay with PhonePe.
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    You&apos;ll be redirected to PhonePe to complete the
                    payment. UPI, cards, and net banking are all supported.
                    Once payment is confirmed you&apos;re enrolled instantly.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                size="lg"
                disabled={initiate.isPending}
                onClick={payNow}
                className="mt-5 h-11 w-full gap-2 rounded-full bg-foreground font-medium text-background hover:bg-foreground/90"
              >
                {initiate.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Redirecting to PhonePe…
                  </>
                ) : (
                  <>
                    Continue to PhonePe
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-4 lg:h-fit">
          <OrderSummary
            itemType={itemType}
            baseAmount={baseAmount}
            finalAmount={finalAmount}
            effectiveCoupon={effectiveCoupon}
            couponInput={couponInput}
            couponPreview={couponPreview}
            isValidating={validateCoupon.isPending}
            onCouponInputChange={setCouponInput}
            onApplyCoupon={() => {
              if (couponPreview?.valid) {
                setAppliedCoupon(couponPreview);
                toast.success("Coupon applied");
              }
            }}
            onRemoveCoupon={() => {
              setAppliedCoupon(null);
              toast.success("Coupon removed");
            }}
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
