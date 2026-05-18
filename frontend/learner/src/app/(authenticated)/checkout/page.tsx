"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams, useRouter } from "next/navigation";
import { useCourseById } from "@/lib/hooks/use-courses";
import { useCreatePayment, useFreeEnroll, useUploadProof, type CreateManualQRResponse } from "@/lib/hooks/use-payments";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingCart, Loader2, Upload, QrCode, Copy, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useState, Suspense, useMemo, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useValidateCoupon, type CouponValidationResult } from "@/lib/hooks/use-coupons";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/utils";
import { uploadFile } from "@/lib/api/upload";

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
  const uploadProof = useUploadProof();
  const validateCoupon = useValidateCoupon();

  const targetSection = useMemo(
    () => course?.sections?.find((s) => s.sectionId === sectionId),
    [course?.sections, sectionId],
  );

  const baseAmount = useMemo(() => {
    const coursePrice = course ? parseFloat(course.price) : 0;
    if (itemType === "SECTION" && targetSection?.sectionPrice) {
      return parseFloat(String(targetSection.sectionPrice));
    }
    return coursePrice;
  }, [course, itemType, targetSection?.sectionPrice]);

  const [couponInput, setCouponInput] = useState("");
  const debouncedCoupon = useDebounce(couponInput.trim(), 400);
  const [couponPreview, setCouponPreview] = useState<CouponValidationResult | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);

  const [step, setStep] = useState<"review" | "pay" | "done">("review");
  const [pending, setPending] = useState<CreateManualQRResponse | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const freeAutoEnrollAttempted = useRef(false);
  const [freeAutoEnrolling, setFreeAutoEnrolling] = useState(false);

  // Auto-enroll if free
  useEffect(() => {
    if (!course || baseAmount !== 0 || freeAutoEnrollAttempted.current) return;
    freeAutoEnrollAttempted.current = true;
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
          freeAutoEnrollAttempted.current = false;
          setFreeAutoEnrolling(false);
          toast.error(getApiErrorMessage(err, "Failed to enroll"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [course, baseAmount, freeEnroll, itemType, sectionId, router]);

  useEffect(() => {
    setAppliedCoupon(null);
    setCouponPreview(null);
    setCouponInput("");
  }, [courseId, sectionId, itemType]);

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
          const msg =
            (e as any)?.response?.data?.message ||
            (e instanceof Error ? e.message : "Failed to validate coupon");
          setCouponPreview({
            valid: false,
            couponCode: debouncedCoupon.toUpperCase(),
            reason: "ERROR",
            message: msg,
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
  const finalAmount = effectiveCoupon?.valid
    ? parseFloat(String(effectiveCoupon.finalAmount))
    : baseAmount;

  const copyToClipboard = useCallback((label: string, value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  }, []);

  if (isLoading) {
    return (
      <PageLayout header="Loading...">
        <Skeleton className="h-64 w-full" />
      </PageLayout>
    );
  }

  if (!course) {
    return (
      <PageLayout header="Course Not Found">
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
      <PageLayout header="Enrolling...">
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Enrolling you for free...</p>
        </div>
      </PageLayout>
    );
  }

  const handleProceed = async () => {
    if (finalAmount === 0) {
      try {
        await freeEnroll.mutateAsync({
          courseId: course.courseId,
          sectionId: itemType === "SECTION" ? sectionId || undefined : undefined,
          itemType,
          couponCode: effectiveCoupon?.valid ? effectiveCoupon.couponCode : undefined,
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
        couponCode: effectiveCoupon?.valid ? effectiveCoupon.couponCode : undefined,
      });
      setPending(res);
      setStep("pay");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to create payment"));
    }
  };

  const handleFile = (file: File | null) => {
    setProofFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setProofPreview(url);
    } else {
      setProofPreview(null);
    }
  };

  const handleSubmitProof = async () => {
    if (!pending || !proofFile) return;
    setUploading(true);
    try {
      const url = await uploadFile(proofFile, "payment-proofs");
      await uploadProof.mutateAsync({ paymentId: pending.paymentId, proofUrl: url });
      toast.success("Proof submitted — awaiting admin review");
      setStep("done");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  // ─── Step: done ──────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <PageLayout header="Payment submitted">
        <div className="mx-auto max-w-md py-8">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <h2 className="text-xl font-semibold">Awaiting verification</h2>
              <p className="text-sm text-muted-foreground">
                Thanks! Your payment proof has been submitted. Once an admin verifies it,
                you&apos;ll get email confirmation and instant course access.
              </p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => router.push("/my-courses")}>
                  My courses
                </Button>
                <Button onClick={() => router.push("/courses")}>Browse more</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // ─── Step: pay ───────────────────────────────────────────────────────
  if (step === "pay" && pending) {
    const qr = pending.qrSettings;
    return (
      <PageLayout header="Pay & upload proof" description="Pay using the QR code or bank transfer, then upload your transaction screenshot.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="h-4 w-4" />
                Pay {pending.currency} {pending.amount.toFixed(2)}
              </CardTitle>
              <CardDescription>Scan the QR or use the bank details below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {qr.qrImageUrl ? (
                <div className="relative mx-auto h-64 w-64 overflow-hidden rounded-md border bg-white">
                  <Image
                    src={qr.qrImageUrl}
                    alt="Payment QR code"
                    fill
                    className="object-contain"
                    sizes="256px"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="mx-auto grid h-64 w-64 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
                  QR not configured
                </div>
              )}

              {qr.upiId && (
                <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">UPI ID</div>
                    <div className="font-medium">{qr.upiId}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard("UPI ID", qr.upiId!)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {(qr.bankName || qr.bankAccountNumber || qr.bankIfsc) && (
                <div className="rounded-md border p-3 text-sm space-y-1.5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">
                    Bank transfer
                  </div>
                  {qr.bankAccountHolder && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account holder</span>
                      <span>{qr.bankAccountHolder}</span>
                    </div>
                  )}
                  {qr.bankName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank</span>
                      <span>{qr.bankName}</span>
                    </div>
                  )}
                  {qr.bankAccountNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Account</span>
                      <button
                        className="font-mono hover:underline"
                        onClick={() => copyToClipboard("Account number", qr.bankAccountNumber!)}
                      >
                        {qr.bankAccountNumber}
                      </button>
                    </div>
                  )}
                  {qr.bankIfsc && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">IFSC</span>
                      <button
                        className="font-mono hover:underline"
                        onClick={() => copyToClipboard("IFSC", qr.bankIfsc!)}
                      >
                        {qr.bankIfsc}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {qr.instructions && (
                <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                  {qr.instructions}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload proof of payment</CardTitle>
              <CardDescription>
                After paying, attach a screenshot of the transaction. Admin reviews this manually.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {proofPreview ? (
                <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-md border">
                  <Image src={proofPreview} alt="Proof preview" fill className="object-contain" unoptimized />
                </div>
              ) : (
                <div className="grid aspect-[3/4] w-full max-w-xs mx-auto place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
                  No file selected
                </div>
              )}

              <div className="flex items-center justify-center gap-2">
                <Label htmlFor="proof-upload" className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm hover:bg-accent">
                    <Upload className="h-4 w-4" />
                    {proofFile ? "Change file" : "Choose screenshot"}
                  </span>
                  <input
                    id="proof-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] || null)}
                  />
                </Label>
                {proofFile && (
                  <Button variant="ghost" size="sm" onClick={() => handleFile(null)}>
                    Remove
                  </Button>
                )}
              </div>

              <Button
                className="w-full"
                disabled={!proofFile || uploading || uploadProof.isPending}
                onClick={handleSubmitProof}
              >
                {uploading || uploadProof.isPending ? "Submitting…" : "Submit for review"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // ─── Step: review ────────────────────────────────────────────────────
  return (
    <PageLayout header="Checkout" description="Review your order and proceed to payment.">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{course.title}</CardTitle>
            <CardDescription className="line-clamp-2">{course.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {itemType === "SECTION" && targetSection && (
              <p className="text-xs text-muted-foreground">
                Purchasing section: <span className="font-medium text-foreground">{targetSection.title}</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-4 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>{itemType === "SECTION" ? "Section price" : "Course price"}</span>
              <span>₹{baseAmount.toFixed(2)}</span>
            </div>
            <div>
              <Label>Coupon</Label>
              {effectiveCoupon ? (
                <div className="mt-2 flex items-center justify-between rounded-md border p-2">
                  <div className="text-sm">
                    <span className="font-medium">{effectiveCoupon.couponCode}</span>
                    <span className="text-muted-foreground"> applied</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAppliedCoupon(null);
                      toast.success("Coupon removed");
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
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
                    <div className={`text-xs ${couponPreview.valid ? "text-green-600" : "text-destructive"}`}>
                      {couponPreview.message}
                    </div>
                  )}
                </div>
              )}
            </div>
            {effectiveCoupon && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount ({effectiveCoupon.couponCode})</span>
                <span className="text-green-600 font-medium">
                  -₹{parseFloat(String(effectiveCoupon.discountAmount)).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total</span>
              <span>₹{finalAmount.toFixed(2)}</span>
            </div>
            <Button className="w-full" onClick={handleProceed} disabled={createPayment.isPending || freeEnroll.isPending}>
              {finalAmount === 0
                ? freeEnroll.isPending
                  ? "Enrolling…"
                  : "Enroll for free"
                : createPayment.isPending
                  ? "Preparing…"
                  : "Continue to payment"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <PageLayout header="Loading...">
          <Skeleton className="h-64 w-full" />
        </PageLayout>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
