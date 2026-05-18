"use client";
import { useCourseWizard } from "../store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useUpdateCourse, useCourse } from "@/features/courses/hooks/use-courses";
import { Loader2 } from "lucide-react";
export function StepPricing() {
    const { nextStep, prevStep, courseId } = useCourseWizard();
    const updateCourse = useUpdateCourse();
    const { data: course, isLoading } = useCourse({ enabled: true, courseId: courseId! });
    const [priceType, setPriceType] = useState<"FREE" | "PAID">("FREE");
    const [price, setPrice] = useState("0");
    const [compareAtPrice, setCompareAtPrice] = useState<string>("");
    useEffect(() => {
        if (course) {
            if (course.price && parseFloat(course.price.toString()) > 0) {
                setPriceType("PAID");
                setPrice(course.price.toString());
                setCompareAtPrice(course.compareAtPrice ? String(course.compareAtPrice) : "");
            }
            else {
                setPriceType("FREE");
                setPrice("0");
                setCompareAtPrice("");
            }
        }
    }, [course]);
    const onNext = async () => {
        try {
            const finalPrice = priceType === "FREE" ? 0 : parseFloat(price);
            const parsedCompareAt = compareAtPrice.trim() ? parseFloat(compareAtPrice) : undefined;
            const finalCompareAt =
              parsedCompareAt !== undefined && !Number.isNaN(parsedCompareAt)
                ? parsedCompareAt
                : undefined;
            if (priceType === "PAID" && (isNaN(finalPrice) || finalPrice < 1)) {
                toast.error("Please enter a valid price (minimum 1 INR)");
                return;
            }
            if (priceType === "PAID" && finalCompareAt !== undefined && !isNaN(finalCompareAt) && finalCompareAt < finalPrice) {
                toast.error("Original (strike) price must be greater than or equal to the final price");
                return;
            }
            await updateCourse.mutateAsync({
                id: courseId!,
                dto: {
                    price: finalPrice,
                    compareAtPrice: priceType === "PAID" ? finalCompareAt : undefined,
                    currency: "INR",
                },
            });
            toast.success("Pricing saved successfully!");
            nextStep();
        }
        catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            const errorMessage = err?.response?.data?.message || err?.message || "Failed to save pricing";
            toast.error(errorMessage);
        }
    };
    if (isLoading) {
        return (<Card>
        <CardContent className="py-10 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin"/>
        </CardContent>
      </Card>);
    }
    return (<Card>
      <CardHeader>
        <CardTitle>Course Pricing</CardTitle>
        <CardDescription>
          Set the price for your course. You can also price individual sections in the Curriculum step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="space-y-2.5">
            <RadioGroup value={priceType} onValueChange={(val: "FREE" | "PAID") => {
            setPriceType(val);
            if (val === "FREE")
                setPrice("0");
        }}>
                <div className="flex items-center space-x-2 border p-4 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="FREE" id="free"/>
                    <Label htmlFor="free" className="flex-1 cursor-pointer">
                        <span className="font-semibold block">Free</span>
                        <span className="text-sm text-muted-foreground">Students can enroll in this course for free.</span>
                    </Label>
                </div>
                <div className="flex items-center space-x-2 border p-4 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="PAID" id="paid"/>
                    <Label htmlFor="paid" className="flex-1 cursor-pointer">
                        <span className="font-semibold block">Paid</span>
                        <span className="text-sm text-muted-foreground">Set a one-time price for the full course.</span>
                    </Label>
                </div>
            </RadioGroup>
        </div>

        {priceType === "PAID" && (<div className="space-y-1.5 pl-2 border-l-2 border-primary ml-4">
                <Label>Final Price (INR)</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="1" step="0.01" placeholder="e.g. 199.99" className="max-w-[240px]"/>
                <div className="pt-2 space-y-1.5">
                  <Label>Original Price (INR) (optional)</Label>
                  <Input type="number" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} min="0" step="0.01" placeholder="e.g. 249.99" className="max-w-[240px]"/>
                  <p className="text-xs text-muted-foreground">
                    If set, this will be shown as a strike-through price on the course page.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                    Instructor receives 80% of revenue.
                </p>
            </div>)}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={prevStep} disabled={updateCourse.isPending}>
            Back
          </Button>
          <Button onClick={onNext} disabled={updateCourse.isPending}>
            {updateCourse.isPending ? (<>
                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                Saving...
              </>) : ("Continue")}
          </Button>
        </div>
      </CardContent>
    </Card>);
}
