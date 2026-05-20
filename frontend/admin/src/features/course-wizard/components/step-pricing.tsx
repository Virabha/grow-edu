"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useCourseWizard } from "../store";
import { useUpdateCourse, useCourse } from "@/features/courses/hooks/use-courses";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WizardShell } from "./wizard-shell";

type PriceType = "FREE" | "PAID";

export function StepPricing() {
  const { nextStep, prevStep, courseId } = useCourseWizard();
  const updateCourse = useUpdateCourse();
  const { data: course, isLoading } = useCourse({
    enabled: true,
    courseId: courseId ?? undefined,
  });

  const [priceType, setPriceType] = useState<PriceType>("FREE");
  const [price, setPrice] = useState("0");
  const [compareAtPrice, setCompareAtPrice] = useState("");

  useEffect(() => {
    if (!course) return;
    const p = Number(course.price ?? 0);
    if (p > 0) {
      setPriceType("PAID");
      setPrice(String(p));
      setCompareAtPrice(course.compareAtPrice ? String(course.compareAtPrice) : "");
    } else {
      setPriceType("FREE");
      setPrice("0");
      setCompareAtPrice("");
    }
  }, [course]);

  const onContinue = async () => {
    if (!courseId) return;
    try {
      const finalPrice = priceType === "FREE" ? 0 : parseFloat(price);
      const parsedCompareAt = compareAtPrice.trim()
        ? parseFloat(compareAtPrice)
        : undefined;
      const finalCompareAt =
        parsedCompareAt !== undefined && !Number.isNaN(parsedCompareAt)
          ? parsedCompareAt
          : undefined;

      if (priceType === "PAID" && (isNaN(finalPrice) || finalPrice < 1)) {
        toast.error("Enter a valid price (minimum ₹1).");
        return;
      }
      if (
        priceType === "PAID" &&
        finalCompareAt !== undefined &&
        finalCompareAt < finalPrice
      ) {
        toast.error("Original price must be greater than or equal to the final price.");
        return;
      }

      await updateCourse.mutateAsync({
        id: courseId,
        dto: {
          price: finalPrice,
          compareAtPrice: priceType === "PAID" ? finalCompareAt : undefined,
          currency: "INR",
        },
      });
      toast.success("Pricing saved.");
      nextStep();
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(err?.response?.data?.message || err?.message || "Couldn't save pricing.");
    }
  };

  if (isLoading) {
    return (
      <WizardShell
        step={5}
        eyebrow="Pricing"
        title={<>Set the <em className="text-primary">price.</em></>}
        hideBack
      >
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </WizardShell>
    );
  }

  return (
    <WizardShell
      step={5}
      eyebrow="Pricing"
      title={<>Set the <em className="text-primary">price.</em></>}
      description="Free reaches more learners. Paid signals quality. You can change this later."
      onBack={prevStep}
      onContinue={onContinue}
      loading={updateCourse.isPending}
    >
      <div className="space-y-4">
        <RadioGroup
          value={priceType}
          onValueChange={(v: PriceType) => {
            setPriceType(v);
            if (v === "FREE") setPrice("0");
          }}
          className="grid gap-2 sm:grid-cols-2"
        >
          <label
            htmlFor="price-free"
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <RadioGroupItem id="price-free" value="FREE" className="mt-0.5" />
            <div>
              <p className="font-display text-base font-medium text-foreground">
                Free
              </p>
              <p className="text-sm text-muted-foreground">
                Open to all learners.
              </p>
            </div>
          </label>
          <label
            htmlFor="price-paid"
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <RadioGroupItem id="price-paid" value="PAID" className="mt-0.5" />
            <div>
              <p className="font-display text-base font-medium text-foreground">
                Paid
              </p>
              <p className="text-sm text-muted-foreground">
                One-time price for full access.
              </p>
            </div>
          </label>
        </RadioGroup>

        {priceType === "PAID" && (
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="final-price"
                  className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Final price (INR)
                </Label>
                <Input
                  id="final-price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="1"
                  step="0.01"
                  placeholder="199"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="strike-price"
                  className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Strike-through price (optional)
                </Label>
                <Input
                  id="strike-price"
                  type="number"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="249"
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Instructor revenue share: <span className="font-medium text-foreground">80%</span>.
            </p>
          </div>
        )}
      </div>
    </WizardShell>
  );
}
