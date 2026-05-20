"use client";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  QrCode,
  ShoppingCart,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLayout } from "@/components/layout/page-layout";
import { useCourseById } from "@/lib/hooks/use-courses";
import {
  useCreatePayment,
  useFreeEnroll,
  useMyPayment,
  useUploadProof,
  type CreateManualQRResponse,
  type QRPaymentSettings,
} from "@/lib/hooks/use-payments";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useValidateCoupon,
  type CouponValidationResult,
} from "@/lib/hooks/use-coupons";
import { getApiErrorMessage } from "@/lib/utils";
import { uploadFile } from "@/lib/api/upload";

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        toast.success(`${label} copied`);
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      aria-label={`Copy ${label}`}
    >
      <Copy className="size-3" /> Copy
    </button>
  );
}

function DetailRow({
  label,
  value,
  copyable,
  mono,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center gap-2 text-right">
        <span
          className={mono ? "font-mono text-foreground" : "text-foreground"}
        >
          {value}
        </span>
        {copyable && <CopyButton value={value} label={label} />}
      </span>
    </div>
  );
}

function PaymentPanel({
  qr,
  amount,
  currency,
}: {
  qr: QRPaymentSettings;
  amount: number;
  currency: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <QrCode className="size-5" />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Step 01 · Pay
          </p>
          <p className="font-display text-2xl font-medium leading-tight text-foreground">
            {currency} {amount.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-[auto_1fr]">
        {qr.qrImageUrl ? (
          <div className="relative size-56 shrink-0 overflow-hidden rounded-xl border border-border bg-white">
            <Image
              src={qr.qrImageUrl}
              alt="Payment QR code"
              fill
              className="object-contain p-2"
              sizes="224px"
              unoptimized
            />
          </div>
        ) : (
          <div className="grid size-56 shrink-0 place-items-center rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
            QR not configured
          </div>
        )}

        <div className="space-y-1.5">
          {qr.upiId && (
            <DetailRow label="UPI ID" value={qr.upiId} mono copyable />
          )}
          {qr.bankAccountHolder && (
            <DetailRow label="Account holder" value={qr.bankAccountHolder} />
          )}
          {qr.bankName && <DetailRow label="Bank" value={qr.bankName} />}
          {qr.bankAccountNumber && (
            <DetailRow
              label="Account no."
              value={qr.bankAccountNumber}
              mono
              copyable
            />
          )}
          {qr.bankIfsc && (
            <DetailRow label="IFSC" value={qr.bankIfsc} mono copyable />
          )}
        </div>
      </div>

      {qr.instructions && (
        <div className="mt-5 rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          {qr.instructions}
        </div>
      )}
    </div>
  );
}

function ProofPanel({
  pending,
  isAlreadySubmitted,
  onSubmitted,
}: {
  pending: CreateManualQRResponse;
  isAlreadySubmitted: boolean;
  onSubmitted: () => void;
}) {
  const uploadProof = useUploadProof();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
    };
  }, [proofPreview]);

  const handleFile = (file: File | null) => {
    setProofFile(file);
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofPreview(file ? URL.createObjectURL(file) : null);
  };

  const canSubmit =
    !!proofFile && transactionId.trim().length >= 4 && !uploading;

  const handleSubmit = async () => {
    if (!proofFile) {
      toast.error("Attach your transaction screenshot first.");
      return;
    }
    if (transactionId.trim().length < 4) {
      toast.error("Enter your transaction ID (min. 4 characters).");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(proofFile, "payment-proofs");
      await uploadProof.mutateAsync({
        paymentId: pending.paymentId,
        proofUrl: url,
        transactionId: transactionId.trim(),
        payerName: payerName.trim() || undefined,
      });
      toast.success("Proof submitted — awaiting admin review.");
      onSubmitted();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Upload failed."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Upload className="size-5" />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Step 02 · Verify
          </p>
          <p className="font-display text-2xl font-medium leading-tight text-foreground">
            Submit your proof.
          </p>
        </div>
      </div>

      {isAlreadySubmitted ? (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <Clock className="size-4 shrink-0" />
          We already received your proof. The admin is reviewing — we&apos;ll
          email you when it&apos;s confirmed.
        </div>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_240px]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="txn-id"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
              >
                Transaction ID / UTR{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="txn-id"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. 458912703456"
                autoComplete="off"
                inputMode="text"
                spellCheck={false}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Find this on your bank/UPI app after a successful payment. We
                use it to match your transfer.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="payer-name"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
              >
                Payer name (optional)
              </Label>
              <Input
                id="payer-name"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="Name shown on the receipt"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label
                htmlFor="proof-upload"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Upload className="size-4" />
                {proofFile ? "Change screenshot" : "Attach screenshot"}
                <input
                  id="proof-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />
              </Label>
              {proofFile && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleFile(null)}
                  className="gap-1"
                >
                  <X className="size-3.5" />
                  Remove
                </Button>
              )}
            </div>

            <Button
              type="button"
              className="h-11 w-full gap-2 rounded-full bg-foreground font-medium text-background hover:bg-foreground/90"
              disabled={!canSubmit || uploadProof.isPending}
              onClick={handleSubmit}
            >
              {uploading || uploadProof.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Submitting…
                </>
              ) : (
                "Submit for review"
              )}
            </Button>
          </div>

          <div>
            {proofPreview ? (
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-background">
                <Image
                  src={proofPreview}
                  alt="Payment proof preview"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="grid aspect-[3/4] w-full place-items-center rounded-xl border border-dashed border-border bg-muted/30 text-center text-xs text-muted-foreground">
                Screenshot preview
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

  const [pending, setPending] = useState<CreateManualQRResponse | null>(null);
  const [done, setDone] = useState(false);
  const freeAutoAttempted = useRef(false);
  const [freeAutoEnrolling, setFreeAutoEnrolling] = useState(false);

  // Poll the payment when in pending state to detect status changes (e.g. admin approval).
  const { data: paymentStatus } = useMyPayment(pending?.paymentId ?? null);

  useEffect(() => {
    if (pending?.status === "PROOF_UPLOADED") {
      setDone(false); // we'll just display "already submitted" inline
    }
  }, [pending?.status]);

  // Auto-enroll if free.
  useEffect(() => {
    if (!course || baseAmount !== 0 || freeAutoAttempted.current) return;
    freeAutoAttempted.current = true;
    let cancelled = false;
    setFreeAutoEnrolling(true);
    freeEnroll
      .mutateAsync({
        courseId: course.courseId,
        sectionId: itemType === "SECTION" ? sectionId || undefined : undefined,
        itemType,
      })
      .then(() => {
        if (!cancelled) {
          toast.success("Enrolled successfully!");
          router.push("/my-courses");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          freeAutoAttempted.current = false;
          setFreeAutoEnrolling(false);
          toast.error(getApiErrorMessage(err, "Failed to enroll"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [course, baseAmount, freeEnroll, itemType, sectionId, router]);

  // Reset coupon state when target changes.
  useEffect(() => {
    setAppliedCoupon(null);
    setCouponPreview(null);
    setCouponInput("");
  }, [courseId, sectionId, itemType]);

  // Live-validate coupon as user types.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!course || !debouncedCoupon) {
        setCouponPreview(null);
        return;
      }
      try {
        const res = await validateCoupon.mutateAsync({
          couponCode: debouncedCoupon,
          courseId: course.courseId,
          sectionId: itemType === "SECTION" ? sectionId || undefined : undefined,
          itemType,
        });
        if (!cancelled) setCouponPreview(res);
      } catch (e) {
        if (!cancelled) {
          setCouponPreview({
            valid: false,
            couponCode: debouncedCoupon.toUpperCase(),
            reason: "ERROR",
            message: getApiErrorMessage(e, "Failed to validate coupon"),
          });
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [course, debouncedCoupon, itemType, sectionId, validateCoupon]);

  const effectiveCoupon = appliedCoupon?.valid ? appliedCoupon : null;
  const finalAmount = effectiveCoupon
    ? parseFloat(String(effectiveCoupon.finalAmount))
    : baseAmount;

  const startPayment = useCallback(async () => {
    if (!course) return;
    if (finalAmount === 0) {
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
        toast.error(getApiErrorMessage(err, "Failed to enroll"));
      }
      return;
    }
    try {
      const res = await createPayment.mutateAsync({
        itemType,
        courseId: course.courseId,
        sectionId: itemType === "SECTION" ? sectionId || undefined : undefined,
        couponCode: effectiveCoupon?.couponCode,
      });
      setPending(res);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to start payment"));
    }
  }, [
    course,
    finalAmount,
    itemType,
    sectionId,
    effectiveCoupon,
    freeEnroll,
    createPayment,
    router,
  ]);

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

  if (freeAutoEnrolling) {
    return (
      <PageLayout header="Enrolling…" description="Setting up your access.">
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">One moment…</p>
        </div>
      </PageLayout>
    );
  }

  // ── Done state ─────────────────────────────────────────────────────────
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
              get an email the moment it&apos;s verified — usually within a few
              hours.
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

  // ── Order summary card ────────────────────────────────────────────────
  const isPaymentStarted = !!pending && finalAmount > 0;
  const isAlreadySubmitted =
    (pending?.status === "PROOF_UPLOADED") ||
    paymentStatus?.status === "PROOF_UPLOADED";

  return (
    <PageLayout
      header={isPaymentStarted ? "Pay & verify" : "Checkout"}
      description={
        isPaymentStarted
          ? "Pay via QR or bank transfer, then submit your transaction ID + screenshot."
          : "Review your order and continue to payment."
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* ── Left: order + (when started) payment+proof ─────────────── */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              You&apos;re purchasing
            </p>
            <h2 className="font-display mt-2 text-2xl font-medium leading-tight tracking-tight text-foreground sm:text-3xl">
              {course.title}
            </h2>
            {itemType === "SECTION" && targetSection ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Section: <span className="text-foreground">{targetSection.title}</span>
              </p>
            ) : (
              course.description && (
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {course.description}
                </p>
              )
            )}
          </div>

          {isPaymentStarted && pending && (
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
          )}
        </div>

        {/* ── Right: sticky summary ────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-4 lg:h-fit">
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
                    {parseFloat(String(effectiveCoupon.discountAmount)).toFixed(
                      2,
                    )}
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
                  <span className="font-medium text-primary">
                    {effectiveCoupon.couponCode} applied
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      toast.success("Coupon removed");
                    }}
                    className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
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
                      onChange={(e) => setCouponInput(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!couponPreview) {
                          toast.error("Enter a coupon code");
                          return;
                        }
                        if (!couponPreview.valid) {
                          toast.error(couponPreview.message);
                          return;
                        }
                        setAppliedCoupon(couponPreview);
                        toast.success("Coupon applied");
                      }}
                      disabled={validateCoupon.isPending || !couponInput.trim()}
                    >
                      Apply
                    </Button>
                  </div>
                  {couponPreview && (
                    <p
                      className={`text-[11px] ${
                        couponPreview.valid
                          ? "text-primary"
                          : "text-destructive"
                      }`}
                    >
                      {couponPreview.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {!isPaymentStarted && (
              <Button
                className="mt-5 h-11 w-full gap-2 rounded-full bg-foreground font-medium text-background hover:bg-foreground/90"
                onClick={startPayment}
                disabled={createPayment.isPending || freeEnroll.isPending}
              >
                {finalAmount === 0
                  ? freeEnroll.isPending
                    ? "Enrolling…"
                    : "Enrol for free"
                  : createPayment.isPending
                    ? "Preparing…"
                    : "Continue to payment"}
              </Button>
            )}
          </div>
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
