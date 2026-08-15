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
import { IconPicker } from "./icon-picker";
import { toast } from "sonner";
import type { FieldPath } from "react-hook-form";
import { useCreateWhyChooseUs, useUpdateWhyChooseUs } from "../hooks/use-cms";
import type { WhyChooseUs } from "../types";
import { getApiError } from "@/lib/api/errors";

const schema = z.object({
  iconName: z.string().min(1, "Pick an icon"),
  iconColor: z.string().optional(),
  iconBg: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  displayOrder: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

type Values = z.infer<typeof schema>;

const defaults: Values = {
  iconName: "Award",
  iconColor: "",
  iconBg: "",
  title: "",
  description: "",
  displayOrder: 0,
  isActive: true,
};

function itemToValues(item: WhyChooseUs): Values {
  return {
    iconName: item.iconName || "Award",
    iconColor: item.iconColor ?? "",
    iconBg: item.iconBg ?? "",
    title: item.title,
    description: item.description ?? "",
    displayOrder: item.displayOrder ?? 0,
    isActive: item.isActive,
  };
}

export function WhyChooseFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: WhyChooseUs | null;
}) {
  const isEditing = !!item;
  const create = useCreateWhyChooseUs();
  const update = useUpdateWhyChooseUs();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    form.reset(item ? itemToValues(item) : defaults);
  }, [item, form]);

  useEffect(() => {
    if (!open) form.reset(defaults);
  }, [open, form]);

  const isPending = create.isPending || update.isPending;
  const onSubmit = async (values: Values) => {
    try {
      const payload = {
        iconName: values.iconName,
        iconColor: values.iconColor?.trim() || undefined,
        iconBg: values.iconBg?.trim() || undefined,
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        displayOrder: values.displayOrder,
        isActive: values.isActive,
      };
      if (isEditing && item) {
        await update.mutateAsync({ id: item.id, dto: payload });
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
          <SheetTitle>{isEditing ? "Edit Why Choose Us" : "Add Why Choose Us"}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="iconName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <FormControl>
                      <IconPicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iconColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon Color (optional)</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="color"
                          className="w-10 h-10 p-1 cursor-pointer"
                          value={field.value || "#3b82f6"}
                          onChange={field.onChange}
                        />
                        <Input {...field} placeholder="#3b82f6" className="flex-1" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iconBg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon Background (optional)</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="color"
                          className="w-10 h-10 p-1 cursor-pointer"
                          value={field.value || "#3b82f615"}
                          onChange={field.onChange}
                        />
                        <Input {...field} placeholder="#3b82f615" className="flex-1" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
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
