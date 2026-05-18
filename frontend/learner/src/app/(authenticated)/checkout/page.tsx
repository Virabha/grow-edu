"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams, useRouter } from "next/navigation";
import { useCourseById } from "@/lib/hooks/use-courses";
import { useCreatePayment, useFreeEnroll } from "@/lib/hooks/use-payments";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingCart, CreditCard, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { useState, Suspense, useMemo, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useDebounce } from "@/hooks/use-debounce";
import { useValidateCoupon, type CouponValidationResult } from "@/lib/hooks/use-coupons";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/utils";

function validateBilling(info: { name: string; email: string; address: string; city: string; country: string }) {
    const errors: Record<string, string> = {};
    if (!info.name.trim()) errors.name = "Full name is required";
    if (!info.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) errors.email = "Invalid email address";
    if (!info.address.trim()) errors.address = "Address is required";
    if (!info.city.trim()) errors.city = "City is required";
    if (!info.country.trim()) errors.country = "Country is required";
    return errors;
}
function CheckoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const courseId = searchParams.get("courseId");
    const sectionId = searchParams.get("sectionId");
    const itemTypeParam = searchParams.get("itemType");
    const itemType: "COURSE" | "SECTION" = itemTypeParam === "SECTION" && sectionId ? "SECTION" : "COURSE";
    const { data: course, isLoading } = useCourseById(courseId);
    const createPayment = useCreatePayment();
    const freeEnroll = useFreeEnroll();
    const validateCoupon = useValidateCoupon();
    const { user } = useAuthStore();
    const [gateway, setGateway] = useState<"RAZORPAY" | "STRIPE_US" | "STRIPE_UAE">("STRIPE_UAE");
    const [billingInfo, setBillingInfo] = useState({
        name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
        email: user?.email || "",
        address: "",
        city: "",
        country: "",
    });
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    const targetSection = useMemo(() => course?.sections?.find((s) => s.sectionId === sectionId), [course?.sections, sectionId]);
    const [billingErrors, setBillingErrors] = useState<Record<string, string>>({});
    const [couponInput, setCouponInput] = useState("");
    const debouncedCoupon = useDebounce(couponInput.trim(), 400);
    const [couponPreview, setCouponPreview] = useState<CouponValidationResult | null>(null);
    const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
    const baseAmount = useMemo(() => {
        const coursePrice = course ? parseFloat(course.price) : 0;
        if (itemType === "SECTION" && targetSection?.sectionPrice) {
            return parseFloat(String(targetSection.sectionPrice));
        }
        return coursePrice;
    }, [course, itemType, targetSection?.sectionPrice]);
    const currency = course?.currency || "INR";
    const freeAutoEnrollAttempted = useRef(false);
    const [freeAutoEnrolling, setFreeAutoEnrolling] = useState(false);
    // Auto-enroll if course is inherently free (price=0)
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
            .catch((err: unknown) => {
                if (!cancelled) {
                    freeAutoEnrollAttempted.current = false;
                    setFreeAutoEnrolling(false);
                    toast.error(getApiErrorMessage(err, "Failed to enroll"));
                }
            });
        return () => { cancelled = true; };
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
                if (!cancelled)
                    setCouponPreview(res);
            }
            catch (e: unknown) {
                if (!cancelled) {
                    const errorMessage =
                        e instanceof Error ? e.message : "Failed to validate coupon";
                    const axiosMsg =
                        typeof e === "object" && e !== null && "response" in e
                            ? ((e as { response?: { data?: { message?: string } } }).response?.data?.message)
                            : undefined;
                    setCouponPreview({
                        valid: false,
                        couponCode: debouncedCoupon.toUpperCase(),
                        reason: "ERROR",
                        message: axiosMsg || errorMessage,
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
    if (isLoading) {
        return (<PageLayout header="Loading...">
        <Skeleton className="h-64 w-full"/>
      </PageLayout>);
    }
    if (!course) {
        return (<PageLayout header="Course Not Found">
        <EmptyState title="Course not found" description="The course you're looking for doesn't exist." icon={<ShoppingCart className="h-12 w-12"/>}/>
      </PageLayout>);
    }
    if (freeAutoEnrolling) {
        return (<PageLayout header="Enrolling...">
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Enrolling you for free...</p>
        </div>
      </PageLayout>);
    }
    const handleFreeEnrollWithCoupon = async () => {
        try {
            await freeEnroll.mutateAsync({
                courseId: course.courseId,
                sectionId: itemType === "SECTION" ? sectionId || undefined : undefined,
                itemType,
                couponCode: effectiveCoupon?.valid ? effectiveCoupon.couponCode : undefined,
            });
            toast.success("Enrolled successfully!");
            router.push("/my-courses");
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, "Failed to enroll"));
        }
    };
    const handlePayment = async () => {
        const errors = validateBilling(billingInfo);
        setBillingErrors(errors);
        if (Object.keys(errors).length > 0) {
            toast.error("Please fill in all required billing fields");
            return;
        }
        try {
            const payment = await createPayment.mutateAsync({
                gateway,
                itemType,
                courseId: course.courseId,
                sectionId: itemType === "SECTION" ? sectionId || undefined : undefined,
                couponCode: effectiveCoupon?.valid ? effectiveCoupon.couponCode : undefined,
                successUrl: `${window.location.origin}/payment/success`,
                cancelUrl: `${window.location.origin}/payment/failure`,
            });
            if (payment && "checkoutUrl" in payment && payment.checkoutUrl) {
                window.location.href = payment.checkoutUrl;
            }
            else {
                router.push(`/payment/success?paymentId=${payment.paymentId}`);
            }
        }
        catch (error: unknown) {
            void error;
        }
    };
    return (<PageLayout header="Checkout" subtitle="Complete Your Purchase" description="Review your order and complete payment">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                  <Input id="name" value={billingInfo.name} onChange={(e) => { setBillingInfo({ ...billingInfo, name: e.target.value }); setBillingErrors((prev) => { const { name, ...rest } = prev; return rest; }); }}/>
                  {billingErrors.name && <p className="text-xs text-destructive">{billingErrors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                  <Input id="email" type="email" value={billingInfo.email} onChange={(e) => { setBillingInfo({ ...billingInfo, email: e.target.value }); setBillingErrors((prev) => { const { email, ...rest } = prev; return rest; }); }}/>
                  {billingErrors.email && <p className="text-xs text-destructive">{billingErrors.email}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
                <Input id="address" value={billingInfo.address} onChange={(e) => { setBillingInfo({ ...billingInfo, address: e.target.value }); setBillingErrors((prev) => { const { address, ...rest } = prev; return rest; }); }}/>
                {billingErrors.address && <p className="text-xs text-destructive">{billingErrors.address}</p>}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                  <Input id="city" value={billingInfo.city} onChange={(e) => { setBillingInfo({ ...billingInfo, city: e.target.value }); setBillingErrors((prev) => { const { city, ...rest } = prev; return rest; }); }}/>
                  {billingErrors.city && <p className="text-xs text-destructive">{billingErrors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
                  <Input id="country" value={billingInfo.country} onChange={(e) => { setBillingInfo({ ...billingInfo, country: e.target.value }); setBillingErrors((prev) => { const { country, ...rest } = prev; return rest; }); }}/>
                  {billingErrors.country && <p className="text-xs text-destructive">{billingErrors.country}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Payment Gateway</Label>
                  {mounted ? (<Select value={gateway} onValueChange={(value) => setGateway(value as "RAZORPAY" | "STRIPE_US" | "STRIPE_UAE")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RAZORPAY">Razorpay (India)</SelectItem>
                        <SelectItem value="STRIPE_US">Stripe (USA)</SelectItem>
                        <SelectItem value="STRIPE_UAE">Stripe (UAE)</SelectItem>
                      </SelectContent>
                    </Select>) : (<div className="h-10 w-full bg-muted animate-pulse rounded-md"/>)}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4"/>
                  <span>Secure payment processing</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{course.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {course.description}
                </p>
                {itemType === "SECTION" && targetSection && (<p className="text-xs text-muted-foreground mt-2">
                    Purchasing section: {targetSection.title}
                  </p>)}
              </div>
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>
                    {itemType === "SECTION" ? "Section Price" : "Course Price"}
                  </span>
                  <span>
                    ₹{baseAmount.toFixed(2)}
                  </span>
                </div>

                
                <div className="pt-3">
                  <Label>Coupon</Label>
                  {effectiveCoupon ? (<div className="mt-2 flex items-center justify-between rounded-md border p-2">
                      <div className="text-sm">
                        <span className="font-medium">{effectiveCoupon.couponCode}</span>
                        <span className="text-muted-foreground"> applied</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => {
                setAppliedCoupon(null);
                toast.success("Coupon removed");
            }}>
                        Remove
                      </Button>
                    </div>) : (<div className="mt-2 space-y-2">
                      <div className="flex gap-2">
                        <Input placeholder="Enter coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)}/>
                        <Button variant="outline" onClick={() => {
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
            }} disabled={validateCoupon.isPending || !couponInput.trim()}>
                          Apply
                        </Button>
                      </div>
                      {couponPreview && (<div className={`text-xs ${couponPreview.valid ? "text-green-600" : "text-destructive"}`}>
                          {couponPreview.message}
                        </div>)}
                    </div>)}
                </div>

                {effectiveCoupon && (<div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Discount ({effectiveCoupon.couponCode})
                    </span>
                    <span className="text-green-600 font-medium">
                      -₹{parseFloat(String(effectiveCoupon.discountAmount)).toFixed(2)}
                    </span>
                  </div>)}

                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>
                    ₹{finalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
              {finalAmount === 0 ? (
                <Button className="w-full" onClick={handleFreeEnrollWithCoupon} disabled={freeEnroll.isPending}>
                  {freeEnroll.isPending ? "Enrolling..." : "Enroll for Free"}
                </Button>
              ) : (
                <Button className="w-full" onClick={handlePayment} disabled={createPayment.isPending}>
                  {createPayment.isPending ? "Processing..." : "Complete Payment"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>);
}
export default function CheckoutPage() {
    return (<Suspense fallback={<PageLayout header="Loading...">
          <Skeleton className="h-64 w-full"/>
        </PageLayout>}>
      <CheckoutContent />
    </Suspense>);
}
