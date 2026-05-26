"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useCreateBatchSubject,
  useUpdateBatchSubject,
} from "../hooks/use-batches";
import type { BatchSubject } from "../types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use #2563eb format")
    .optional()
    .or(z.literal("")),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

type Values = z.infer<typeof schema>;

const defaults: Values = { name: "", color: "", displayOrder: 0 };

export function SubjectFormDialog(props: {
  batchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: BatchSubject | null;
}) {
  const { batchId, open, onOpenChange, subject } = props;
  const isEditing = !!subject;
  const create = useCreateBatchSubject(batchId);
  const update = useUpdateBatchSubject(batchId);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (subject) {
      form.reset({
        name: subject.name,
        color: subject.color ?? "",
        displayOrder: subject.displayOrder,
      });
    } else {
      form.reset(defaults);
    }
  }, [subject, form]);

  useEffect(() => {
    if (!open) form.reset(defaults);
  }, [open, form]);

  const isPending = create.isPending || update.isPending;

  function onSubmit(values: Values) {
    const payload = {
      name: values.name.trim(),
      color: values.color?.trim() || undefined,
      displayOrder: values.displayOrder,
    };
    if (isEditing && subject) {
      update.mutate(
        { subjectId: subject.subjectId, dto: payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit subject" : "New subject"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Physics" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color (hex)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="#2563eb" />
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
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isEditing ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
