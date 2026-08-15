"use client";

import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { FieldPath } from "react-hook-form";
import { useCreateTestimonial, useUpdateTestimonial } from "../hooks/use-cms";
import type { Testimonial } from "../types";
import { getApiError } from "@/lib/api/errors";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().optional(),
  company: z.string().optional(),
  rating: z.coerce.number().min(1).max(5).default(5),
  text: z.string().min(1, "Testimonial text is required"),
  course: z.string().optional(),
  avatarUrl: z.string().optional(),
  displayOrder: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

type Values = z.infer<typeof schema>;

const defaults: Values = {
  name: "",
  role: "",
  company: "",
  rating: 5,
  text: "",
  course: "",
  avatarUrl: "",
  displayOrder: 0,
  isActive: true,
};

function testimonialToValues(t: Testimonial): Values {
  return {
    name: t.name,
    role: t.role ?? "",
    company: t.company ?? "",
    rating: t.rating ?? 5,
    text: t.text,
    course: t.course ?? "",
    avatarUrl: t.avatarUrl ?? "",
    displayOrder: t.displayOrder ?? 0,
    isActive: t.isActive,
  };
}

export function TestimonialFormDialog(props: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  testimonial?: Testimonial | null;
}) {
  const { open, onOpenChange, testimonial } = props;
  const isEditing = !!testimonial;
  const create = useCreateTestimonial();
  const update = useUpdateTestimonial();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    form.reset(testimonial ? testimonialToValues(testimonial) : defaults);
  }, [testimonial, form]);

  useEffect(() => {
    if (!open) form.reset(defaults);
  }, [open, form]);

  const isPending = create.isPending || update.isPending;
  const onSubmit = async (values: Values) => {
    try {
      const payload = {
        name: values.name.trim(),
        role: values.role?.trim() || undefined,
        company: values.company?.trim() || undefined,
        rating: values.rating,
        text: values.text.trim(),
        course: values.course?.trim() || undefined,
        avatarUrl: values.avatarUrl?.trim() || undefined,
        displayOrder: values.displayOrder,
        isActive: values.isActive,
      };
      if (isEditing && testimonial) {
        await update.mutateAsync({ id: testimonial.testimonialId, dto: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      const apiError = getApiError(err);
      for (const [field, message] of Object.entries(apiError.fieldErrors)) {
        form.setError(field as FieldPath<Values>, { type: "server", message });
      }
      if (Object.keys(apiError.fieldErrors).length === 0) {
        toast.error(apiError.message);
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{isEditing ? "Edit Testimonial" : "Add Testimonial"}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input {...field} placeholder="Student name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="rating" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating (1-5)</FormLabel>
                    <FormControl><Input type="number" min={1} max={5} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role (optional)</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Software Engineer" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="company" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company (optional)</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Google" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="text" render={({ field }) => (
                <FormItem>
                  <FormLabel>Testimonial Text</FormLabel>
                  <FormControl><Textarea {...field} rows={4} placeholder="What the student said..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="course" render={({ field }) => (
                <FormItem>
                  <FormLabel>Course (optional)</FormLabel>
                  <FormControl><Input {...field} placeholder="Course name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="avatarUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar URL (optional)</FormLabel>
                  <FormControl><Input {...field} placeholder="https://..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="displayOrder" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 pt-6">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : isEditing ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
