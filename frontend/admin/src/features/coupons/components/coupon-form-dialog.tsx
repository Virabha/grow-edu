"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateCoupon, useUpdateCoupon } from "../hooks";
import type { Coupon, DiscountType } from "../types";
import { useCategories } from "@/features/categories/hooks/use-categories";
const couponFormSchema = z.object({
    couponCode: z
        .string()
        .min(3, "Coupon code must be at least 3 characters")
        .max(50)
        .transform((v) => v.toUpperCase()),
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    discountValue: z.coerce.number().min(0.01, "Discount value must be greater than 0"),
    maxDiscountAmount: z.coerce.number().min(0).optional().nullable(),
    minPurchaseAmount: z.coerce.number().min(0).optional().nullable(),
    validFrom: z.string().min(1, "Valid from date is required"),
    validTill: z.string().min(1, "Valid till date is required"),
    usageLimit: z.coerce.number().min(1).optional().nullable(),
    usageLimitPerUser: z.coerce.number().min(1).default(1),
    categoryIds: z.array(z.string()).optional(),
    isActive: z.boolean().default(true),
});
type CouponFormValues = z.infer<typeof couponFormSchema>;
interface CouponFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    coupon?: Coupon | null;
}
export function CouponFormDialog({ open, onOpenChange, coupon, }: CouponFormDialogProps) {
    const isEditing = !!coupon;
    const createCoupon = useCreateCoupon();
    const updateCoupon = useUpdateCoupon();
    const { data: categoriesData } = useCategories();
    const categories = categoriesData || [];
    const form = useForm<CouponFormValues>({
        resolver: zodResolver(couponFormSchema),
        defaultValues: {
            couponCode: "",
            discountType: "PERCENTAGE",
            discountValue: 10,
            maxDiscountAmount: null,
            minPurchaseAmount: null,
            validFrom: new Date().toISOString().slice(0, 16),
            validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 16),
            usageLimit: null,
            usageLimitPerUser: 1,
            categoryIds: [],
            isActive: true,
        },
    });
    useEffect(() => {
        if (coupon) {
            form.reset({
                couponCode: coupon.couponCode,
                discountType: coupon.discountType as DiscountType,
                discountValue: parseFloat(coupon.discountValue),
                maxDiscountAmount: coupon.maxDiscountAmount
                    ? parseFloat(coupon.maxDiscountAmount)
                    : null,
                minPurchaseAmount: coupon.minPurchaseAmount
                    ? parseFloat(coupon.minPurchaseAmount)
                    : null,
                validFrom: new Date(coupon.validFrom).toISOString().slice(0, 16),
                validTill: new Date(coupon.validTill).toISOString().slice(0, 16),
                usageLimit: coupon.usageLimit,
                usageLimitPerUser: coupon.usageLimitPerUser,
                categoryIds: coupon.categories.map((c) => c.categoryId),
                isActive: coupon.isActive,
            });
        }
        else {
            form.reset({
                couponCode: "",
                discountType: "PERCENTAGE",
                discountValue: 10,
                maxDiscountAmount: null,
                minPurchaseAmount: null,
                validFrom: new Date().toISOString().slice(0, 16),
                validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .slice(0, 16),
                usageLimit: null,
                usageLimitPerUser: 1,
                categoryIds: [],
                isActive: true,
            });
        }
    }, [coupon, form]);
    useEffect(() => {
        if (!open) form.reset();
    }, [open, form]);
    const onSubmit = async (values: CouponFormValues) => {
        const payload = {
            ...values,
            maxDiscountAmount: values.maxDiscountAmount || undefined,
            minPurchaseAmount: values.minPurchaseAmount || undefined,
            usageLimit: values.usageLimit || undefined,
            validFrom: new Date(values.validFrom).toISOString(),
            validTill: new Date(values.validTill).toISOString(),
        };
        try {
            if (isEditing && coupon) {
                await updateCoupon.mutateAsync({
                    couponId: coupon.couponId,
                    dto: payload,
                });
            }
            else {
                await createCoupon.mutateAsync(payload);
            }
            onOpenChange(false);
        }
        catch {
        }
    };
    const isPending = createCoupon.isPending || updateCoupon.isPending;
    return (<Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>
            {isEditing ? "Edit Coupon" : "Create New Coupon"}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="couponCode" render={({ field }) => (<FormItem>
                    <FormLabel>Coupon Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="SUMMER2024" className="uppercase"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>

              <FormField control={form.control} name="discountType" render={({ field }) => (<FormItem>
                    <FormLabel>Discount Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                        <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>)}/>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="discountValue" render={({ field }) => (<FormItem>
                    <FormLabel>
                      Discount Value{" "}
                      {form.watch("discountType") === "PERCENTAGE" ? "(%)" : "(₹)"}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>

              {form.watch("discountType") === "PERCENTAGE" && (<FormField control={form.control} name="maxDiscountAmount" render={({ field }) => (<FormItem>
                      <FormLabel>Max Discount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="Optional" value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>)}/>)}
            </div>

            <FormField control={form.control} name="minPurchaseAmount" render={({ field }) => (<FormItem>
                  <FormLabel>Minimum Purchase Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="Optional" value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="validFrom" render={({ field }) => (<FormItem>
                    <FormLabel>Valid From</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>

              <FormField control={form.control} name="validTill" render={({ field }) => (<FormItem>
                    <FormLabel>Valid Till</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="usageLimit" render={({ field }) => (<FormItem>
                    <FormLabel>Total Usage Limit</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="Unlimited" value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>

              <FormField control={form.control} name="usageLimitPerUser" render={({ field }) => (<FormItem>
                    <FormLabel>Usage Limit Per User</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>)}/>
            </div>

            <FormField control={form.control} name="categoryIds" render={({ field }) => (<FormItem>
                  <FormLabel>Applicable Categories (Optional)</FormLabel>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px]">
                    {categories.map((cat) => {
                const isSelected = field.value?.includes(cat.categoryId);
                return (<Button key={cat.categoryId} type="button" variant={isSelected ? "default" : "outline"} size="sm" onClick={() => {
                        const current = field.value || [];
                        if (isSelected) {
                            field.onChange(current.filter((id) => id !== cat.categoryId));
                        }
                        else {
                            field.onChange([...current, cat.categoryId]);
                        }
                    }}>
                          {cat.name}
                        </Button>);
            })}
                    {categories.length === 0 && (<span className="text-muted-foreground text-sm">
                        No categories available
                      </span>)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to apply to all courses
                  </p>
                  <FormMessage />
                </FormItem>)}/>

            <FormField control={form.control} name="isActive" render={({ field }) => (<FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Enable this coupon for use
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange}/>
                  </FormControl>
                </FormItem>)}/>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
            ? "Saving..."
            : isEditing
                ? "Update Coupon"
                : "Create Coupon"}
              </Button>
            </div>
          </form>
        </Form>
        </ScrollArea>
      </SheetContent>
    </Sheet>);
}
